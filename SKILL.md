---
name: spreadsheet-peek
description: Preview spreadsheet/delimited files with the Spreadsheet Peek MCP viewer or `wolfxl peek`. Use proactively for .xlsx, .xlsm, .xls, .xlsb, .ods, .csv, .tsv, or .txt before processing, after fixture generation, during parsing debug, or when asked to peek/preview/show a file.
version: 2.2.0
metadata:
  author: wolfgangs
  filePattern:
    - "**/*.xlsx"
    - "**/*.xls"
    - "**/*.xlsm"
    - "**/*.xlsb"
    - "**/*.ods"
    - "**/*.csv"
    - "**/*.tsv"
    - "**/*.txt"
  bashPattern:
    - "wolfxl"
    - "peek\\b"
---

# Spreadsheet Peek

Show inline previews of spreadsheet files. Prefer the Spreadsheet Peek MCP viewer when available; otherwise use terminal `wolfxl peek`. This skill is **proactive** - invoke it at the right moments without waiting for the user to ask.

## Prerequisites

- `wolfxl` must be installed: `cargo install wolfxl-cli`
- `wolfxl-cli >= 0.8.0` supports `.xlsx`, `.xlsm`, `.xls`, `.xlsb`, `.ods`, `.csv`, `.tsv`, and comma-delimited `.txt`
- Formatting fidelity is strongest for `.xlsx` and `.xlsm`; legacy workbook and delimited inputs are value-first previews with limited style metadata

## MCP Viewer (When Available)

If the `spreadsheet-peek` MCP server is enabled, use it for user-visible previews before terminal output:

```text
open_workbook_viewer(path="/absolute/path/to/file.xlsx", sheet="P&L", maxRows=50, maxColumns=40)
```

Use `preview_workbook` for structured data without opening the grid. MCP tools return a bounded preview, sheet metadata, text summary, and image fallback. The viewer supports sheet tabs, sticky headers, search, range selection, and selected-range handoff.

Use terminal `wolfxl peek` when MCP is unavailable, the agent is shell-only, or you need a copy-pasteable transcript.

## When to Invoke (Proactive Triggers)

### Always preview when:

1. **Before data processing**: When about to run a data pipeline, ETL job, or any script that reads a spreadsheet, preview the input file first so the user sees what the pipeline is processing.

2. **After generating a test fixture**: When a fixture spreadsheet or delimited file is created or modified (especially in `tests/` directories), preview it to confirm the fixture looks right.

3. **When the user references a spreadsheet**: If the user mentions a spreadsheet, CSV, TSV, or table-like text file path, preview it before discussing it. Don't describe the file - show it.

4. **When debugging parsing issues**: If investigating why a table was misclassified or mis-parsed, preview the raw input to see what the parser actually received.

5. **When comparing before/after**: Show both the input and any transformed output side-by-side (run `wolfxl peek` on the input, then show the processing results).

### Skip preview when:

- The file has already been previewed in the current conversation
- The file is being read programmatically (e.g., openpyxl/pandas in Python) and the code output already shows the data
- The user explicitly says they don't need to see it
- The file is enormous (>10K rows) and the user didn't ask - mention it exists and offer to preview a slice

## Token Efficiency (IMPORTANT)

`wolfxl peek`'s box-drawing output uses Unicode border characters that cost real tokens. Choose the right mode based on context:

| Mode | When to use | Token cost (5 data rows) |
|------|-------------|---------------------|
| **Box-drawing** (`wolfxl peek file -n 5`) | User is looking, readability matters | ~573 tokens (~115/row) |
| **Text export** (`wolfxl peek file --export text \| sed -n '1,6p'`) | Context-sensitive, large files, repeated previews | ~148 tokens (~30/row) |

**Default rule**: Use box-drawing for the FIRST preview in a conversation (readability). Switch to `--export text | sed -n '1,Np'` for subsequent previews or when context is getting long.

**Measured ratio**: box-drawing is ~3.9x more expensive per row than text export on a 7-column financial workbook, ~3.6x on an 8-column tall ledger, and ~3.0x on a 29-column wide table. The overhead is mostly fixed (header/border lines), so the per-row cost improves with more rows - but text export is still cheaper at every size.

**Delimited fixtures**: CSV/TSV/TXT ledger previews cost ~524 box tokens and ~145 text tokens; quoted multiline CSV costs ~401 and ~116.

**Note**: `--export text` ignores the `-n` flag and dumps ALL rows. Always pipe through `sed -n '1,Np'` to limit what enters the conversation. Prefer `sed` over `head` with current `wolfxl-cli` releases because `head` can close the pipe early and make `wolfxl` print a broken-pipe warning.

## Commands

### Quick preview (default - 15 rows, readable)
```bash
wolfxl peek <file> -n 15
```

### Token-efficient preview (large files or repeat views)
```bash
wolfxl peek <file> --export text | sed -n '1,20p'
```

### Budgeted agent briefing (large or unfamiliar workbook)
```bash
wolfxl agent <file> --max-tokens 800
```

### Full dump (all rows, use sparingly)
```bash
wolfxl peek <file> -n 0
```

### Specific sheet by name
```bash
wolfxl peek <file> --sheet "Balance Sheet" -n 15
```

