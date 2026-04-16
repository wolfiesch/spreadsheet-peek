# spreadsheet-peek

An AI coding agent skill that gives your agent eyes on spreadsheet files. Instead of writing throwaway Python scripts to inspect `.xlsx`/`.csv` files, the agent runs [`xleak`](https://github.com/bgreenwell/xleak) and gets an instant ASCII table preview in the terminal.

The skill is **proactive** - the agent previews spreadsheets automatically at the right moments (before processing, after fixture generation, when you mention a file) without you needing to ask.

## What it looks like

```
┌─────────────────────────┬────────────┬────────────┬────────────┐
│ Account                 │ 2024       │ 2023       │ 2022       │
├─────────────────────────┼────────────┼────────────┼────────────┤
│ Revenue                 │ 1,200,000  │ 980,000    │ 850,000    │
│ Cost of Goods Sold      │ 720,000    │ 588,000    │ 510,000    │
│ Gross Profit            │ 480,000    │ 392,000    │ 340,000    │
│ Operating Expenses      │ 240,000    │ 196,000    │ 170,000    │
│ Net Income              │ 240,000    │ 196,000    │ 170,000    │
└─────────────────────────┴────────────┴────────────┴────────────┘
Sheet: P&L (42 rows x 7 columns) | Showing 5 of 42 rows
```

## Why this exists

AI coding agents waste tokens writing disposable Python to inspect spreadsheets. Every time:

```python
# agent generates this, runs it, throws it away
import openpyxl
wb = openpyxl.load_workbook('data.xlsx', data_only=True)
ws = wb.active
for row in ws.iter_rows(max_row=10, values_only=True):
    print(row)
```

That costs ~250 generation tokens + ~0.5-1s of openpyxl startup, and the output is ugly. With this skill, the agent runs `xleak data.xlsx -n 15` instead - zero generation tokens for the command, instant Rust-speed parsing, readable output.

The skill also teaches the agent **token efficiency**: box-drawing output (~690 tokens/5 rows) is great for the first look, but `--export text | head` (~54 tokens/5 rows) is 13x cheaper for subsequent previews.

## Prerequisites

Install xleak (a fast terminal Excel viewer written in Rust):

```bash
brew install bgreenwell/tap/xleak
```

## Installation

### Claude Code

Copy `SKILL.md` to your skills directory:

```bash
# Global (all projects)
mkdir -p ~/.claude/skills/spreadsheet-peek
cp SKILL.md ~/.claude/skills/spreadsheet-peek/

# Project-specific
mkdir -p .claude/skills/spreadsheet-peek
cp SKILL.md .claude/skills/spreadsheet-peek/
```

### Codex / Other agents

Copy `SKILL.md` content into your agent's system prompt, project instructions, or `AGENTS.md` file. The behavioral instructions (when to preview, token efficiency rules, command reference) work with any agent that can run bash commands.

For Codex specifically, add to your `AGENTS.md` or include in the project's instruction file.

### Optional: shell aliases

Add to `~/.zshrc` or `~/.bashrc`:

```bash
alias peek='xleak -n 20 -w 40'
alias peekall='xleak -n 0'
alias peekwide='xleak -n 20 -w 60'
```

## Key features

- **Proactive triggers**: The agent previews spreadsheets automatically before processing, after fixture generation, and when you reference a file
- **Token-aware**: Switches between pretty box-drawing (first look) and compact text export (repeated views) to manage context window cost
- **Multi-sheet**: Automatically previews all relevant sheets in a workbook
- **Format support**: `.xlsx`, `.xls`, `.xlsm`, `.xlsb`, `.ods`, `.csv`
- **Export modes**: Text, CSV, JSON for piping into other tools
- **Formula view**: `--formulas` flag shows formulas instead of computed values

## License

MIT
