import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { loadWorkbookPreview, resolveWorkbookPath } from "../src/workbook.js";

const root = resolve(import.meta.dirname, "..", "..");

describe("loadWorkbookPreview", () => {
  it("loads a bounded preview from the sample workbook", async () => {
    const preview = await loadWorkbookPreview({
      path: join(root, "examples", "sample-financials.xlsx"),
      maxRows: 5,
      maxColumns: 4,
    });

    assert.equal(preview.activeSheet, "P&L");
    assert.equal(preview.fileName, "sample-financials.xlsx");
    assert.equal(preview.rows.length, 6);
    assert.equal(preview.rows[0].length, 4);
    assert.equal(preview.rows[0][0].display, "Account");
    assert.ok(preview.sheets.some((sheet) => sheet.name === "Balance Sheet"));
    assert.equal(preview.truncatedRows, true);
    assert.equal(preview.truncatedColumns, true);
  });

  it("selects a named sheet and preserves date headers", async () => {
    const preview = await loadWorkbookPreview({
      path: join(root, "examples", "sample-financials.xlsx"),
      sheet: "Balance Sheet",
      maxRows: 2,
    });

    assert.equal(preview.activeSheet, "Balance Sheet");
    assert.equal(preview.rows[0][1].display, "2024-03-31");
  });

  it("reads direct CSV previews through wolfxl 0.8+", async () => {
    const preview = await loadWorkbookPreview({
      path: join(root, "examples", "messy.csv"),
      maxRows: 2,
    });

    assert.equal(preview.activeSheet, "messy");
    assert.match(preview.rows.flat().map((cell) => cell.display).join(" "), /Acme, Inc\./);
  });

  it("rejects unsupported file extensions", async () => {
    const dir = await mkdtemp(join(tmpdir(), "spreadsheet-peek-"));
    const file = join(dir, "notes.pdf");
    await writeFile(file, "not a spreadsheet");
    await assert.rejects(() => resolveWorkbookPath(file), /unsupported file extension/);
  });

  it("returns a clear error when wolfxl is missing", async () => {
    await assert.rejects(
      () =>
        loadWorkbookPreview({
          path: join(root, "examples", "sample-financials.xlsx"),
          wolfxlBin: "/definitely/not/wolfxl",
        }),
      /failed to run/,
    );
  });
});
