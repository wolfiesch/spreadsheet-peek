import assert from "node:assert/strict";
import test from "node:test";

import { chromium } from "playwright";
import type { Browser, FrameLocator, Locator, Page } from "playwright";
import { createServer } from "vite";

import type { CellValue, PreviewCell, WorkbookPreview, WorkbookSheetSummary } from "../src/types.js";

test("viewer renders workbook chrome, search, and range selection", async () => {
  await withViewerServer(async (url, browser) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(url);

    await page.locator(".grid td").first().waitFor();
    assert.equal(await page.locator(".sheet-tab").count(), 3);
    await assertText(page.locator("h1"), /sample-financials\.xlsx/);

    await page.locator("#search").fill("gross");
    await assertText(page.locator(".status-row"), /search matches/);
    assert.ok((await page.locator(".grid td.found").count()) > 0, "search should visually mark matching cells");

    await page.locator('td[data-row="3"][data-column="2"]').click();
    await assertText(page.locator("#status"), /B3:B3/);
    assert.equal(await page.locator(".grid td.selected").count(), 1);
    assert.equal(await page.locator("#summarize").isEnabled(), true);
    assert.match((await page.locator("#summarize").getAttribute("aria-label")) ?? "", /B3:B3/);

    await page.setViewportSize({ width: 640, height: 680 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
      "viewer chrome should fit narrow Claude embeds without document-level horizontal overflow",
    );
    assert.equal(
      await page.evaluate(() => {
        const grid = document.querySelector(".grid-wrap");
        return grid ? grid.scrollWidth > grid.clientWidth : false;
      }),
      true,
      "wide spreadsheet columns should scroll inside the grid region",
    );

    await page.setViewportSize({ width: 640, height: 140 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollHeight >= 600),
      true,
      "viewer should report a useful content height even when the host iframe starts collapsed",
    );
    await page.close();

    const { hostPage } = await createHostPage(browser, url);
    try {
      await hostPage.waitForFunction(() => {
        const iframe = document.querySelector<HTMLIFrameElement>("#viewer");
        return iframe ? iframe.getBoundingClientRect().height >= 600 : false;
      });
      assert.equal(
        await hostPage.locator("#viewer").evaluate((iframe) => Math.round(iframe.getBoundingClientRect().height)),
        620,
        "viewer should ask an MCP Apps host to expand from a collapsed initial iframe",
      );
    } finally {
      await hostPage.close();
    }
  });
});

test("viewer hydrates requested workbook from host tool input and result", async () => {
  await withViewerServer(async (url, browser) => {
    const balancePreview = makeWorkbookPreview({
      fileName: "sample-financials.xlsx",
      activeSheet: "Balance Sheet",
      totalRows: 27,
      totalColumns: 5,
      rowLimit: 2,
      columnLimit: 5,
      truncatedRows: true,
      sheets: sampleFinancialSheets(),
      values: [
        ["Account", "2024-03-31", "2023-12-31", "Change $", "Change %"],
        ["Cash", 1250000, 940000, 310000, "33.0%"],
        ["Accounts Receivable", 780000, 700000, 80000, "11.4%"],
      ],
    });
    const { hostPage, frame } = await createHostPage(browser, url);

    try {
      await sendToolInput(
        hostPage,
        {
          path: balancePreview.filePath,
          sheet: "Balance Sheet",
          maxRows: 2,
          maxColumns: 5,
        },
        balancePreview,
      );

      await assertText(frame.locator("h2"), /Balance Sheet/);
      await assertText(frame.locator(".sheet-tab.active"), /Balance Sheet/);
      await assertText(frame.locator("h1"), /sample-financials\.xlsx/);

      const call = await lastToolCall(hostPage);
      assert.equal(call.name, "preview_workbook");
      assert.equal(call.arguments.path, balancePreview.filePath);
      assert.equal(call.arguments.sheet, "Balance Sheet");
      assert.equal(call.arguments.maxRows, 2);
      assert.equal(call.arguments.maxColumns, 5);
    } finally {
      await hostPage.close();
    }
  });
});

