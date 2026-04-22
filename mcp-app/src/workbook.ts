import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, extname, join, resolve } from "node:path";
import { promisify } from "node:util";

import type {
  CellValue,
  PreviewCell,
  PreviewOptions,
  WolfxlMapJson,
  WolfxlPeekJson,
  WorkbookPreview,
  WorkbookSheetSummary,
} from "./types.js";
import { cellsToTsv } from "./tsv.js";

const execFileAsync = promisify(execFile);
const DEFAULT_MAX_ROWS = 50;
const DEFAULT_MAX_COLUMNS = 40;
const MAX_PREVIEW_ROWS = 500;
const MAX_PREVIEW_COLUMNS = 120;
const ALLOWED_EXTENSIONS = new Set([
  ".xlsx",
  ".xlsm",
  ".xls",
  ".xlsb",
  ".ods",
  ".csv",
  ".tsv",
  ".txt",
]);

export async function loadWorkbookPreview(options: PreviewOptions): Promise<WorkbookPreview> {
  const filePath = await resolveWorkbookPath(options.path);
  const wolfxlBin = options.wolfxlBin ?? (await resolveWolfxlBinary());
  const workbookMap = await readWorkbookMap(wolfxlBin, filePath);
  const activeSheet = selectSheet(workbookMap, options.sheet);
  const peek = await readSheetJson(wolfxlBin, filePath, activeSheet.name);
  return buildPreview(filePath, workbookMap, peek, options);
}

export async function resolveWolfxlBinary(): Promise<string> {
  const configured = process.env.SPREADSHEET_PEEK_WOLFXL_BIN ?? process.env.WOLFXL_BIN;
  if (configured?.trim()) {
    return configured.trim();
  }

  const executableNames = process.platform === "win32" ? ["wolfxl.exe", "wolfxl"] : ["wolfxl"];
  const candidates = new Set<string>();
  const home = homedir();

  if (home) {
    for (const name of executableNames) {
      candidates.add(join(home, ".cargo", "bin", name));
    }
  }

  if (process.platform === "darwin") {
    for (const name of executableNames) {
      candidates.add(join("/opt/homebrew/bin", name));
      candidates.add(join("/usr/local/bin", name));
    }
  } else if (process.platform !== "win32") {
    for (const name of executableNames) {
      candidates.add(join("/usr/local/bin", name));
      candidates.add(join("/usr/bin", name));
    }
  }

  for (const candidate of candidates) {
    if (await canExecute(candidate)) {
      return candidate;
    }
  }

  return executableNames[0];
}

export async function resolveWorkbookPath(inputPath: string): Promise<string> {
  if (!inputPath || !inputPath.trim()) {
    throw new Error("path is required");
  }
  const resolved = resolve(inputPath);
  const ext = extname(resolved).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(
      `unsupported file extension ${ext || "(none)"}; expected ${Array.from(ALLOWED_EXTENSIONS).join(", ")}`,
    );
  }
  await access(resolved);
  const stats = await stat(resolved);
  if (!stats.isFile()) {
    throw new Error(`path is not a file: ${resolved}`);
  }
  return realpath(resolved);
}

export async function readWorkbookMap(
  wolfxlBin: string,
  filePath: string,
): Promise<WolfxlMapJson> {
  const stdout = await runWolfxl(wolfxlBin, ["map", filePath, "--format", "json"]);
  return parseJson<WolfxlMapJson>(stdout, "wolfxl map");
}

export async function readSheetJson(
  wolfxlBin: string,
  filePath: string,
  sheetName: string,
): Promise<WolfxlPeekJson> {
  const stdout = await runWolfxl(wolfxlBin, [
    "peek",
    filePath,
    "--sheet",
    sheetName,
    "--export",
    "json",
  ]);
  return parseJson<WolfxlPeekJson>(stdout, "wolfxl peek --export json");
}

export function buildPreview(
  filePath: string,
  workbookMap: WolfxlMapJson,
  peek: WolfxlPeekJson,
  options: Pick<PreviewOptions, "range" | "maxRows" | "maxColumns">,
): WorkbookPreview {
  const maxRows = clampInteger(options.maxRows, DEFAULT_MAX_ROWS, 1, MAX_PREVIEW_ROWS);
  const maxColumns = clampInteger(
    options.maxColumns,
    DEFAULT_MAX_COLUMNS,
    1,
    MAX_PREVIEW_COLUMNS,
  );
  const fullGrid = [peek.headers, ...peek.data];
  const bounds = parseRange(options.range, fullGrid.length, peek.columns);
  const boundedRows = fullGrid.slice(bounds.rowStart, bounds.rowEnd + 1);
  const limitedRows = boundedRows.slice(0, maxRows + (bounds.rowStart === 0 ? 1 : 0));
  const rows = limitedRows.map((row, rowIdx) => {
    const absoluteRow = bounds.rowStart + rowIdx + 1;
    const boundedCells = row.slice(bounds.colStart, bounds.colEnd + 1).slice(0, maxColumns);
    return boundedCells.map((value, colIdx) =>
      makeCell(value ?? null, absoluteRow, bounds.colStart + colIdx + 1, absoluteRow === 1),
    );
  });
  const shownDataRows = Math.max(0, rows.length - (bounds.rowStart === 0 ? 1 : 0));
  const shownColumns = rows[0]?.length ?? 0;
  const range = formatRange(
    bounds.rowStart + 1,
    bounds.colStart + 1,
    bounds.rowStart + rows.length,
    bounds.colStart + shownColumns,
  );
  const sheets: WorkbookSheetSummary[] = workbookMap.sheets.map((sheet) => ({
    name: sheet.name,
    rows: sheet.rows,
    columns: sheet.cols,
    class: sheet.class,
    headers: sheet.headers ?? [],
  }));
  const truncatedRows = boundedRows.length > limitedRows.length;
  const truncatedColumns = bounds.colEnd - bounds.colStart + 1 > shownColumns;
  const fileName = basename(filePath);
  const summary = [
    fileName,
    peek.sheet,
    `showing ${shownDataRows} of ${peek.rows} data rows`,
    `${shownColumns} of ${peek.columns} columns`,
  ].join(" - ");

  return {
    kind: "spreadsheet-peek-preview",
    version: "1.0",
    filePath,
    fileName,
    activeSheet: peek.sheet,
    sheets,
    totalRows: peek.rows,
    totalColumns: peek.columns,
    range,
    rowOffset: bounds.rowStart + 1,
    columnOffset: bounds.colStart + 1,
    rowLimit: maxRows,
    columnLimit: maxColumns,
    truncatedRows,
    truncatedColumns,
    rows,
    summary,
    commands: {
      terminalPreview: `wolfxl peek ${commandQuote(filePath)} --sheet ${commandQuote(peek.sheet)} -n 15`,
      textPreview: `wolfxl peek ${commandQuote(filePath)} --sheet ${commandQuote(peek.sheet)} --export text | ${lineLimitCommand()}`,
    },
  };
}

