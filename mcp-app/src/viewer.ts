import { App } from "@modelcontextprotocol/ext-apps";

import "./viewer.css";
import { samplePreview } from "./sampleData.js";
import type { PreviewCell, WorkbookPreview } from "./types.js";

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
let hostApp: App | null = null;
let hostConnected = false;

const rootElement = document.querySelector<HTMLDivElement>("#app");
if (!rootElement) throw new Error("missing #app");
const root: HTMLDivElement = rootElement;

void connectHost();
render();

async function connectHost() {
  if (window.parent === window) return;
  try {
    hostApp = new App({ name: "Spreadsheet Peek Viewer", version: "2.2.0" }, {});
    hostApp.ontoolinput = (params) => {
      if (params.arguments && hostConnected) {
        void refreshPreview(params.arguments);
      }
    };
    hostApp.ontoolresult = (params) => {
      const structured = params.structuredContent;
      if (isPreview(structured)) {
        preview = structured;
        selection = null;
        render();
      }
    };
    await Promise.race([
      hostApp.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("host connection timed out")), 1500)),
    ]);
    hostConnected = true;
    render();
  } catch {
    hostApp = null;
    hostConnected = false;
    render();
  }
}

async function refreshPreview(args: Record<string, unknown>) {
  if (!hostApp) return;
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
    setStatus("Unable to load sheet. The model can inspect the tool error.");
    return;
  }
  if (isPreview(result.structuredContent)) {
    preview = result.structuredContent;
    selection = null;
    render();
  }
}

function render(focusSearch = false, searchCursor?: number) {
  const matches = countMatches(preview, searchTerm);
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
        <div class="meta-block">
          <span>Range</span>
          <strong>${escapeHtml(preview.range)}</strong>
        </div>
        <div class="meta-block">
          <span>Source</span>
          <strong title="${escapeAttr(preview.filePath)}">${escapeHtml(preview.filePath)}</strong>
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
            <button id="summarize" class="action" ${selection ? "" : "disabled"}>Summarize range</button>
          </div>
        </header>

        <div class="status-row">
          <span>${escapeHtml(preview.summary)}</span>
          <span>${matches ? `${matches} search matches` : hostConnected ? "Connected to MCP host" : "Local preview mode"}</span>
        </div>

        <div class="grid-wrap" role="region" aria-label="Spreadsheet grid" tabindex="0">
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

        <footer class="footer">
          <code>${escapeHtml(preview.commands.textPreview)}</code>
          <span id="status">${selectionLabel()}</span>
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
  window.addEventListener("pointerup", () => {
    isDragging = false;
  }, { once: true });
}

async function summarizeSelectedRange() {
  if (!selection) return;
  const tsv = selectedCells()
    .map((row) => row.map((cell) => cell.display).join("\t"))
    .join("\n");
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

function isPreview(value: unknown): value is WorkbookPreview {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as WorkbookPreview).kind === "spreadsheet-peek-preview" &&
      Array.isArray((value as WorkbookPreview).rows),
  );
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