test("viewer renders representative wide, tall, and messy host result shapes", async () => {
  await withViewerServer(async (url, browser) => {
    const { hostPage, frame } = await createHostPage(browser, url);
    const fixtures = [
      makeWorkbookPreview({
        fileName: "wide-table.xlsx",
        activeSheet: "Ops Dashboard",
        totalRows: 18,
        totalColumns: 29,
        rowLimit: 4,
        columnLimit: 16,
        truncatedColumns: true,
        values: [
          ["Metric", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Q1", "Q2", "FY"],
          ["Revenue", 120000, 121500, 128000, 133000, 140000, 143000, 145000, 149000, 151000, 155000, 160000, 166000, 369500, 416000, 1716500],
          ["Gross Margin", "54.1%", "54.4%", "55.0%", "55.2%", "55.6%", "55.8%", "56.1%", "56.4%", "56.7%", "56.9%", "57.0%", "57.2%", "54.5%", "55.5%", "56.0%"],
          ["Headcount", 45, 47, 49, 51, 53, 54, 55, 56, 58, 60, 61, 63, 49, 53, 63],
          ["Burn", -92000, -88000, -83000, -79000, -76000, -70000, -64000, -61000, -57000, -52000, -48000, -43000, -263000, -225000, -813000],
        ],
      }),
      makeWorkbookPreview({
        fileName: "tall-ledger.xlsx",
        activeSheet: "Ledger",
        totalRows: 240,
        totalColumns: 8,
        rowLimit: 10,
        columnLimit: 8,
        truncatedRows: true,
        values: [
          ["Date", "Entity", "Account", "Department", "Vendor", "Debit", "Credit", "Memo"],
          ["2024-01-02", "US", "6010", "Sales", "AWS", 4200, null, "Cloud hosting"],
          ["2024-01-03", "US", "4020", "Sales", "Customer A", null, 18000, "Invoice 1001"],
          ["2024-01-05", "UK", "6120", "Ops", "Consultant", 2500, null, "Implementation support"],
          ["2024-01-08", "US", "1310", "Finance", "Bank", 1200, null, "Prepaid insurance"],
          ["2024-01-11", "US", "5020", "Sales", "Partner", 3100, null, "Referral fee"],
          ["2024-01-14", "CA", "4020", "Sales", "Customer B", null, 22000, "Invoice 1002"],
          ["2024-01-18", "US", "7100", "G&A", "Payroll", 9800, null, "Payroll accrual"],
          ["2024-01-21", "UK", "6010", "Ops", "Azure", 3900, null, "Cloud hosting"],
          ["2024-01-24", "US", "4020", "Sales", "Customer C", null, 16000, "Invoice 1003"],
          ["2024-01-28", "US", "6200", "Marketing", "Events Co", 6100, null, "Conference booth"],
        ],
      }),
      makeWorkbookPreview({
        fileName: "messy.csv",
        activeSheet: "messy",
        totalRows: 6,
        totalColumns: 5,
        rowLimit: 4,
        columnLimit: 5,
        truncatedRows: true,
        values: [
          ["Customer", "Notes", "Amount", "Locale", "Owner"],
          ["Acme, Inc.", "line one\nline two", 1200.5, "en-US", "Alex"],
          ["Globex", "quoted \"priority\" field", null, "de-DE", "Sam"],
          ["Initech", " trailing spaces ", -42, "fr-FR", "Riley"],
          ["Umbrella", "emoji retained", 88, "en-GB", "Casey"],
        ],
      }),
    ];

    try {
      for (const fixture of fixtures) {
        await sendToolResult(hostPage, fixture);
        await assertText(frame.locator("h1"), new RegExp(escapeRegExp(fixture.fileName)));
        await assertText(frame.locator("h2"), new RegExp(escapeRegExp(fixture.activeSheet)));
        assert.equal(await frame.locator(".grid tbody tr").count(), fixture.rows.length);
        assert.equal(await frame.locator(".grid td").count(), fixture.rows.flat().length);
      }

      await sendToolResult(hostPage, fixtures[0]);
      assert.equal(
        await frame.locator(".grid-wrap").evaluate((grid) => grid.scrollWidth > grid.clientWidth),
        true,
        "wide fixture should keep overflow inside the grid scroller",
      );

      await sendToolResult(hostPage, fixtures[1]);
      assert.equal(await frame.locator(".grid tbody tr").count(), 11);

      await sendToolResult(hostPage, fixtures[2]);
      await assertText(frame.locator(".grid"), /Acme, Inc\./);
      await assertText(frame.locator(".grid"), /line one/);
    } finally {
      await hostPage.close();
    }
  });
});

async function withViewerServer(run: (url: string, browser: Browser) => Promise<void>) {
  const server = await createServer({
    root: process.cwd(),
    logLevel: "silent",
    server: {
      host: "127.0.0.1",
      port: 0,
    },
  });
  await server.listen();

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch();
    const url = server.resolvedUrls?.local[0];
    assert.ok(url, "Vite did not report a local URL");
    await run(url, browser);
  } finally {
    await browser?.close();
    await server.close();
  }
}

