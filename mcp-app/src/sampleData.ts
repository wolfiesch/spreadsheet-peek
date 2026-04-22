import type { WorkbookPreview } from "./types.js";

const headers = ["Account", "Jan 2024", "Feb 2024", "Mar 2024", "Q1 Total", "Q1 2023", "YoY %"];
const rows = [
  headers,
  ["Revenue", null, null, null, null, null, null],
  ["  Product Sales", 420000, 445000, 512000, 1377000, 1050000, "31.1%"],
  ["  Services", 180000, 195000, 208000, 583000, 480000, "21.5%"],
  ["  Subscriptions", 92000, 97500, 103800, 293300, 210000, "39.7%"],
  ["Total Revenue", 692000, 737500, 823800, 2253300, 1740000, "29.5%"],
  [null, null, null, null, null, null, null],
  ["Cost of Goods Sold", 277000, 295000, 329500, 901500, 732000, "23.2%"],
  ["Gross Profit", 415000, 442500, 494300, 1351800, 1008000, "34.1%"],
  ["Gross Margin %", "60.0%", "60.0%", "60.0%", "60.0%", "57.9%", null],
  [null, null, null, null, null, null, null],
  ["Operating Expenses", null, null, null, null, null, null],
  ["  Salaries & Benefits", 145000, 148000, 152000, 445000, 380000, "17.1%"],
  ["  Rent", 18000, 18000, 18000, 54000, 48000, "12.5%"],
  ["  Marketing", 32000, 41000, 38500, 111500, 78000, "43.0%"],
];

export const samplePreview: WorkbookPreview = {
  kind: "spreadsheet-peek-preview",
  version: "1.0",
  filePath: "examples/sample-financials.xlsx",
  fileName: "sample-financials.xlsx",
  activeSheet: "P&L",
  sheets: [
    { name: "P&L", rows: 21, columns: 7, class: "data", headers },
    {
      name: "Balance Sheet",
      rows: 27,
      columns: 5,
      class: "data",
      headers: ["Account", "2024-03-31", "2023-12-31", "Change $", "Change %"],
    },
    {
      name: "Revenue Breakdown",
      rows: 13,
      columns: 7,
      class: "data",
      headers: ["Customer", "Segment", "Jan", "Feb", "Mar", "Q1 Total", "% of Total"],
    },
  ],
  totalRows: 20,
  totalColumns: 7,
  range: "A1:G15",
  rowOffset: 1,
  columnOffset: 1,
  rowLimit: 50,
  columnLimit: 40,
  truncatedRows: true,
  truncatedColumns: false,
  rows: rows.map((row, rowIdx) =>
    row.map((value, colIdx) => ({
      row: rowIdx + 1,
      column: colIdx + 1,
      address: `${String.fromCharCode(65 + colIdx)}${rowIdx + 1}`,
      value,
      display: value === null ? "" : String(value),
      type:
        value === null
          ? "empty"
          : typeof value === "number"
            ? "number"
            : typeof value === "boolean"
              ? "boolean"
              : "string",
      isHeader: rowIdx === 0,
    })),
  ),
  summary: "sample-financials.xlsx - P&L - showing 14 of 20 data rows - 7 of 7 columns",
  commands: {
    terminalPreview: "wolfxl peek examples/sample-financials.xlsx --sheet 'P&L' -n 15",
    textPreview: "wolfxl peek examples/sample-financials.xlsx --sheet 'P&L' --export text | sed -n '1,20p'",
  },
};
