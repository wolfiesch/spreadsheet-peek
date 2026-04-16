---
name: spreadsheet-peek
description: Inline terminal preview of Excel/CSV/spreadsheet files using xleak. Use proactively when working with .xlsx, .xls, .xlsm, .xlsb, .ods, or .csv files - before data processing, after fixture generation, when debugging table parsing, or when the user references a spreadsheet. Also use when asked to "peek", "preview", "show me the file", or "what does this spreadsheet look like".
version: 1.2.0
metadata:
  author: wolfgangs
  filePattern:
    - "**/*.xlsx"
    - "**/*.xls"
    - "**/*.xlsm"
    - "**/*.xlsb"
    - "**/*.ods"
  bashPattern:
    - "xleak"
    - "peek\\b"
---

# Spreadsheet Peek - Inline Terminal Preview

Show inline ASCII table previews of spreadsheet files using `xleak`. This skill is **proactive** - invoke it automatically at the right moments without waiting for the user to ask.

## Prerequisites

- `xleak` must be installed: `brew install bgreenwell/tap/xleak`
- Supports: `.xlsx`, `.xls`, `.xlsm`, `.xlsb`, `.ods`, `.csv`

## When to Invoke (Proactive Triggers)

### Always preview when:

1. **Before data processing**: When about to run a data pipeline, ETL job, or any script that reads a spreadsheet, preview the input file first so the user sees what the pipeline is processing.

2. **After generating a test fixture**: When a fixture `.xlsx` or `.csv` file is created or modified (especially in `tests/` directories), preview it to confirm the fixture looks right.

3. **When the user references a spreadsheet**: If the user mentions a `.xlsx` or `.csv` file path, preview it before discussing it. Don't describe the file - show it.

4. **When debugging parsing issues**: If investigating why a table was misclassified or mis-parsed, preview the raw input to see what the parser actually received.

5. **When comparing before/after**: Show both the input and any transformed output side-by-side (run xleak on the input, then show the processing results).

### Skip preview when:

- The file has already been previewed in the current conversation
- The file is being read programmatically (e.g., openpyxl/pandas in Python) and the code output already shows the data
- The user explicitly says they don't need to see it
- The file is enormous (>10K rows) and the user didn't ask - mention it exists and offer to preview a slice

## Token Efficiency (IMPORTANT)

xleak's box-drawing output is ~7x larger than raw TSV for the same data due to Unicode border characters. Choose the right mode based on context:

| Mode | When to use | Token cost |
|------|-------------|------------|
| **Box-drawing** (`xleak file -n 15`) | User is looking, readability matters | ~690 tokens for 5 rows |
| **Text export** (`xleak file --export text \| head -20`) | Context-sensitive, large files, repeated previews | ~54 tokens for 5 rows |

**Default rule**: Use box-drawing for the FIRST preview in a conversation (readability). Switch to `--export text | head` for subsequent previews or when context is getting long.

**Note**: `--export text` ignores the `-n` flag and dumps ALL rows. Always pipe through `head -N` to limit output.

## Commands

### Quick preview (default - 15 rows, readable)
```bash
xleak <file> -n 15
```

### Token-efficient preview (large files or repeat views)
```bash
xleak <file> --export text | head -20
```

### Full dump (all rows, use sparingly)
```bash
xleak <file> -n 0
```

### Specific sheet by name
```bash
xleak <file> --sheet "Balance Sheet" -n 15
```

### Specific sheet by index (0-based)
```bash
xleak <file> --sheet 1 -n 15
```

### Wide columns (for long text, descriptions)
```bash
xleak <file> -n 15 -w 60
```

### Show formulas instead of values
```bash
xleak <file> --formulas -n 15
```

### Export as clean text (for diffing, piping)
```bash
xleak <file> --export text
```

### Export as CSV
```bash
xleak <file> --export csv
```

### Export as JSON
```bash
xleak <file> --export json
```

## Multi-Sheet Workflow

When previewing a multi-sheet workbook:

1. First run shows the first sheet and lists available sheets in the output header (`Available sheets:` line)
2. If the workbook has multiple sheets, preview ALL relevant sheets (financial workbooks typically have 2-5 sheets that matter)
3. For repeated sheet previews, use text export to save tokens

```bash
# First sheet (readable, box-drawing)
xleak file.xlsx -n 15

# Subsequent sheets (token-efficient)
xleak file.xlsx --sheet "Balance Sheet" --export text | head -20
xleak file.xlsx --sheet "Cash Flow" --export text | head -20
```

## Shell Aliases

Add these to your `~/.zshrc` or `~/.bashrc`:

```bash
alias peek='xleak -n 20 -w 40'
alias peekall='xleak -n 0'
alias peekwide='xleak -n 20 -w 60'
```

## Companion Tool: vex-tui

For **interactive terminal editing** of spreadsheet files (not for inline agent previews):
- Install: `brew install CodeOne45/tap/vex`
- Run: `vex <file>`
- Vim keybindings: `h/j/k/l` navigate, `i` edit cell, `:w` save, `:q` quit, Tab switch sheets
- Features: 15+ formula functions, inline charts, 10+ themes, auto-save
- Use when you want to hand-edit fixtures without opening Excel

**xleak is for viewing (agent + human), vex is for editing (human only).**

## Python Fallback

If xleak is unavailable, use openpyxl + tabulate:

```python
import openpyxl, tabulate
wb = openpyxl.load_workbook('file.xlsx', data_only=True)
ws = wb.active
rows = [[cell.value for cell in row] for row in ws.iter_rows()]
print(tabulate.tabulate(rows[1:], headers=rows[0] or [], tablefmt='grid'))
```

## Why xleak Over Disposable Python Scripts

xleak saves ~150-200 generation tokens per invocation (no Python code to write). The tradeoff:
- **Box-drawing output** is ~7x larger than raw TSV (Unicode borders cost tokens on the context side)
- **`--export text | head`** is the most token-efficient option overall (~54 tokens for 5 rows vs ~250 for Python approach)
- **Reliability**: xleak never fails on import errors, env issues, or edge cases in ad-hoc parsing code
- **Speed**: Rust binary parses instantly vs ~0.5-1s openpyxl startup

**Never write disposable Python to view a spreadsheet. Use xleak.**

## Output Interpretation Notes

- Empty cells show as blank (no value in the cell)
- Numbers with commas (e.g., `1,200`) indicate xleak is preserving Excel number formatting
- The header line `Sheet: SheetName (N rows x M columns)` tells you the full dimensions
- `Available sheets:` line appears when the workbook has multiple tabs
- `Showing N of M rows` warning appears when output is truncated by `-n`
