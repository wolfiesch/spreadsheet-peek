import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { constants } from "node:fs";
import { access, mkdtemp, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadWorkbookPreview, resolveWolfxlBinary, resolveWorkbookPath, selectionToTsv } from "../src/workbook.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

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
    assert.equal(preview.fileName, "messy.csv");
    assert.equal(preview.rows.length, 3);
    assert.match(preview.rows.flat().map((cell) => cell.display).join(" "), /Acme, Inc\./);
  });

  it("caps wide workbook columns while preserving an internal scroll shape", async () => {
    const preview = await loadWorkbookPreview({
      path: join(root, "examples", "wide-table.xlsx"),
      maxRows: 3,
      maxColumns: 8,
    });

    assert.equal(preview.fileName, "wide-table.xlsx");
    assert.ok(preview.totalColumns >= 20);
    assert.equal(preview.rows.length, 4);
    assert.equal(preview.rows[0].length, 8);
    assert.equal(preview.truncatedColumns, true);
  });

  it("caps tall ledger rows without hiding the table shape", async () => {
    const preview = await loadWorkbookPreview({
      path: join(root, "examples", "tall-ledger.xlsx"),
      maxRows: 5,
      maxColumns: 8,
    });

    assert.equal(preview.fileName, "tall-ledger.xlsx");
    assert.ok(preview.totalRows > 20);
    assert.equal(preview.rows.length, 6);
    assert.equal(preview.rows[0].length, 8);
    assert.equal(preview.truncatedRows, true);
  });

  it("honors explicit wolfxl binary overrides", async () => {
    const originalOverride = process.env.SPREADSHEET_PEEK_WOLFXL_BIN;
    const originalWolfxlBin = process.env.WOLFXL_BIN;
    process.env.SPREADSHEET_PEEK_WOLFXL_BIN = "  /opt/custom/wolfxl  ";
    process.env.WOLFXL_BIN = "/fallback/wolfxl";
    try {
      assert.equal(await resolveWolfxlBinary(), "/opt/custom/wolfxl");
    } finally {
      restoreEnv("SPREADSHEET_PEEK_WOLFXL_BIN", originalOverride);
      restoreEnv("WOLFXL_BIN", originalWolfxlBin);
    }
  });

  it("escapes control characters in TSV handoff text", () => {
    const preview = {
      rows: [
        [
          { display: "line one\nline two\tshifted" },
          { display: "back\\slash" },
        ],
      ],
    } as Parameters<typeof selectionToTsv>[0];

    assert.equal(selectionToTsv(preview), "line one\\nline two\\tshifted\tback\\\\slash");
  });

  it("finds wolfxl when Claude Desktop starts with a thin PATH", async () => {
    const cargoWolfxl = join(
      homedir(),
      ".cargo",
      "bin",
      process.platform === "win32" ? "wolfxl.exe" : "wolfxl",
    );
    try {
      await access(cargoWolfxl, constants.X_OK);
    } catch {
      return;
    }

    const originalPath = process.env.PATH;
    const originalOverride = process.env.SPREADSHEET_PEEK_WOLFXL_BIN;
    const originalWolfxlBin = process.env.WOLFXL_BIN;
    process.env.PATH = "/usr/bin:/bin";
    delete process.env.SPREADSHEET_PEEK_WOLFXL_BIN;
    delete process.env.WOLFXL_BIN;
    try {
      const preview = await loadWorkbookPreview({
        path: join(root, "examples", "sample-financials.xlsx"),
        maxRows: 1,
      });
      assert.equal(preview.activeSheet, "P&L");
    } finally {
      restoreEnv("PATH", originalPath);
      restoreEnv("SPREADSHEET_PEEK_WOLFXL_BIN", originalOverride);
      restoreEnv("WOLFXL_BIN", originalWolfxlBin);
    }
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

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
