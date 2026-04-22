import "./viewer.css";
import { HostBridge } from "./hostBridge.js";
import { samplePreview } from "./sampleData.js";
import { cellsToTsv } from "./tsv.js";
import type { PreviewCell, WorkbookPreview } from "./types.js";
import { APP_VERSION } from "./version.js";

type Selection = {
  startRow: number;
  startColumn: number;
  endRow: number;
  endColumn: number;
};

let preview: WorkbookPreview = samplePreview;
let selection: Selection | null = null;
let isDragging = false;
let searchTerm = "";
let hostApp: HostBridge | null = null;
let hostConnected = false;
let pendingToolArgs: Record<string, unknown> | null = null;
let loadingMessage = "";
let errorMessage = "";

const rootElement = document.querySelector<HTMLDivElement>("#app");
if (!rootElement) throw new Error("missing #app");
const root: HTMLDivElement = rootElement;

window.addEventListener("pointerup", stopDragging);
window.addEventListener("pointercancel", stopDragging);

void connectHost();
render();

async function connectHost() {
  if (window.parent === window) return;
  try {
    hostApp = new HostBridge({ name: "Spreadsheet Peek Viewer", version: APP_VERSION });
    hostApp.ontoolinputpartial = (params) => {
      if (params.arguments) {
        pendingToolArgs = params.arguments;
        loadingMessage = loadingLabel(params.arguments);
        errorMessage = "";
        render();
      }
    };
    hostApp.ontoolinput = (params) => {
      if (params.arguments) {
        pendingToolArgs = params.arguments;
        loadingMessage = loadingLabel(params.arguments);
        errorMessage = "";
        render();
        if (hostConnected) {
          void refreshPreview(params.arguments);
        }
      }
    };
    hostApp.ontoolresult = (params) => {
      const structured = params.structuredContent;
      if (isPreview(structured)) {
        preview = structured;
        selection = null;
        loadingMessage = "";
        errorMessage = "";
        render();
      } else if (params.isError) {
        loadingMessage = "";
        errorMessage = "The workbook preview failed to load.";
        render();
      }
    };
    hostApp.ontoolcancelled = () => {
      loadingMessage = "";
      errorMessage = "The workbook preview was cancelled.";
      render();
    };
    await hostApp.connect();
    hostConnected = true;
    render();
    if (pendingToolArgs && !previewMatchesArgs(preview, pendingToolArgs)) {
      void refreshPreview(pendingToolArgs);
    }
  } catch {
    hostApp = null;
    hostConnected = false;
    loadingMessage = "";
    errorMessage = "";
    render();
  }
}

async function refreshPreview(args: Record<string, unknown>) {
  if (!hostApp) return;
  loadingMessage = loadingLabel(args);
  errorMessage = "";
  render();
  try {
    const result = await hostApp.callServerTool({
      name: "preview_workbook",
      arguments: {
        path: preview.filePath,
        maxRows: preview.rowLimit,
        maxColumns: preview.columnLimit,
        ...args,
      },
    });
    if (result.isError) {
      loadingMessage = "";
      errorMessage = firstTextContent(result.content) ?? "Unable to load sheet.";
      render();
      return;
    }
    if (isPreview(result.structuredContent)) {
      preview = result.structuredContent;
      selection = null;
      loadingMessage = "";
      errorMessage = "";
      render();
    }
  } catch (error) {
    loadingMessage = "";
    errorMessage = error instanceof Error ? error.message : String(error);
    render();
  }
}

