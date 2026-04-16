# Examples

This directory contains a reproducible demo and sample data for `spreadsheet-peek`.

## Files

| File | Purpose |
|------|---------|
| `generate_sample.py` | Generates `sample-financials.xlsx` - a synthetic multi-sheet financial workbook (P&L, Balance Sheet, Revenue Breakdown). |
| `sample-financials.xlsx` | The generated sample workbook. Commit regenerated to keep the demo reproducible. |
| `demo.tape` | VHS tape script that records the README demo GIF. |
| `demo.gif` | Rendered demo GIF (used in the main README). |

## Regenerating the sample

The sample data is synthetic - no real company data. Regenerate with:

```bash
# From the repo root
uv run --with openpyxl python examples/generate_sample.py
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
# Default preview
xleak examples/sample-financials.xlsx -n 10

# Switch sheets
xleak examples/sample-financials.xlsx --sheet "Balance Sheet" -n 8

# Token-efficient mode (13x cheaper for repeat views)
xleak examples/sample-financials.xlsx --export text | head -15

# Wide columns for long account names
xleak examples/sample-financials.xlsx -n 15 -w 50
```
