import type { WorkbookPreview } from "./types.js";

const MAX_SVG_ROWS = 14;
const MAX_SVG_COLUMNS = 8;
const ROW_HEIGHT = 34;
const COL_WIDTH = 132;
const ROW_HEADER_WIDTH = 54;
const HEADER_HEIGHT = 92;

export function renderPreviewSvg(preview: WorkbookPreview): string {
  const visibleRows = preview.rows.slice(0, MAX_SVG_ROWS);
  const visibleColumns = Math.min(MAX_SVG_COLUMNS, visibleRows[0]?.length ?? 0);
  const width = ROW_HEADER_WIDTH + visibleColumns * COL_WIDTH + 36;
  const height = HEADER_HEIGHT + visibleRows.length * ROW_HEIGHT + 32;
  const cells = visibleRows
    .map((row, rowIdx) =>
      row
        .slice(0, visibleColumns)
        .map((cell, colIdx) => {
          const x = ROW_HEADER_WIDTH + colIdx * COL_WIDTH + 18;
          const y = HEADER_HEIGHT + rowIdx * ROW_HEIGHT;
          const fill = cell.isHeader ? "#edf6f1" : cell.type === "empty" ? "#fbfcfb" : "#ffffff";
          const weight = cell.isHeader ? "600" : "450";
          const align = cell.type === "number" ? "end" : "start";
          const textX = align === "end" ? x + COL_WIDTH - 12 : x + 12;
          return `
            <rect x="${x}" y="${y}" width="${COL_WIDTH}" height="${ROW_HEIGHT}" fill="${fill}" stroke="#d9e2dd"/>
            <text x="${textX}" y="${y + 22}" text-anchor="${align}" font-size="12" font-weight="${weight}" fill="#17211d">${escapeXml(truncate(cell.display, 18))}</text>
          `;
        })
        .join("\n"),
    )
    .join("\n");
  const rowLabels = visibleRows
    .map((row, idx) => {
      const y = HEADER_HEIGHT + idx * ROW_HEIGHT;
      const label = row[0]?.row ?? idx + 1;
      return `<text x="42" y="${y + 22}" text-anchor="end" font-size="11" fill="#6a7771">${label}</text>`;
    })
    .join("\n");
  const columnLabels = Array.from({ length: visibleColumns }, (_, idx) => {
    const x = ROW_HEADER_WIDTH + idx * COL_WIDTH + 18;
    const label = preview.rows[0]?.[idx]?.address.replace(/\d+$/, "") ?? "";
    return `<text x="${x + COL_WIDTH / 2}" y="${HEADER_HEIGHT - 12}" text-anchor="middle" font-size="11" font-weight="700" fill="#587066">${label}</text>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" rx="0" fill="#f6f4ee"/>
  <rect x="18" y="18" width="${width - 36}" height="${height - 36}" rx="8" fill="#ffffff" stroke="#d4ddd7"/>
  <text x="34" y="46" font-size="18" font-weight="700" fill="#12211b">${escapeXml(preview.fileName)}</text>
  <text x="34" y="70" font-size="12" fill="#61716a">${escapeXml(preview.summary)}</text>
  ${columnLabels}
  ${rowLabels}
  ${cells}
  <text x="${width - 34}" y="${height - 24}" text-anchor="end" font-size="11" fill="#7d8a84">${escapeXml(preview.range)}</text>
</svg>`;
}

export function svgToBase64(svg: string): string {
  return Buffer.from(svg, "utf8").toString("base64");
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 3))}...` : value;
}