async function createHostPage(browser: Browser, url: string): Promise<{ hostPage: Page; frame: FrameLocator }> {
  const hostPage = await browser.newPage({ viewport: { width: 760, height: 760 } });
  await hostPage.setContent(`
    <!doctype html>
    <html>
      <body style="margin:0;background:#181818">
        <iframe
          id="viewer"
          src="${url}"
          style="display:block;width:640px;height:140px;border:0"
        ></iframe>
        <script>
          const iframe = document.getElementById("viewer");
          window.__spreadsheetPeekHost = { initialized: false, nextPreview: null, toolCalls: [] };
          window.addEventListener("message", (event) => {
            const message = event.data;
            if (!message || message.jsonrpc !== "2.0") return;
            if (message.method === "ui/initialize") {
              event.source.postMessage({
                jsonrpc: "2.0",
                id: message.id,
                result: {
                  protocolVersion: message.params.protocolVersion,
                  hostInfo: { name: "test-host", version: "1.0.0" },
                  hostCapabilities: {
                    serverTools: {},
                    updateModelContext: { text: {}, structuredContent: {} },
                    message: { text: {} }
                  },
                  hostContext: {
                    displayMode: "inline",
                    platform: "desktop",
                    containerDimensions: { width: 640, height: 140 }
                  }
                }
              }, "*");
            }
            if (message.method === "ui/notifications/initialized") {
              window.__spreadsheetPeekHost.initialized = true;
            }
            if (message.method === "ui/notifications/size-changed") {
              iframe.style.height = Math.max(140, Math.ceil(message.params.height || 0)) + "px";
            }
            if (message.method === "tools/call") {
              window.__spreadsheetPeekHost.toolCalls.push(message.params);
              const preview = window.__spreadsheetPeekHost.nextPreview;
              event.source.postMessage({
                jsonrpc: "2.0",
                id: message.id,
                result: {
                  content: [{ type: "text", text: preview?.summary || "preview loaded" }],
                  structuredContent: preview
                }
              }, "*");
            }
          });
        </script>
      </body>
    </html>
  `);
  const frame = hostPage.frameLocator("#viewer");
  await hostPage.waitForFunction(() => {
    const host = (window as unknown as { __spreadsheetPeekHost?: { initialized?: boolean } }).__spreadsheetPeekHost;
    return host?.initialized === true;
  });
  await frame.locator(".grid td").first().waitFor();
  return { hostPage, frame };
}

async function sendToolInput(hostPage: Page, args: Record<string, unknown>, preview: WorkbookPreview) {
  await hostPage.evaluate(
    ({ args, preview }) => {
      const host = (window as unknown as { __spreadsheetPeekHost: { nextPreview: WorkbookPreview } }).__spreadsheetPeekHost;
      host.nextPreview = preview;
      const iframe = document.querySelector<HTMLIFrameElement>("#viewer");
      iframe?.contentWindow?.postMessage(
        {
          jsonrpc: "2.0",
          method: "ui/notifications/tool-input",
          params: { arguments: args },
        },
        "*",
      );
    },
    { args, preview },
  );
}

async function sendToolResult(hostPage: Page, preview: WorkbookPreview) {
  await hostPage.evaluate((preview) => {
    const iframe = document.querySelector<HTMLIFrameElement>("#viewer");
    iframe?.contentWindow?.postMessage(
      {
        jsonrpc: "2.0",
        method: "ui/notifications/tool-result",
        params: {
          content: [{ type: "text", text: preview.summary }],
          structuredContent: preview,
        },
      },
      "*",
    );
  }, preview);
}

