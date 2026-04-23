# Examples

This directory contains a reproducible demo and sample data for `spreadsheet-peek`.

## Files

| File | Purpose |
|------|---------|
| `generate_sample.py` | Generates `sample-financials.xlsx` - a synthetic multi-sheet financial workbook (P&L, Balance Sheet, Revenue Breakdown). This is the "typical" shape benchmark. |
| `sample-financials.xlsx` | The generated financial workbook. Regenerate and commit whenever the generator changes so the demo and benchmarks stay reproducible. |
| `generate_wide_table.py` | Generates `wide-table.xlsx` - a 29-column × 24-row operations dashboard. Exists to stress-test the token-cost claims: wide tables amplify box-drawing overhead because every row adds that many column separators. |
| `wide-table.xlsx` | The generated wide workbook. Fed into `benchmarks/measure_tokens.py` alongside the financial sample. |
| `generate_tall_ledger.py` | Generates `tall-ledger.xlsx` - an 8-column × 120-row general-ledger detail sample with dates, memo text, debits, credits, and running balances. |
| `tall-ledger.xlsx` | The generated tall ledger workbook. Gives the benchmark a row-heavy accounting-detail shape between the financial package and the wide dashboard. |
| `generate_delimited_samples.py` | Generates `sample-ledger.csv`, `sample-ledger.tsv`, `sample-ledger.txt`, and `quoted-multiline.csv` for direct delimited-input token benchmarks. |
| `sample-ledger.csv` | Generated CSV ledger extract used by `benchmarks/measure_tokens.py` for direct `.csv` input costs. |
| `sample-ledger.tsv` | Generated TSV ledger extract used by `benchmarks/measure_tokens.py` for direct `.tsv` input costs. |
| `sample-ledger.txt` | Generated comma-delimited text extract used by `benchmarks/measure_tokens.py` for direct `.txt` input costs. |
| `quoted-multiline.csv` | Generated CSV with quoted commas, escaped quotes, tabs, and embedded newlines used by the direct-input benchmark and claim verifier. |
| `generate_messy_csv.py` | Generates `messy.csv` - a CSV designed to break naive previews (BOM, quoted commas, embedded newlines, escaped quotes, emoji, mixed decimal formats). |
| `messy.csv` | The generated messy CSV. Use it to sanity-check direct delimited previews plus the CSV-aware fallback recipes for custom inspection. |
| `sample-minimal.xls` | Small legacy Excel smoke fixture mirrored from upstream `wolfxl-cli` tests so `benchmarks/verify_claims.py` can prove direct `.xls` reads. |
| `sample-date.xlsb` | Small binary Excel smoke fixture mirrored from upstream `wolfxl-cli` tests so `benchmarks/verify_claims.py` can prove direct `.xlsb` reads and date rendering. |
| `sample-minimal.ods` | Small OpenDocument Spreadsheet smoke fixture mirrored from upstream `wolfxl-cli` tests so `benchmarks/verify_claims.py` can prove direct `.ods` reads. |
| `demo.tape` | VHS tape script that records the main README demo GIF. |
| `demo.gif` | Rendered README demo GIF. |
| `../scripts/record_agent_preview.tape` | VHS tape script that records the README agent workflow GIF. |
| `../assets/agent-preview.gif` | Rendered GIF showing the user-path mention -> Spreadsheet Peek preview workflow. |

## Regenerating the samples

All sample data is synthetic - no real company data. Regenerate with:

```bash
# From the repo root
uv run --with openpyxl python examples/generate_sample.py
uv run --with openpyxl python examples/generate_wide_table.py
uv run --with openpyxl python examples/generate_tall_ledger.py
python3 examples/generate_delimited_samples.py # no deps beyond stdlib
python3 examples/generate_messy_csv.py     # no deps beyond stdlib
```

## Re-recording the GIF

Requires [vhs](https://github.com/charmbracelet/vhs):

```bash
brew install charmbracelet/tap/vhs

# From the repo root
vhs examples/demo.tape
vhs scripts/record_agent_preview.tape
```

The tape scripts use the Dracula theme at 1200x720 with 14pt font to balance readability and file size.

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

# Tall ledger stress test - row-heavy accounting-detail shape
wolfxl peek examples/tall-ledger.xlsx -n 5
wolfxl peek examples/tall-ledger.xlsx --export text | sed -n '1,16p'

# Direct delimited preview
wolfxl peek examples/messy.csv -n 5
wolfxl peek examples/sample-ledger.csv -n 5
wolfxl peek examples/sample-ledger.tsv -n 5
wolfxl peek examples/sample-ledger.txt -n 5
wolfxl peek examples/quoted-multiline.csv -n 5

# Direct legacy workbook previews
wolfxl peek examples/sample-minimal.xls -n 2
wolfxl peek examples/sample-date.xlsb -n 2
wolfxl peek examples/sample-minimal.ods -n 2
```