### Wide columns (for long text, descriptions)
```bash
wolfxl peek <file> -n 15 -w 60
```

### Export as clean text (for diffing, piping)
```bash
wolfxl peek <file> --export text
```

### Export as CSV
```bash
wolfxl peek <file> --export csv
```

### Export as JSON
```bash
wolfxl peek <file> --export json
```

## Delimited File Notes

`wolfxl peek` reads `.csv`, `.tsv`, and comma-delimited `.txt` files directly in `wolfxl-cli >= 0.8.0`:

```bash
wolfxl peek file.csv -n 15
wolfxl peek file.tsv -n 15
wolfxl peek file.txt -n 15
```

For raw inspection, custom delimiters, dimensions, or older installed `wolfxl` binaries:

```bash
head -15 file.csv                                # raw sniff
head -15 file.csv | column -s, -t                # simple CSV only
mlr --icsv --opprint head -n 15 file.csv         # CSV-aware
csvlook --max-rows 15 file.csv                   # CSV-aware
mlr --icsv --opprint count file.csv              # row count
mlr --icsv --opprint put '$columns = NF' then head -n 1 file.csv
```

**Which to use**: default to `wolfxl peek` for conversation-visible previews. Use `head` only for a raw text sniff, `column -s, -t` only on simple CSVs, and `mlr`/`csvkit` for custom delimiters, encodings outside UTF-8, or CSV-aware dimensions.

**Known caveat**: `wolfxl-cli 0.8.0` is UTF-8 only and does not strip BOMs or detect arbitrary delimiters. A UTF-8 BOM may show in the first header cell; non-comma `.txt` files need a CSV-aware tool or a temporary conversion.

**If you must use Python** (CSV too messy for shell tools), reach for `csv.DictReader` + `tabulate`, not pandas - pandas has a ~1s import cost and is overkill for a preview.

## Legacy Workbook Notes

`wolfxl-cli >= 0.8.0` reads `.xls`, `.xlsb`, and `.ods` directly:

```bash
wolfxl peek file.xls -n 15
wolfxl peek file.xlsb -n 15
wolfxl peek file.ods -n 15
```

These formats expose values reliably but not full Excel style metadata. If you need high-fidelity styling, convert a temporary copy to `.xlsx` first:

```bash
mkdir -p /tmp/spreadsheet-peek
soffice --headless --convert-to xlsx --outdir /tmp/spreadsheet-peek file.xls
wolfxl peek /tmp/spreadsheet-peek/file.xlsx -n 15
```

If LibreOffice is not installed, use the direct preview and say legacy style fidelity is limited. If an older `wolfxl` rejects these inputs, upgrade with `cargo install wolfxl-cli --version 0.8.0 --force`.

## Multi-Sheet Workflow

When previewing a multi-sheet workbook:

1. First run shows the first sheet and lists available sheets in the output header (`Available sheets:` line)
2. If the workbook has multiple sheets, preview ALL relevant sheets (financial workbooks typically have 2-5 sheets that matter)
3. For repeated sheet previews, use text export to save tokens

```bash
# First sheet (readable, box-drawing)
wolfxl peek file.xlsx -n 15

# Subsequent sheets (token-efficient)
wolfxl peek file.xlsx --sheet "Balance Sheet" --export text | sed -n '1,20p'
wolfxl peek file.xlsx --sheet "Cash Flow" --export text | sed -n '1,20p'
```

## Python Fallback

If `wolfxl` is unavailable, use openpyxl + tabulate:

```python
import openpyxl, tabulate
wb = openpyxl.load_workbook('file.xlsx', data_only=True)
ws = wb.active
rows = [[cell.value for cell in row] for row in ws.iter_rows()]
print(tabulate.tabulate(rows[1:], headers=rows[0] or [], tablefmt='grid'))
```

## Why `wolfxl peek` Over Disposable Python Scripts

`wolfxl peek` saves ~150-200 generation tokens per invocation (no Python code to write). The tradeoff:
- **Box-drawing output** is ~3-4x larger than text export for equal preview slices (Unicode borders cost tokens on the context side)
- **`--export text | sed -n '1,Np'`** is the most token-efficient option overall (~148 tokens for 5 data rows vs ~250 for Python approach)
- **Reliability**: `wolfxl peek` avoids import errors, env issues, and edge cases in ad-hoc parsing code
- **Speed**: Rust binary parses instantly vs ~0.5-1s openpyxl startup
- **Readable formatting**: Date cells render as ISO dates, common currency/percentage formats render in human-facing previews, and numeric cells are grouped for scanning. Style fidelity is strongest for `.xlsx` / `.xlsm`.

**Never write disposable Python to view a spreadsheet. Use `wolfxl peek`.**

## Output Interpretation Notes

- Empty cells show as blank (no value in the cell)
- Numeric cells are grouped for readability (e.g., `1,200` instead of `1200`)
- Date cells render as ISO `YYYY-MM-DD`; common currency and percentage number formats render in human-facing `.xlsx` / `.xlsm` previews
- The header line `Sheet: SheetName (N rows × M columns)` tells you the full dimensions
- `Available sheets:` line appears when the workbook has multiple tabs
- The banner `wolfxl peek - Excel preview` confirms you're getting `wolfxl` output (vs a manual openpyxl dump)