async function lastToolCall(hostPage: Page): Promise<{ name: string; arguments: Record<string, unknown> }> {
  const call = await hostPage.evaluate(() => {
    const host = (
      window as unknown as {
        __spreadsheetPeekHost?: { toolCalls?: Array<{ name: string; arguments: Record<string, unknown> }> };
      }
    ).__spreadsheetPeekHost;
    return host?.toolCalls?.at(-1) ?? null;
  });
  assert.ok(call, "host did not capture a tool call");
  return call;
}

function makeWorkbookPreview(options: {
  fileName: string;
  activeSheet: string;
  totalRows: number;
  totalColumns: number;
  values: CellValue[][];
  filePath?: string;
  sheets?: WorkbookSheetSummary[];
  rowLimit?: number;
  columnLimit?: number;
  truncatedRows?: boolean;
  truncatedColumns?: boolean;
}): WorkbookPreview {
  const filePath = options.filePath ?? `/fixtures/${options.fileName}`;
  const visibleColumns = options.values[0]?.length ?? 0;
  const visibleDataRows = Math.max(0, options.values.length - 1);
  const rowLimit = options.rowLimit ?? visibleDataRows;
  const columnLimit = options.columnLimit ?? visibleColumns;
  const sheets = options.sheets ?? [
    {
      name: options.activeSheet,
      rows: options.totalRows,
      columns: options.totalColumns,
      headers: options.values[0]?.map((value) => String(value ?? "")) ?? [],
    },
  ];

  return {
    kind: "spreadsheet-peek-preview",
    version: "1.0",
    filePath,
    fileName: options.fileName,
    activeSheet: options.activeSheet,
    sheets,
    totalRows: options.totalRows,
    totalColumns: options.totalColumns,
    range: `A1:${columnName(Math.max(1, visibleColumns))}${Math.max(1, options.values.length)}`,
    rowOffset: 1,
    columnOffset: 1,
    rowLimit,
    columnLimit,
    truncatedRows: options.truncatedRows ?? options.totalRows > visibleDataRows,
    truncatedColumns: options.truncatedColumns ?? options.totalColumns > visibleColumns,
    rows: options.values.map((row, rowIndex) => row.map((value, columnIndex) => makeCell(value, rowIndex, columnIndex))),
    summary: `${options.fileName} - ${options.activeSheet} - showing ${visibleDataRows} of ${options.totalRows} data rows - ${visibleColumns} of ${options.totalColumns} columns`,
    commands: {
      terminalPreview: `wolfxl peek ${filePath} --sheet "${options.activeSheet}" -n ${rowLimit}`,
      textPreview: `wolfxl peek ${filePath} --sheet "${options.activeSheet}" --export text | sed -n '1,20p'`,
    },
  };
}

function makeCell(value: CellValue, rowIndex: number, columnIndex: number): PreviewCell {
  return {
    row: rowIndex + 1,
    column: columnIndex + 1,
    address: `${columnName(columnIndex + 1)}${rowIndex + 1}`,
    value,
    display: value === null ? "" : String(value),
    type: cellType(value),
    isHeader: rowIndex === 0,
  };
}

function cellType(value: CellValue): PreviewCell["type"] {
  if (value === null || value === "") return "empty";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
}

function sampleFinancialSheets(): WorkbookSheetSummary[] {
  return [
    { name: "P&L", rows: 21, columns: 7, headers: ["Account", "2024 Q1", "2024 Q2", "2024 Q3", "2024 Q4", "FY 2024", "YoY %"] },
    { name: "Balance Sheet", rows: 27, columns: 5, headers: ["Account", "2024-03-31", "2023-12-31", "Change $", "Change %"] },
    { name: "Revenue Breakdown", rows: 13, columns: 7, headers: ["Customer", "Segment", "Jan", "Feb", "Mar", "Q1 Total", "% of Revenue"] },
  ];
}

async function assertText(locator: Locator, pattern: RegExp) {
  const text = await locator.textContent();
  assert.match(text ?? "", pattern);
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
