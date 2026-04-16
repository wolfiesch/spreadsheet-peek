# spreadsheet-peek

> **Stop letting AI agents write throwaway Python just to look at a spreadsheet.**

An agent-agnostic skill that teaches AI coding agents (Claude Code, Codex, Cursor, etc.) to use [`xleak`](https://github.com/bgreenwell/xleak) for instant inline previews of Excel/CSV files - with proactive triggers and token-efficiency rules baked in.

![demo](examples/demo.gif)

## Why this exists

Without this skill, every agent reinvents spreadsheet inspection the same way:

```python
# generated on-the-fly, run once, thrown away
import openpyxl
wb = openpyxl.load_workbook('data.xlsx', data_only=True)
ws = wb.active
for row in ws.iter_rows(max_row=10, values_only=True):
    print(row)
```

That's ~250 generation tokens + ~0.5-1s of openpyxl startup + ugly tuple-dump output. Every. Single. Time.

With `spreadsheet-peek`, the agent runs `xleak data.xlsx -n 15` instead:
- **Zero generation tokens** for the command (it's a one-liner the agent already knows)
- **Instant Rust-speed parsing** (no openpyxl cold start)
- **Readable ASCII table output** the user can actually read
- **Proactive triggers** - the agent previews before processing, after fixture generation, and when you mention a file path, without being asked

## Token efficiency (the part that's easy to miss)

Box-drawing output looks pretty but costs real tokens. The skill teaches the agent when to switch modes:

| Mode | Command | Tokens (5 rows) | Tokens/row | When to use |
|------|---------|-----------------|------------|-------------|
| **Box-drawing** | `xleak file -n 5` | 593 | 118.6 | First preview, readability matters |
| **Text export** | `xleak file --export text \| head -5` | 117 | 23.4 | Repeated previews, large files, long conversations |

**~5x cheaper** for the text-export path, measured with `cl100k_base` (GPT-4 tokenizer) on [`examples/sample-financials.xlsx`](examples/sample-financials.xlsx). Reproduce with:

```bash
uv run --with tiktoken python benchmarks/measure_tokens.py
```

Over a long agent session with dozens of spreadsheet inspections, this is the difference between a context window that survives and one that blows up mid-task. Full methodology in [`benchmarks/`](benchmarks/) and the worked example in [`docs/how-it-works.md`](docs/how-it-works.md).

## Quick start

One-liner (installs `xleak` + the skill into `~/.claude/skills/spreadsheet-peek/`):

```bash
curl -fsSL https://raw.githubusercontent.com/wolfiesch/spreadsheet-peek/master/install.sh | sh
```

Or manually:

```bash
brew install bgreenwell/tap/xleak
```

Then install the skill for your agent (see [Agent Setup](#agent-setup) below).

## Agent Setup

### Claude Code (Skills)

```bash
# Global - available in all projects
mkdir -p ~/.claude/skills/spreadsheet-peek
curl -fsSL https://raw.githubusercontent.com/wolfiesch/spreadsheet-peek/master/SKILL.md \
  -o ~/.claude/skills/spreadsheet-peek/SKILL.md

# Or project-specific
mkdir -p .claude/skills/spreadsheet-peek
cp SKILL.md .claude/skills/spreadsheet-peek/
```

Claude Code auto-invokes skills based on the frontmatter `description` and `filePattern` triggers.

### Codex (AGENTS.md)

Codex reads `AGENTS.md` from the repo root. Paste the body of `SKILL.md` into your `AGENTS.md` under a `## Spreadsheet Previews` heading, or add:

```markdown
## Spreadsheet Previews

When the user references a `.xlsx`, `.csv`, or `.ods` file, or when about to
run a data pipeline, preview the file first with xleak:

    xleak <file> -n 15

For large files or repeat previews in the same conversation, use the
token-efficient mode:

    xleak <file> --export text | head -20

Full skill reference: https://github.com/wolfiesch/spreadsheet-peek
```

### Cursor / Continue / Aider / Other agents

See [docs/agent-setup.md](docs/agent-setup.md) for detailed per-agent instructions. The pattern is the same across all of them: paste the body of `SKILL.md` into whatever mechanism your agent uses for persistent instructions.

### Shell aliases (optional, for humans too)

```bash
# Add to ~/.zshrc or ~/.bashrc
alias peek='xleak -n 20 -w 40'
alias peekall='xleak -n 0'
alias peekwide='xleak -n 20 -w 60'
```

## Deep dive

For the full technical rationale (why proactive triggers, how the token math works at scale, and how to extend the pattern to PDFs, SQL, and Parquet), read [`docs/how-it-works.md`](docs/how-it-works.md). The embedded screencast also walks through xleak's interactive TUI mode, which most users miss.

## What's in the skill

[`SKILL.md`](SKILL.md) covers:

- **Proactive triggers** - the 5 moments when the agent should preview without being asked
- **Skip rules** - when *not* to preview (already shown, enormous files, user opted out)
- **Token economy** - box-drawing vs text export tradeoff with measured numbers
- **Multi-sheet workflow** - how to navigate workbooks with multiple tabs efficiently
- **Command reference** - full xleak flag cheat sheet (sheets, columns, formulas, exports)
- **Python fallback** - openpyxl + tabulate snippet for when xleak isn't available
- **Output interpretation** - how to read xleak's header lines and truncation warnings

## Compatibility

| Agent | Support | Install path |
|-------|---------|--------------|
| Claude Code | Native (SKILL.md format) | `~/.claude/skills/spreadsheet-peek/` |
| Codex | Via AGENTS.md | Paste content into `AGENTS.md` |
| Cursor | Via system prompt | Paste into custom instructions |
| Continue | Via system prompt | Paste into custom instructions |
| Any CLI agent | Via system prompt | Any markdown-readable config |

## File formats supported

`.xlsx` · `.xls` · `.xlsm` · `.xlsb` · `.ods` · `.csv`

## Try it

```bash
git clone https://github.com/wolfiesch/spreadsheet-peek
cd spreadsheet-peek
xleak examples/sample-financials.xlsx -n 10
```

## Credits

- [`xleak`](https://github.com/bgreenwell/xleak) by [@bgreenwell](https://github.com/bgreenwell) - the Rust binary that does the actual parsing. This skill is a behavioral wrapper; xleak does the hard work.
- [`vex-tui`](https://github.com/CodeOne45/vex) - companion interactive TUI editor if you want to hand-edit spreadsheets (for humans, not agents).

## Contributing

Issues and PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
