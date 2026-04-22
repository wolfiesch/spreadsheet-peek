# Examples

This directory contains a reproducible demo and sample data for `spreadsheet-peek`.

## Files

| File | Purpose |
|------|---------|
| `generate_sample.py` | Generates `sample-financials.xlsx` - a synthetic multi-sheet financial workbook (P&L, Balance Sheet, Revenue Breakdown). This is the "typical" shape benchmark. |
| `sample-financials.xlsx` | The generated financial workbook. Regenerate and commit whenever the generator changes so the demo and benchmarks stay reproducible. |
| `generate_wide_table.py` | Generates `wide-table.xlsx` - a 29-column × 24-row operations dashboard. Exists to stress-test the token-cost claims: wide tables amplify box-drawing overhead because every row adds that many column separators. |
| `wide-table.xlsx` | The generated wide workbook. Fed into `benchmarks/measure_tokens.py` alongside the financial sample. |
| `generate_messy_csv.py` | Generates `messy.csv` - a CSV designed to break naive previews (BOM, quoted commas, embedded newlines, escaped quotes, emoji, mixed decimal formats). |
| `messy.csv` | The generated messy CSV. Use it to sanity-check the SKILL.md CSV fallback chain - `head` alone mis-renders it; `csvlook`/`mlr` handle it cleanly. |
| `demo.tape` | VHS tape script that records the main README demo GIF. |
| `demo.gif` | Rendered README demo GIF. |

## Regenerating the samples

All sample data is synthetic - no real company data. Regenerate with:

```bash
# From the repo root
uv run --with openpyxl python examples/generate_sample.py
uv run --with openpyxl python examples/generate_wide_table.py
python3 examples/generate_messy_csv.py     # no deps beyond stdlib
```

## Re-recording the GIF

Requires [vhs](https://github.com/charmbracelet/vhs):

```bash
brew install charmbracelet/tap/vhs

# From the repo root
vhs examples/demo.tape
```

The tape script uses the Dracula theme at 1200x720 with 14pt font to balance readability and file size (target: <500KB for Twitter/GitHub friendliness).

## Try it yourself

```bash
# Default preview (readable table with ISO date headers)
wolfxl peek examples/sample-financials.xlsx -n 10

# Switch sheets
wolfxl peek examples/sample-financials.xlsx --sheet "Balance Sheet" -n 8

# Token-efficient mode (~3.9x cheaper for repeat views)
wolfxl peek examples/sample-financials.xlsx --export text | sed -n '1,15p'

# Wide columns for long account names
wolfxl peek examples/sample-financials.xlsx -n 15 -w 50

# Wide-table stress test - box-drawing mode on 29 columns is HUGE
wolfxl peek examples/wide-table.xlsx -n 3
wolfxl peek examples/wide-table.xlsx --export text | sed -n '1,6p'

# Messy CSV: the skill's CSV fallback in action
head -6 examples/messy.csv | column -s, -t     # naive, mis-renders
csvlook --max-rows 15 examples/messy.csv        # csvkit, renders correctly
```
