export type CellValue = string | number | boolean | null;

export interface WorkbookSheetSummary {
  name: string;
  rows: number;
  columns: number;
  class?: string;
  headers: string[];
}

export interface PreviewCell {
  row: number;
  column: number;
  address: string;
  value: CellValue;
  display: string;
  type: "empty" | "string" | "number" | "boolean";
  isHeader: boolean;
}

export interface WorkbookPreview {
  kind: "spreadsheet-peek-preview";
  version: "1.0";
  filePath: string;
  fileName: string;
  activeSheet: string;
  sheets: WorkbookSheetSummary[];
  totalRows: number;
  totalColumns: number;
  range: string;
  rowOffset: number;
  columnOffset: number;
  rowLimit: number;
  columnLimit: number;
  truncatedRows: boolean;
  truncatedColumns: boolean;
  rows: PreviewCell[][];
  summary: string;
  commands: {
    terminalPreview: string;
    textPreview: string;
  };
}

export interface PreviewOptions {
  path: string;
  sheet?: string;
  range?: string;
  maxRows?: number;
  maxColumns?: number;
  wolfxlBin?: string;
}

export interface WolfxlPeekJson {
  sheet: string;
  rows: number;
  columns: number;
  headers: string[];
  data: CellValue[][];
}

export interface WolfxlMapJson {
  path: string;
  named_ranges?: unknown[];
  sheets: Array<{
    name: string;
    rows: number;
    cols: number;
    class?: string;
    headers?: string[];
    tables?: unknown[];
  }>;
}
