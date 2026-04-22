# spreadsheet-peek

> **Stop letting AI agents write throwaway Python just to look at a spreadsheet.**

An agent-agnostic skill that teaches AI coding agents (Claude Code, Codex, Cursor, etc.) to use [`wolfxl peek`](https://crates.io/crates/wolfxl-cli) for instant inline previews of `.xlsx`, `.xlsm`, `.xls`, `.xlsb`, `.ods`, `.csv`, `.tsv`, and comma-delimited `.txt` files - with proactive triggers, token-efficiency rules, readable date/number rendering, and format caveats baked in.

**Before vs after** - a naive agent writes throwaway Python every time; the same agent with `spreadsheet-peek` runs one `wolfxl peek` call:

![contrast demo](assets/contrast.gif)

And here's the styled box-drawing output (run `wolfxl peek file.xlsx`):

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

With `spreadsheet-peek`, the agent runs `wolfxl peek data.xlsx -n 15` instead:
- **Zero generation tokens** for the command (it's a one-liner the agent already knows)
- **Instant Rust-speed parsing** (no openpyxl cold start)
- **Readable output** - dates render as ISO `YYYY-MM-DD`, common currency/percentage formats render in human-facing previews, and numeric cells are grouped for scanning
- **Readable ASCII table** the user can actually read
- **Proactive triggers** - the agent previews before processing, after fixture generation, and when you mention a file path, without being asked

## Token efficiency (the part that's easy to miss)

Box-drawing output looks pretty but costs real tokens. The skill teaches the agent when to switch modes, with measurements taken against three sample shapes: a typical financial workbook (7 columns), a tall ledger (8 columns), and a wide operations dashboard (29 columns).

| Sample | Mode | Command | Tokens (5 data rows) | Tokens/row |
|--------|------|---------|----------------:|-----------:|
| Financials (7 cols) | Box-drawing | `wolfxl peek file -n 5` | 573 | 114.6 |
| Financials (7 cols) | Text export | `wolfxl peek file --export text \| sed -n '1,6p'` | 148 | 29.6 |
| Tall ledger (8 cols) | Box-drawing | `wolfxl peek file -n 5` | 624 | 124.8 |
| Tall ledger (8 cols) | Text export | `wolfxl peek file --export text \| sed -n '1,6p'` | 173 | 34.6 |
| Wide (29 cols)      | Box-drawing | `wolfxl peek file -n 5` | 2,249 | 449.8 |
| Wide (29 cols)      | Text export | `wolfxl peek file --export text \| sed -n '1,6p'` | 754 | 150.8 |

**~3.9x cheaper per row on typical financial shapes, ~3.6x on tall ledgers, ~3.0x on wide tables** - but the *absolute* per-row savings is far larger on wide tables (299 tokens/row saved vs 85-90 on the narrower samples). Measured with `cl100k_base` (GPT-4 tokenizer) against [`examples/sample-financials.xlsx`](examples/sample-financials.xlsx), [`examples/tall-ledger.xlsx`](examples/tall-ledger.xlsx), and [`examples/wide-table.xlsx`](examples/wide-table.xlsx). Reproduce with:

```bash
uv run --with tiktoken --with openpyxl python benchmarks/measure_tokens.py
```

The same benchmark now measures direct delimited inputs separately. A 7-column ledger costs 524 tokens in box mode and 145 tokens as text export for 5 rows across `.csv`, `.tsv`, and comma-delimited `.txt`; the quoted multiline CSV fixture costs 401 and 116 tokens. Those rows live in [`benchmarks/README.md`](benchmarks/README.md#direct-delimited-input-costs) so workbook ratios stay comparable.

Behavioral claims are smoke-tested separately with:

```bash
uv run --with openpyxl python benchmarks/verify_claims.py
```

A single naive 15-row preview of a 29-column workbook already costs ~5,600 tokens - more than four financial-shape previews combined. Over a long agent session, the mode-switch rule is the difference between a context window that survives and one that blows up mid-task. Full methodology in [`benchmarks/`](benchmarks/) and the worked example in [`docs/how-it-works.md`](docs/how-it-works.md).

## Quick start

One-liner (installs `wolfxl-cli` + the skill into `~/.claude/skills/spreadsheet-peek/`):

```bash
curl -fsSL https://raw.githubusercontent.com/wolfiesch/spreadsheet-peek/master/install.sh | sh
```

Or manually:

```bash
cargo install wolfxl-cli
```

Then install the skill for your agent (see [Agent Setup](#agent-setup) below).

## Inline MCP viewer

`spreadsheet-peek` now includes an optional local MCP server and MCP App viewer under [`mcp-app/`](mcp-app/). The viewer is read-only and local-first: it calls the installed `wolfxl` binary, returns structured workbook data, and renders an inline grid with sheet tabs, sticky headers, search, range selection, and a "summarize selected range" action in MCP Apps hosts such as Claude Desktop.

Build and pack the Claude Desktop bundle:

```bash
cd mcp-app
npm install
npm run pack:mcpb
```

The generated bundle lives at `mcp-app/dist/spreadsheet-peek.mcpb`. The same server also backs Claude Code and Codex plugin installs through `.mcp.json`; hosts that do not render MCP Apps still get a structured preview plus readable text from `preview_workbook`.

Host behavior covered by the MCP app tests:

- `open_workbook_viewer` returns a lightweight launcher result and a `ui://spreadsheet-peek/viewer/index.html` resource.
- The inline viewer preserves initial host `tool-input` during the MCP Apps handshake, then calls `preview_workbook` so requested sheets and ranges hydrate into the grid.
- The viewer reports a useful fixed content height to avoid collapsed Claude Desktop embeds, with spreadsheet overflow kept inside the grid scroller.

## Agent Setup

### Claude Desktop

For the full inline grid, install the MCP Bundle after building it:

```bash
cd mcp-app
npm install
npm run pack:mcpb
open dist/spreadsheet-peek.mcpb
```

Claude Desktop needs `wolfxl` installed; the server checks `SPREADSHEET_PEEK_WOLFXL_BIN`, `WOLFXL_BIN`, `~/.cargo/bin/wolfxl`, Homebrew paths, and then `PATH`. Install it with `cargo install wolfxl-cli`.

For manual Claude Desktop smoke tests, ask in natural language instead of asking Claude to call a specific tool name. Example: "Please preview `/absolute/path/to/sample-financials.xlsx`, sheet `P&L`, using Spreadsheet Peek if it is available, and keep the response brief." Direct "call `open_workbook_viewer` with these arguments" prompts can look like tool-injection instructions to the model before the extension is even invoked.

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

Either way, Claude Code auto-invokes the skill based on the frontmatter `description` and `filePattern` triggers. You still need `wolfxl` on your `PATH` - either run the `install.sh` one-liner in Quick Start or `cargo install wolfxl-cli` separately.

### Codex

**Option A - Plugin path:**

Use the bundled `.codex-plugin/` metadata with the root `.mcp.json` when testing or installing as a Codex plugin. Build the server first:

```bash
cd mcp-app
npm install
npm run build
```

The plugin points Codex at `skills/` and the same local MCP preview server. Codex hosts that do not render MCP Apps should still receive structured preview data and readable text fallback output.

**Option B - AGENTS.md skill-only path:**

Codex reads `AGENTS.md` from the repo root. Paste the body of `SKILL.md` into your `AGENTS.md` under a `## Spreadsheet Previews` heading, or add:

```markdown
## Spreadsheet Previews

When the user references a spreadsheet or delimited table file, or when about
to run a data pipeline that reads one, preview it first with `wolfxl peek`:

    wolfxl peek <file> -n 15

For large files or repeat previews in the same conversation, use the
token-efficient mode:

    wolfxl peek <file> --export text | sed -n '1,20p'

Direct preview works for `.xlsx`, `.xlsm`, `.xls`, `.xlsb`, `.ods`, `.csv`,
`.tsv`, and comma-delimited `.txt` files with `wolfxl-cli >= 0.8.0`:

    wolfxl peek data.csv -n 15
    wolfxl peek workbook.xlsb -n 15

For custom delimiters, non-UTF-8 encodings, raw dimension checks, or older
installed `wolfxl` binaries, use SKILL.md#delimited-file-notes and
SKILL.md#legacy-workbook-notes for the full decision tree.

Full skill reference: https://github.com/wolfiesch/spreadsheet-peek
```

### Cursor / Continue / Aider / Other agents

See [docs/agent-setup.md](docs/agent-setup.md) for detailed per-agent instructions. The pattern is the same across all of them: paste the body of `SKILL.md` into whatever mechanism your agent uses for persistent instructions.

### Shell aliases (optional, for humans too)

```bash
# Add to ~/.zshrc or ~/.bashrc
alias peek='wolfxl peek -n 20 -w 40'
alias peekall='wolfxl peek -n 0'
alias peekwide='wolfxl peek -n 20 -w 60'
```

## Deep dive

For the full technical rationale (why proactive triggers, how the token math works at scale, and how to extend the pattern to PDFs, SQL, and Parquet), read [`docs/how-it-works.md`](docs/how-it-works.md).

## FAQ

**Why a skill instead of an MCP server?**
The skill remains the portable behavior layer: it teaches agents when to preview and how to control token cost. The MCP server is now the richer UI layer for hosts that can render MCP Apps. Use the viewer when available; use terminal `wolfxl peek` everywhere else.

**Why not `pandas.read_excel()` or `openpyxl` directly?**
Speed and tokens. `openpyxl` cold-start is 0.5-1s before it reads a byte; `wolfxl peek` is instantaneous. Box-drawing output costs about 3-4x more tokens per row than `wolfxl peek --export text` for the same preview slice, while tuple dumps are harder for the user to read. The skill includes a Python fallback for sandboxed agents that can't shell out, but it's the fallback, not the default.

**What about agents that can't execute shell commands?**
The skill's "Python fallback" section (`SKILL.md`) covers this: `openpyxl` + `tabulate` produces a similar box-drawing table. Token costs are higher and startup is slower, but the output shape matches so the agent can keep its downstream reasoning identical.

**Does this actually work with CSV?**
Yes. `wolfxl-cli 0.8.0` reads `.csv`, `.tsv`, and comma-delimited `.txt` files directly. The skill still documents `mlr` / `csvlook` fallbacks for custom delimiters, non-UTF-8 encodings, dimension checks, and older installed binaries. See the [Delimited File Notes](SKILL.md#delimited-file-notes) section.

**Windows support?**
`wolfxl-cli` is available on macOS, Linux, and Windows via `cargo install wolfxl-cli` (requires a Rust toolchain). The skill itself is platform-agnostic (it's a markdown file). The optional shell fallback recipes use POSIX utilities - on Windows use WSL, Git Bash, or substitute PowerShell equivalents (`Get-Content -TotalCount 15`, `Import-Csv | Format-Table`, etc.) in your shell config.

**Will this bloat my context window with a giant system prompt?**
`SKILL.md` is ~9.5 KB. Claude Code loads it on-demand only when a trigger fires (file pattern match, bash pattern match, or description relevance), so a session that never touches a spreadsheet pays zero cost. Other agents that paste it into a static system prompt pay the ~9.5 KB once per conversation - a fraction of what a single wide box-drawing preview can cost.

## What's in the skill

[`SKILL.md`](SKILL.md) covers:

- **Proactive triggers** - the 5 moments when the agent should preview without being asked
- **Skip rules** - when *not* to preview (already shown, enormous files, user opted out)
- **Token economy** - box-drawing vs text export tradeoff with measured numbers
- **MCP viewer preference** - when to call the richer local viewer tools before falling back to terminal output
- **Multi-sheet workflow** - how to navigate workbooks with multiple tabs efficiently
- **Command reference** - full `wolfxl peek` flag cheat sheet (sheets, columns, exports)
- **Format caveats** - direct support boundaries plus fallback recipes for custom CSVs, old `wolfxl` binaries, or high-fidelity legacy styling
- **Python fallback** - openpyxl + tabulate snippet for when `wolfxl` isn't available
- **Output interpretation** - how to read `wolfxl peek`'s header lines and truncation warnings

## Compatibility

| Agent | Support | Install path |
|-------|---------|--------------|
| Claude Desktop | MCPB + MCP App viewer | `mcp-app/dist/spreadsheet-peek.mcpb` |
| Claude Code | Native (SKILL.md format) | `~/.claude/skills/spreadsheet-peek/` |
| Codex | Plugin / AGENTS.md | `.codex-plugin/` or paste content into `AGENTS.md` |
| Cursor | Via system prompt | Paste into custom instructions |
| Continue | Via system prompt | Paste into custom instructions |
| Any CLI agent | Via system prompt | Any markdown-readable config |

## File formats supported

**Direct `wolfxl peek` path (`wolfxl-cli >= 0.8.0`)**: `.xlsx` · `.xlsm` · `.xls` · `.xlsb` · `.ods` · `.csv` · `.tsv` · comma-delimited `.txt`

**Caveats**: formatting fidelity is strongest for `.xlsx` / `.xlsm`. Legacy workbook formats and delimited files are value-first previews with limited style metadata. See [Delimited File Notes](SKILL.md#delimited-file-notes) and [Legacy Workbook Notes](SKILL.md#legacy-workbook-notes) for the fallback decision tree.

## Try it

```bash
git clone https://github.com/wolfiesch/spreadsheet-peek
cd spreadsheet-peek
wolfxl peek examples/sample-financials.xlsx -n 10
```

## Credits

- [`wolfxl-cli`](https://crates.io/crates/wolfxl-cli) and [`wolfxl-core`](https://crates.io/crates/wolfxl-core) - the Rust crates that do the parsing and rendering. Source: [github.com/SynthGL/wolfxl](https://github.com/SynthGL/wolfxl). Built on [`calamine-styles`](https://crates.io/crates/calamine-styles) for number-format-aware cell extraction.

## Contributing

Issues and PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
