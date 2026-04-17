# spreadsheet-peek

> **Stop letting AI agents write throwaway Python just to look at a spreadsheet.**

An agent-agnostic skill that teaches AI coding agents (Claude Code, Codex, Cursor, etc.) to use [`xleak`](https://github.com/bgreenwell/xleak) for instant inline previews of Excel-family spreadsheets - with proactive triggers, token-efficiency rules, and a CSV fallback baked in.

**Before vs after** - a naive agent writes throwaway Python every time; the same agent with `spreadsheet-peek` runs one `xleak` call:

![contrast demo](assets/contrast.gif)

And here is the interactive TUI mode most users miss (run `xleak file.xlsx` with no flags):

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

Box-drawing output looks pretty but costs real tokens. The skill teaches the agent when to switch modes, with measurements taken against two sample shapes: a typical financial workbook (7 columns) and a wide operations dashboard (29 columns).

| Sample | Mode | Command | Tokens (5 rows) | Tokens/row |
|--------|------|---------|----------------:|-----------:|
| Financials (7 cols) | Box-drawing | `xleak file -n 5` | 593 | 118.6 |
| Financials (7 cols) | Text export | `xleak file --export text \| head -5` | 117 | 23.4 |
| Wide (29 cols)      | Box-drawing | `xleak file -n 5` | 2,263 | 452.6 |
| Wide (29 cols)      | Text export | `xleak file --export text \| head -5` | 632 | 126.4 |

**~5x cheaper per row on typical shapes, ~3.6x on wide tables** - but the *absolute* per-row savings is far larger on wide tables (326 tokens/row vs 95). Measured with `cl100k_base` (GPT-4 tokenizer) against [`examples/sample-financials.xlsx`](examples/sample-financials.xlsx) and [`examples/wide-table.xlsx`](examples/wide-table.xlsx). Reproduce with:

```bash
uv run --with tiktoken --with openpyxl python benchmarks/measure_tokens.py
```

A single naive 15-row preview of a 29-column workbook already costs ~5,600 tokens - more than four financial-shape previews combined. Over a long agent session, the mode-switch rule is the difference between a context window that survives and one that blows up mid-task. Full methodology in [`benchmarks/`](benchmarks/) and the worked example in [`docs/how-it-works.md`](docs/how-it-works.md).

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

### Claude Code

**Option A - Plugin install (recommended):**

```bash
/plugin marketplace add wolfiesch/spreadsheet-peek
/plugin install spreadsheet-peek@wolfie-tools
```

First line registers this repo's marketplace (`wolfie-tools`, defined in `.claude-plugin/marketplace.json`); second line installs the `spreadsheet-peek` plugin from it. Benefits: versioned, auto-updates via `/plugin marketplace update`, uninstall via `/plugin uninstall spreadsheet-peek@wolfie-tools`.

**Option B - Skill-only install (no plugin):**

```bash
# Global - available in all projects
mkdir -p ~/.claude/skills/spreadsheet-peek
curl -fsSL https://raw.githubusercontent.com/wolfiesch/spreadsheet-peek/master/SKILL.md \
  -o ~/.claude/skills/spreadsheet-peek/SKILL.md

# Or project-specific
mkdir -p .claude/skills/spreadsheet-peek
cp SKILL.md .claude/skills/spreadsheet-peek/
```

Either way, Claude Code auto-invokes the skill based on the frontmatter `description` and `filePattern` triggers. You still need `xleak` on your `PATH` - either run the `install.sh` one-liner in Quick Start or `brew install bgreenwell/tap/xleak` separately.

### Codex (AGENTS.md)

Codex reads `AGENTS.md` from the repo root. Paste the body of `SKILL.md` into your `AGENTS.md` under a `## Spreadsheet Previews` heading, or add:

```markdown
## Spreadsheet Previews

When the user references a `.xlsx`, `.xls`, `.xlsm`, `.xlsb`, or `.ods`
file, or when about to run a data pipeline that reads one, preview it
first with xleak:

    xleak <file> -n 15

For large files or repeat previews in the same conversation, use the
token-efficient mode:

    xleak <file> --export text | head -20

For `.csv` files, xleak doesn't read them directly. For simple CSVs:

    head -15 file.csv | column -s, -t

If the CSV has quoted commas, embedded newlines, or a UTF-8 BOM,
`column -s, -t` will mis-render it. Use a CSV-aware tool instead:

    mlr --icsv --opprint head -n 15 file.csv   # or: csvlook file.csv

See SKILL.md#csv-fallback for the full decision tree.

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

## FAQ

**Why a skill instead of an MCP server?**
An MCP server is a long-running process with its own install, auth, and schema surface. The skill is one markdown file that teaches the agent a shell command it can already run. If `xleak` grows features that benefit from structured responses (pagination tokens, typed schema), an MCP wrapper becomes interesting. Today it would just be a layer of indirection over `xleak <file>`.

**Why not `pandas.read_excel()` or `openpyxl` directly?**
Speed and tokens. `openpyxl` cold-start is 0.5-1s before it reads a byte; `xleak` is instantaneous. Tuple-dump output also costs 4-5x more tokens per row than `xleak --export text` for the same information, and is harder for the user to read. The skill includes a Python fallback for sandboxed agents that can't shell out, but it's the fallback, not the default.

**What about agents that can't execute shell commands?**
The skill's "Python fallback" section (`SKILL.md`) covers this: `openpyxl` + `tabulate` produces a similar box-drawing table. Token costs are higher and startup is slower, but the output shape matches so the agent can keep its downstream reasoning identical.

**Does this actually work with CSV?**
`xleak 0.2.5` does not read CSV directly - it's Excel-family (`.xlsx`, `.xls`, `.xlsm`, `.xlsb`, `.ods`). The skill handles CSV through a shell fallback (`head`, `column -s, -t`, `mlr`, `csvlook`) and the frontmatter still triggers on `.csv` paths so the agent knows to reach for the right tool. See the [CSV Fallback](SKILL.md#csv-fallback) section.

**Windows support?**
`xleak` is available on macOS, Linux, and Windows through two paths: prebuilt binaries from the [xleak GitHub releases page](https://github.com/bgreenwell/xleak/releases), or `cargo install xleak` for a source build (requires a Rust toolchain). Homebrew is the easiest path on macOS/Linux via the `bgreenwell/tap` tap; on Windows, grab the release binary and add it to `PATH`. The skill itself is platform-agnostic (it's a markdown file). The CSV fallback uses `head` and `column`, which are POSIX utilities - on Windows use WSL, Git Bash, or substitute PowerShell equivalents (`Get-Content -TotalCount 15`, `Import-Csv | Format-Table`, etc.) in your shell config.

**Will this bloat my context window with a giant system prompt?**
`SKILL.md` is ~6.7 KB. Claude Code loads it on-demand only when a trigger fires (file pattern match, bash pattern match, or description relevance), so a session that never touches a spreadsheet pays zero cost. Other agents that paste it into a static system prompt pay the 6.7 KB once per conversation - a fraction of what a single naive box-drawing preview costs.

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

**Excel-family (via xleak)**: `.xlsx` · `.xls` · `.xlsm` · `.xlsb` · `.ods`

**CSV**: Handled via a shell fallback (`head`, `column -s, -t`, `mlr`, `csvkit`) rather than xleak - xleak 0.2.5 doesn't read CSV directly. The skill teaches agents the right command to reach for. See the [CSV Fallback section of `SKILL.md`](SKILL.md#csv-fallback).

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