export function selectionToTsv(preview: WorkbookPreview): string {
  return cellsToTsv(preview.rows);
}

async function runWolfxl(binary: string, args: string[]): Promise<string> {
  try {
    const result = await execFileAsync(binary, args, {
      timeout: 20_000,
      maxBuffer: 25 * 1024 * 1024,
    });
    return result.stdout;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`failed to run ${formatCommand(binary, args)}: ${error.message}`);
    }
    throw error;
  }
}

async function canExecute(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function parseJson<T>(stdout: string, context: string): T {
  try {
    return JSON.parse(stdout) as T;
  } catch (error) {
    throw new Error(`${context} returned invalid JSON: ${String(error)}`);
  }
}

function selectSheet(workbookMap: WolfxlMapJson, requested?: string) {
  if (!workbookMap.sheets.length) {
    throw new Error("workbook has no sheets");
  }
  if (!requested) {
    return workbookMap.sheets[0];
  }
  const found = workbookMap.sheets.find(
    (sheet) => sheet.name.toLowerCase() === requested.toLowerCase(),
  );
  if (!found) {
    throw new Error(
      `sheet ${JSON.stringify(requested)} not found; available sheets: ${workbookMap.sheets
        .map((sheet) => sheet.name)
        .join(", ")}`,
    );
  }
  return found;
}

function makeCell(value: CellValue, row: number, column: number, isHeader: boolean): PreviewCell {
  return {
    row,
    column,
    address: `${columnName(column)}${row}`,
    value,
    display: displayValue(value),
    type: valueType(value),
    isHeader,
  };
}

function displayValue(value: CellValue): string {
  if (value === null) return "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value);
}

function valueType(value: CellValue): PreviewCell["type"] {
  if (value === null) return "empty";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
}

function parseRange(
  input: string | undefined,
  rowCount: number,
  columnCount: number,
): { rowStart: number; rowEnd: number; colStart: number; colEnd: number } {
  if (!input) {
    return {
      rowStart: 0,
      rowEnd: Math.max(0, rowCount - 1),
      colStart: 0,
      colEnd: Math.max(0, columnCount - 1),
    };
  }
  const match = input.trim().match(/^([A-Za-z]+)(\d+)(?::([A-Za-z]+)(\d+))?$/);
  if (!match) {
    throw new Error(`range must look like A1:D20, got ${JSON.stringify(input)}`);
  }
  const startCol = columnIndex(match[1]) - 1;
  const startRow = Number(match[2]) - 1;
  const endCol = match[3] ? columnIndex(match[3]) - 1 : startCol;
  const endRow = match[4] ? Number(match[4]) - 1 : startRow;
  return {
    rowStart: clamp(Math.min(startRow, endRow), 0, Math.max(0, rowCount - 1)),
    rowEnd: clamp(Math.max(startRow, endRow), 0, Math.max(0, rowCount - 1)),
    colStart: clamp(Math.min(startCol, endCol), 0, Math.max(0, columnCount - 1)),
    colEnd: clamp(Math.max(startCol, endCol), 0, Math.max(0, columnCount - 1)),
  };
}

function formatRange(startRow: number, startCol: number, endRow: number, endCol: number): string {
  if (startRow <= 0 || startCol <= 0 || endRow <= 0 || endCol <= 0) {
    return "A1:A1";
  }
  return `${columnName(startCol)}${startRow}:${columnName(endCol)}${endRow}`;
}

function columnIndex(name: string): number {
  return [...name.toUpperCase()].reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0);
}

function columnName(index: number): string {
  let name = "";
  let n = index;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name || "A";
}

function clampInteger(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!Number.isFinite(value)) return fallback;
  return clamp(Math.trunc(value as number), min, max);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatCommand(binary: string, args: string[]): string {
  return [binary, ...args].map(commandQuote).join(" ");
}

function commandQuote(value: string): string {
  if (process.platform === "win32") {
    return powerShellQuote(value);
  }
  return posixShellQuote(value);
}

function lineLimitCommand(): string {
  return process.platform === "win32" ? "Select-Object -First 20" : "sed -n '1,20p'";
}

function posixShellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function powerShellQuote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}
