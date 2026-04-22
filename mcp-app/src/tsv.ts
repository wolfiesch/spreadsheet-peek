import type { PreviewCell } from "./types.js";

export function cellsToTsv(rows: Pick<PreviewCell, "display">[][]): string {
  return rows
    .map((row) => row.map((cell) => escapeTsvCell(cell.display)).join("\t"))
    .join("\n");
}

export function escapeTsvCell(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\r", "\\r")
    .replaceAll("\n", "\\n")
    .replaceAll("\t", "\\t");
}
