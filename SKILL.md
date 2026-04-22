---
name: spreadsheet-peek
description: Inline terminal preview of Excel spreadsheets using `wolfxl peek`. Use proactively when working with .xlsx or .xlsm files - before data processing, after fixture generation, when debugging table parsing, or when the user references a spreadsheet. Also use when asked to "peek", "preview", "show me the file", or "what does this spreadsheet look like". For .xls, .xlsb, .ods, or .csv files, see the fallback sections below.
version: 2.0.0
metadata:
  author: wolfgangs
  filePattern:
    - "**/*.xlsx"
    - "**/*.xls"
    - "**/*.xlsm"
    - "**/*.xlsb"
    - "**/*.ods"
    - "**/*.csv"
  bashPattern:
    - "wolfxl"
    - "peek\\b"
---

# Spreadsheet Peek - Inline Terminal Preview

Show inline ASCII table previews of spreadsheet files using `wolfxl peek`. This skill is **proactive** - invoke it automatically at the right moments without waiting for the user to ask.

## Prerequisites

- `wolfxl` must be installed: `cargo install wolfxl-cli`
- `wolfxl-cli 0.7.x` supports `.xlsx` and OOXML `.xlsm` workbooks directly
- `.xls`, `.xlsb`, `.ods`, and `.csv` are **not** handled by the current stable `wolfxl peek` release - see [Legacy Workbook Fallback](#legacy-workbook-fallback) and [CSV Fallback](#csv-fallback) below

## When to Invoke (Proactive Triggers)

### Always preview when:

1. **Before data processing**: When about to run a data pipeline, ETL job, or any script that reads a spreadsheet, preview the input file first so the user sees what the pipeline is processing.

2. **After generating a test fixture**: When a fixture `.xlsx` or `.csv` file is created or modified (especially in `tests/` directories), preview it to confirm the fixture looks right.

3. **When the user references a spreadsheet**: If the user mentions a spreadsheet or `.csv` file path, preview it before discussing it. Don't describe the file - show it.

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

## CSV Fallback

`wolfxl peek` does **not** read `.csv` files - passing a CSV produces a parse error. For CSVs, use these token-efficient alternatives instead of writing disposable Python:

```bash
# Quick peek - first 15 rows, raw
head -15 file.csv

# Pretty-printed column alignment for simple CSVs (no quoted commas or
# embedded newlines - column -s, -t is not CSV-aware, it just splits on ,)
head -15 file.csv | column -s, -t

# CSV-aware tools (use these when the file might have quoted fields,
# embedded newlines, UTF-8 BOM, or any non-trivial escaping):
mlr --icsv --opprint head -n 15 file.csv         # miller
csvlook --max-rows 15 file.csv                    # csvkit

# Rough row and column dimensions (heuristic - wc -l over-counts rows
# when fields contain embedded newlines; tr , wc -l over-counts columns
# when fields contain quoted commas. Use mlr/csvkit for an accurate count
# on non-trivial CSVs):
wc -l file.csv && head -1 file.csv | tr , '\n' | wc -l
# Accurate dimensions for messy files:
mlr --icsv --opprint count file.csv              # row count, CSV-aware
mlr --icsv --opprint put '$columns = NF' then head -n 1 file.csv
```

**Which to use**: `head` is always available and costs zero tokens for the tool invocation. Use `column -s, -t` only on simple CSVs where no field contains a comma, a quote, or a newline. For any CSV with quoted fields, embedded newlines, or BOMs, reach for `mlr` or `csvkit` - plain `head`/`column` will mis-render them and `wc`/`tr` will lie about the dimensions.

**If `mlr`/`csvlook` are missing**: use the raw `head` preview, then install `miller` or `csvkit` only if the CSV is messy enough to justify it.

**If you must use Python** (CSV too messy for shell tools), reach for `csv.DictReader` + `tabulate`, not pandas - pandas has a ~1s import cost and is overkill for a preview.

## Legacy Workbook Fallback

Current stable `wolfxl-cli` releases do not read `.xls`, `.xlsb`, or `.ods` directly. If you need to inspect one, convert a temporary copy to `.xlsx` first, then run `wolfxl peek` on the converted file:

```bash
mkdir -p /tmp/spreadsheet-peek
soffice --headless --convert-to xlsx --outdir /tmp/spreadsheet-peek file.xls
wolfxl peek /tmp/spreadsheet-peek/file.xlsx -n 15
```

If LibreOffice is not installed, use the best available reader for the format and say that the direct `wolfxl peek` path is not supported by the installed release. Do not pretend an `.xls`/`.ods` parse error is a workbook problem.

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

## Shell Aliases

Add these to your `~/.zshrc` or `~/.bashrc`:

```bash
alias peek='wolfxl peek -n 20 -w 40'
alias peekall='wolfxl peek -n 0'
alias peekwide='wolfxl peek -n 20 -w 60'
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
- **Reliability**: `wolfxl peek` never fails on import errors, env issues, or edge cases in ad-hoc parsing code
- **Speed**: Rust binary parses instantly vs ~0.5-1s openpyxl startup
- **Readable formatting**: Date cells render as ISO dates, and numeric cells are grouped for scanning. Current stable `peek` output does not promise every Excel currency or percentage symbol.

**Never write disposable Python to view a spreadsheet. Use `wolfxl peek`.**

## Output Interpretation Notes

- Empty cells show as blank (no value in the cell)
- Numeric cells are grouped for readability (e.g., `1,200` instead of `1200`)
- Date cells render as ISO `YYYY-MM-DD`; current stable `peek` output does not promise to preserve every currency or percentage symbol from Excel number-format metadata
- The header line `Sheet: SheetName (N rows × M columns)` tells you the full dimensions
- `Available sheets:` line appears when the workbook has multiple tabs
- The banner `wolfxl peek - Excel preview` confirms you're getting `wolfxl` output (vs a manual openpyxl dump)
