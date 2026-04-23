# Agent Setup Guide

Detailed installation for each AI coding agent. If your agent isn't listed, the pattern is the same: install `wolfxl-cli` and paste the content of `SKILL.md` into whatever mechanism your agent uses for persistent system instructions.

## Verification status

Each agent below carries a badge indicating how the integration was confirmed.

| Badge | Meaning |
|-------|---------|
| ✅ **Verified** | Skill was loaded into a live session of that agent and the expected behavior was observed directly. Date shown is the last-verified date. |
| 📖 **Documented** | Install steps follow the agent's published configuration docs, but were not personally round-tripped on real hardware. Works in principle; please open an issue if you hit problems. |

Badges get re-dated whenever the skill, the agent, or the agent's instruction-loading mechanism changes meaningfully.

## Table of contents

- [Claude Code](#claude-code) ✅ Verified 2026-04-19
- [Claude Desktop](#claude-desktop-mcp-viewer) ✅ Verified 2026-04-22
- [Codex](#codex) ✅ Verified 2026-04-23 for MCP tools; inline viewer UI unverified
- [Cursor](#cursor) 📖 Documented
- [Continue](#continue) 📖 Documented
- [Aider](#aider) 📖 Documented
- [Generic / any agent](#generic)

---

## Claude Desktop MCP Viewer

> ✅ **Verified 2026-04-22** - The local MCP Bundle installed in Claude Desktop, `open_workbook_viewer` rendered `examples/sample-financials.xlsx` inline, and the viewer showed sheet tabs plus the spreadsheet grid. The current automated browser tests also simulate MCP Apps host sizing, initial `tool-input`, proxied `preview_workbook`, and `tool-result` hydration.

Claude Desktop is the recommended path for the full inline spreadsheet grid. Build the bundled MCP server and viewer:

```bash
cd mcp-app
npm install
npm run pack:mcpb
open dist/spreadsheet-peek.mcpb
```

The bundle exposes two tools:

- `preview_workbook` returns a bounded structured preview plus readable text fallback output.
- `open_workbook_viewer` opens the MCP App grid with sheet tabs, sticky headers, search, range selection, and a selected-range handoff to the model.

Prerequisite: `wolfxl` must be on `PATH`:

```bash
cargo install wolfxl-cli --version 0.8.0 --force
```

Use absolute file paths in Claude Desktop requests so the local server resolves the same file the conversation references. For manual smoke tests, ask naturally instead of instructing the model to call an exact tool:

```text
Please preview /absolute/path/to/sample-financials.xlsx, sheet P&L, using Spreadsheet Peek if it is available. Keep the response brief and show the inline viewer if available.
```

Direct prompts such as "call `open_workbook_viewer` with path ..." can be treated as suspicious tool-instruction text before the Spreadsheet Peek extension is invoked.

The viewer should open on the requested sheet when the host supplies `sheet` in the tool input. If the host cannot render MCP Apps, the same tools still return structured preview data and readable text fallback output.

---

## Claude Code

> ✅ **Verified 2026-04-22** - Skill loads from `~/.claude/skills/spreadsheet-peek/SKILL.md` in an active Claude Code session; frontmatter description and `filePattern`/`bashPattern` triggers are recognized by the skills index. The plugin install was round-tripped against the `wolfie-tools` marketplace in a clean temp home without GitHub SSH keys; the v2.2.0 MCP server path is documented here and should be round-tripped before marking it verified.

Claude Code has two install paths: a **plugin** (recommended, one command, versioned, easy to uninstall) and a **skill-only** install (no plugin machinery, just a SKILL.md in the skills directory). Both end up with the skill active; pick whichever fits your setup.

**Prerequisites (both paths):** `wolfxl-cli` on `PATH`. Install with `cargo install wolfxl-cli` (requires a Rust toolchain). Verify with `wolfxl --version`.

**Option A - Plugin install (recommended):**

```bash
/plugin marketplace add wolfiesch/spreadsheet-peek
/plugin install spreadsheet-peek@wolfie-tools
```

The first command registers the `wolfie-tools` marketplace defined in `.claude-plugin/marketplace.json`. The second installs the `spreadsheet-peek` plugin from it - which in turn reads `.claude-plugin/plugin.json`, loads the skill from `skills/spreadsheet-peek/SKILL.md`, and can start the local MCP server declared in `.mcp.json` after `mcp-app` has been built.

Uninstall:

```bash
/plugin uninstall spreadsheet-peek@wolfie-tools
```

Update (after publishing a new release):

```bash
/plugin marketplace update wolfie-tools
```

**Option B - Skill-only install (global, all projects):**

```bash
mkdir -p ~/.claude/skills/spreadsheet-peek
curl -fsSL https://raw.githubusercontent.com/wolfiesch/spreadsheet-peek/master/SKILL.md \
  -o ~/.claude/skills/spreadsheet-peek/SKILL.md
```

**Option C - Skill-only install (project-specific):**

```bash
# From your project root
mkdir -p .claude/skills/spreadsheet-peek
curl -fsSL https://raw.githubusercontent.com/wolfiesch/spreadsheet-peek/master/SKILL.md \
  -o .claude/skills/spreadsheet-peek/SKILL.md
```

**Verify it's loaded:**

Start a new session and ask Claude: "What skills do you have available?" The spreadsheet-peek skill should appear. You can also reference a `.xlsx` file and the skill should auto-trigger.

**Keep it updated (skill-only paths):**

```bash
curl -fsSL https://raw.githubusercontent.com/wolfiesch/spreadsheet-peek/master/SKILL.md \
  -o ~/.claude/skills/spreadsheet-peek/SKILL.md
```

Plugin installs update via `/plugin update spreadsheet-peek`.

---

## Codex

> ✅ **Verified 2026-04-23 for MCP tool calls; inline viewer UI still unverified** - `codex plugin marketplace add /path/to/spreadsheet-peek` and app-server plugin install were round-tripped locally with Codex CLI `0.123.0`. After install, `codex mcp list` exposed enabled `spreadsheet-peek`; app-server reported `preview_workbook`, `open_workbook_viewer`, and the `ui://spreadsheet-peek/viewer/index.html` resource with `text/html;profile=mcp-app`; a read-only `codex exec` smoke called `preview_workbook` against `examples/sample-financials.xlsx` and returned the sheet list. A second smoke called `open_workbook_viewer` and returned the viewer resource link, but the `codex exec` transcript did not render inline HTML. Visible inline rendering in Codex Desktop remains unverified, so do not mark Codex as a full inline-viewer host until the desktop UI renders the MCP App iframe.

**Option A - Codex plugin path:**

Use `.codex-plugin/plugin.json` plus the root `.mcp.json` to package the skill and MCP preview server together. Build the server before installing or testing the plugin locally:

```bash
cd mcp-app
npm install
npm run build
```

Codex hosts that do not render MCP Apps should still receive the structured preview and readable text from `preview_workbook`. Treat the `ui://spreadsheet-peek/viewer/index.html` resource as exposed in Codex, but keep Codex Desktop inline iframe rendering marked unverified until the desktop UI itself is inspected.

**Option B - AGENTS.md skill-only path:**

Codex reads `AGENTS.md` from the repo root as its persistent instructions. Add a section for spreadsheet-peek:

```bash
# From your project root
cat >> AGENTS.md << 'EOF'

## Spreadsheet Previews (spreadsheet-peek)

Prerequisites: `cargo install wolfxl-cli`

When the user references a spreadsheet or delimited table file, or when about
to run a data pipeline or script that reads one, preview the file first with
`wolfxl peek` before doing anything else:

    wolfxl peek <file> -n 15

For large files or repeat previews in the same conversation, switch to the
token-efficient mode:

    wolfxl peek <file> --export text | sed -n '1,20p'

For multi-sheet workbooks, preview each relevant sheet:

    wolfxl peek <file> --sheet "Balance Sheet" -n 15

Direct preview works for `.xlsx`, `.xlsm`, `.xls`, `.xlsb`, `.ods`, `.csv`,
`.tsv`, and comma-delimited `.txt` files with `wolfxl-cli >= 0.8.0`:

    wolfxl peek data.csv -n 15
    wolfxl peek workbook.xlsb -n 15

For custom delimiters, non-UTF-8 encodings, raw dimension checks, or older
installed `wolfxl` binaries, use SKILL.md#delimited-file-notes and
SKILL.md#legacy-workbook-notes for the full decision tree.

Never write disposable Python just to view a supported spreadsheet or
delimited table. Use `wolfxl peek` for a readable preview first.

Full skill reference: https://github.com/wolfiesch/spreadsheet-peek
EOF
```

Or copy the full `SKILL.md` content if you want the complete trigger rules and fallback patterns:

```bash
curl -fsSL https://raw.githubusercontent.com/wolfiesch/spreadsheet-peek/master/SKILL.md \
  >> AGENTS.md
```

---

## Cursor

> 📖 **Documented** - Install steps below follow Cursor's published Rules for AI and `.cursor/rules/` docs. Not personally round-tripped. PRs with a verification screenshot welcome.

Cursor uses "Rules for AI" (Settings → General → Rules for AI) for persistent instructions. Paste the body of `SKILL.md` (everything after the YAML frontmatter) into that box.

Or use project-level rules:

```bash
# From your project root
mkdir -p .cursor
curl -fsSL https://raw.githubusercontent.com/wolfiesch/spreadsheet-peek/master/SKILL.md \
  -o .cursor/rules/spreadsheet-peek.md
```

Cursor will pick up markdown files in `.cursor/rules/` automatically.

---

## Continue

> 📖 **Documented** - Based on Continue's published `config.json` `systemMessage` field. Not personally round-tripped.

Continue uses `~/.continue/config.json`. Add a `systemMessage` entry or append to an existing one:

```json
{
  "models": ["..."],
  "systemMessage": "When the user references a spreadsheet or delimited table file (.xlsx, .xlsm, .xls, .xlsb, .ods, .csv, .tsv, or comma-delimited .txt), preview it with `wolfxl peek <file> -n 15` before discussing it. For repeat previews, use `wolfxl peek <file> --export text | sed -n '1,20p'` to save tokens and avoid broken-pipe warnings. Use the documented fallbacks only for custom delimiters, non-UTF-8 encodings, raw dimension checks, high-fidelity legacy styling, or older installed wolfxl binaries. Never write Python just to inspect a supported spreadsheet or delimited table. Full reference: https://github.com/wolfiesch/spreadsheet-peek"
}
```

---

## Aider

> 📖 **Documented** - Based on Aider's published `.aider.conf.yml` `read:` mechanism. Not personally round-tripped.

Aider reads `.aider.conf.yml` for configuration. Set `instructions` pointing to a file:

```yaml
# .aider.conf.yml
read:
  - SKILL.md
```

Then copy `SKILL.md` to your repo root or reference the raw GitHub URL.

---

## Generic

For any agent that supports persistent system instructions (system prompt, rules file, custom instructions, etc.), the pattern is the same:

1. Ensure `wolfxl-cli` is installed: `cargo install wolfxl-cli`
2. Copy the body of `SKILL.md` into your agent's persistent instruction mechanism
3. Start a new session - the agent will now know to use `wolfxl peek` proactively

The behavioral rules in `SKILL.md` are written in agent-neutral language. Any agent that can execute shell commands can apply them.

---

## Troubleshooting

### The agent still writes Python to inspect spreadsheets

- Verify the skill is actually loaded (in Claude Code: ask "what skills do you have?")
- Check that `wolfxl` is in the agent's `PATH` - some agents run commands in a restricted shell
- The proactive triggers in `SKILL.md` assume the agent reads the full skill body, not just the description - make sure you pasted the whole file, not just the frontmatter

### `wolfxl` command not found

```bash
cargo install wolfxl-cli
which wolfxl   # should print ~/.cargo/bin/wolfxl
```

If you don't have a Rust toolchain, install it via [rustup.rs](https://rustup.rs) first. Prebuilt binaries are tracked in [the wolfxl repo](https://github.com/SynthGL/wolfxl/releases) once they ship; until then, `cargo install` is the canonical path on macOS, Linux, and Windows.

### The agent uses box-drawing mode everywhere and eats context

The token-efficiency rule in `SKILL.md` instructs the agent to switch to `--export text | sed -n '1,Np'` after the first preview. If this isn't happening, your agent may be using only the description/frontmatter of the skill, not the full body. Re-check the install - the full SKILL.md content needs to be in the agent's context.