function render(focusSearch = false, searchCursor?: number) {
  const matches = countMatches(preview, searchTerm);
  const hostStateLabel = hostConnected ? "Connected to MCP host" : "Local preview mode";
  const statusDetail =
    errorMessage || (loadingMessage ? `Loading ${loadingMessage}` : matches ? `${matches} search matches` : hostStateLabel);
  const selectedLabel = selectionLabel();
  const summarizeLabel = selection ? `Summarize ${selectedLabel}` : "Summarize selected range";
  root.innerHTML = `
    <main class="shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="mark">SP</div>
          <div>
            <p class="eyebrow">Spreadsheet Peek</p>
            <h1>${escapeHtml(preview.fileName)}</h1>
          </div>
        </div>
        <nav class="sheet-list" aria-label="Sheets">
          ${preview.sheets
            .map(
              (sheet) => `
                <button class="sheet-tab ${sheet.name === preview.activeSheet ? "active" : ""}" data-sheet="${escapeAttr(sheet.name)}">
                  <span>${escapeHtml(sheet.name)}</span>
                  <small>${sheet.rows} x ${sheet.columns}</small>
                </button>
              `,
            )
            .join("")}
        </nav>
        <div class="meta-grid">
          <div class="meta-block">
            <span>Range</span>
            <strong>${escapeHtml(preview.range)}</strong>
          </div>
          <div class="meta-block">
            <span>Rows</span>
            <strong>${preview.totalRows}</strong>
          </div>
          <div class="meta-block source">
            <span>Source</span>
            <strong title="${escapeAttr(preview.filePath)}">${escapeHtml(preview.filePath)}</strong>
          </div>
        </div>
      </aside>

      <section class="workspace">
        <header class="toolbar">
          <div>
            <p class="eyebrow">Live preview</p>
            <h2>${escapeHtml(preview.activeSheet)}</h2>
          </div>
          <div class="tools">
            <label class="search">
              <span>Search</span>
              <input id="search" type="search" value="${escapeAttr(searchTerm)}" placeholder="Account, 2024, total" />
            </label>
            <button
              id="summarize"
              class="action"
              aria-label="${escapeAttr(summarizeLabel)}"
              title="${escapeAttr(summarizeLabel)}"
              ${selection ? "" : "disabled"}
            >
              <span class="full-label">Summarize range</span>
              <span class="short-label">Summarize</span>
            </button>
          </div>
        </header>

        <div class="status-row ${errorMessage ? "error" : loadingMessage ? "loading" : ""}">
          <span>${escapeHtml(preview.summary)}</span>
          <span>${escapeHtml(statusDetail)}</span>
        </div>

        <div class="grid-wrap" role="region" aria-label="Spreadsheet grid" tabindex="0" aria-busy="${loadingMessage ? "true" : "false"}">
          ${loadingMessage ? `<div class="overlay state">Loading ${escapeHtml(loadingMessage)}</div>` : ""}
          ${errorMessage ? `<div class="overlay state error-state">${escapeHtml(errorMessage)}</div>` : ""}
          <table class="grid">
            <thead>
              <tr>
                <th class="corner"></th>
                ${columnLabels().map((label) => `<th>${escapeHtml(label)}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${preview.rows
                .map(
                  (row) => `
                    <tr>
                      <th class="row-label">${row[0]?.row ?? ""}</th>
                      ${row.map(renderCell).join("")}
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <footer class="footer ${selection ? "has-selection" : ""}">
          <code>${escapeHtml(preview.commands.textPreview)}</code>
          <span id="status" class="${selection ? "selected-range" : ""}">${selectedLabel}</span>
        </footer>
      </section>
    </main>
  `;

  bindEvents();
  if (focusSearch) {
    const search = root.querySelector<HTMLInputElement>("#search");
    search?.focus();
    const cursor = searchCursor ?? search?.value.length ?? 0;
    search?.setSelectionRange(cursor, cursor);
  }
}

function renderCell(cell: PreviewCell) {
  const selected = isSelected(cell);
  const found = searchTerm && cell.display.toLowerCase().includes(searchTerm.toLowerCase());
  return `
    <td
      class="${cell.isHeader ? "header-cell" : ""} ${cell.type === "number" ? "number" : ""} ${selected ? "selected" : ""} ${found ? "found" : ""}"
      data-row="${cell.row}"
      data-column="${cell.column}"
      title="${escapeAttr(`${cell.address}: ${cell.display}`)}"
    >${escapeHtml(cell.display)}</td>
  `;
}

function bindEvents() {
  root.querySelectorAll<HTMLButtonElement>(".sheet-tab").forEach((button) => {
    button.addEventListener("click", () => {
      const sheet = button.dataset.sheet;
      if (sheet && sheet !== preview.activeSheet) {
        void refreshPreview({ sheet });
      }
    });
  });
  root.querySelector<HTMLInputElement>("#search")?.addEventListener("input", (event) => {
    const input = event.target as HTMLInputElement;
    const cursor = input.selectionStart ?? input.value.length;
    searchTerm = input.value;
    render(true, cursor);
  });
  root.querySelector<HTMLButtonElement>("#summarize")?.addEventListener("click", () => {
    void summarizeSelectedRange();
  });
  root.querySelectorAll<HTMLTableCellElement>("td[data-row][data-column]").forEach((cell) => {
    cell.addEventListener("pointerdown", () => {
      const coords = cellCoords(cell);
      selection = {
        startRow: coords.row,
        startColumn: coords.column,
        endRow: coords.row,
        endColumn: coords.column,
      };
      isDragging = true;
      render();
    });
    cell.addEventListener("pointerenter", () => {
      if (!isDragging || !selection) return;
      const coords = cellCoords(cell);
      selection.endRow = coords.row;
      selection.endColumn = coords.column;
      render();
    });
  });
}

function stopDragging() {
  isDragging = false;
}

async function summarizeSelectedRange() {
  if (!selection) return;
  const tsv = cellsToTsv(selectedCells());
  const label = selectionLabel();
  const prompt = `Summarize the selected spreadsheet range ${label} from ${preview.fileName} / ${preview.activeSheet}.`;
  if (!hostApp || !hostConnected) {
    await navigator.clipboard?.writeText(tsv).catch(() => undefined);
    setStatus("Range copied locally. In Claude Desktop this sends the range to the model.");
    return;
  }
  await hostApp.updateModelContext({
    content: [
      {
        type: "text",
        text: `${preview.fileName} / ${preview.activeSheet} / ${label}\n\n${tsv}`,
      },
    ],
  });
  await hostApp.sendMessage({
    role: "user",
    content: [{ type: "text", text: prompt }],
  });
  setStatus("Selected range sent to the model.");
}

function selectedCells() {
  if (!selection) return [];
  const minRow = Math.min(selection.startRow, selection.endRow);
  const maxRow = Math.max(selection.startRow, selection.endRow);
  const minCol = Math.min(selection.startColumn, selection.endColumn);
  const maxCol = Math.max(selection.startColumn, selection.endColumn);
  return preview.rows
    .map((row) => row.filter((cell) => cell.row >= minRow && cell.row <= maxRow && cell.column >= minCol && cell.column <= maxCol))
    .filter((row) => row.length > 0);
}

function selectionLabel() {
  if (!selection) return "Select cells to summarize a range";
  const minRow = Math.min(selection.startRow, selection.endRow);
  const maxRow = Math.max(selection.startRow, selection.endRow);
  const minCol = Math.min(selection.startColumn, selection.endColumn);
  const maxCol = Math.max(selection.startColumn, selection.endColumn);
  return `${columnName(minCol)}${minRow}:${columnName(maxCol)}${maxRow}`;
}

function isSelected(cell: PreviewCell) {
  if (!selection) return false;
  const minRow = Math.min(selection.startRow, selection.endRow);
  const maxRow = Math.max(selection.startRow, selection.endRow);
  const minCol = Math.min(selection.startColumn, selection.endColumn);
  const maxCol = Math.max(selection.startColumn, selection.endColumn);
  return cell.row >= minRow && cell.row <= maxRow && cell.column >= minCol && cell.column <= maxCol;
}

function cellCoords(cell: HTMLElement) {
  return {
    row: Number(cell.dataset.row),
    column: Number(cell.dataset.column),
  };
}

function columnLabels() {
  const first = preview.rows[0] ?? [];
  return first.map((cell) => columnName(cell.column));
}

function columnName(index: number) {
  let name = "";
  let n = index;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name || "A";
}

function countMatches(data: WorkbookPreview, term: string) {
  if (!term) return 0;
  const normalized = term.toLowerCase();
  return data.rows.flat().filter((cell) => cell.display.toLowerCase().includes(normalized)).length;
}

function setStatus(message: string) {
  const status = root.querySelector("#status");
  if (status) status.textContent = message;
}

function previewMatchesArgs(data: WorkbookPreview, args: Record<string, unknown>) {
  const requestedPath = normalizeText(args.path);
  const requestedSheet = normalizeComparableText(args.sheet);
  const requestedRange = normalizeComparableText(args.range);
  const requestedMaxRows = normalizeNumber(args.maxRows);
  const requestedMaxColumns = normalizeNumber(args.maxColumns);
  const activeSheet = normalizeComparableText(data.activeSheet);
  const activeRange = normalizeComparableText(data.range);
  return (
    (!requestedPath || requestedPath === data.filePath) &&
    (!requestedSheet || requestedSheet === activeSheet) &&
    (!requestedRange || requestedRange === activeRange) &&
    (requestedMaxRows === undefined || requestedMaxRows === data.rowLimit) &&
    (requestedMaxColumns === undefined || requestedMaxColumns === data.columnLimit)
  );
}

function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeComparableText(value: unknown) {
  return normalizeText(value)?.toLowerCase();
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function loadingLabel(args: Record<string, unknown>) {
  const sheet = typeof args.sheet === "string" && args.sheet.trim() ? args.sheet.trim() : undefined;
  const path = typeof args.path === "string" && args.path.trim() ? args.path.trim() : preview.filePath;
  const filename = path.split(/[\\/]/).at(-1) ?? path;
  return sheet ? `${filename} / ${sheet}` : filename;
}

function isPreview(value: unknown): value is WorkbookPreview {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as WorkbookPreview).kind === "spreadsheet-peek-preview" &&
      Array.isArray((value as WorkbookPreview).rows),
  );
}

function firstTextContent(content: Array<{ type: string; text?: string }> | undefined) {
  return content?.find((item) => item.type === "text" && typeof item.text === "string")?.text;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value: string) {
  return escapeHtml(value);
}
