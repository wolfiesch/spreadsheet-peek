# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo actually is

`spreadsheet-peek` is **not a traditional code project**. The primary shipped artifact is `SKILL.md`, which teaches AI coding agents to use Spreadsheet Peek for inline spreadsheet previews. The optional MCP package in `mcp-app/` is now the richer viewer surface for hosts that render MCP Apps, while `wolfxl peek` remains the portable terminal fallback. Everything else in the tree - the Python benchmarks, the installer, the sample workbooks, the CI, and the MCP app tests - exists to keep those behavior and packaging claims honest.

When you edit this repo, you are usually editing agent behavior. Treat `SKILL.md` as the product.

## Repository layout (the "why", not the "what")

- **`SKILL.md`** - the product. YAML frontmatter (`name`, `description`, `filePattern`, `bashPattern`) is what agents index on; the body is what gets loaded into context at invocation time. Keep it under ~10 KB of prose - every line is verbatim context for the host agent.
- **`mcp-app/`** - optional Node/TypeScript MCP server plus MCP App viewer. It exposes read-only `preview_workbook` and `open_workbook_viewer` tools, calls the installed `wolfxl` binary, returns structured preview data plus SVG fallback images, and builds a single-file HTML viewer for Claude Desktop-style hosts. Built `dist/server.js` and `dist/viewer/index.html` are committed so plugin installs have a ready-to-run server.
- **`.mcp.json`** - local MCP server declaration shared by Claude Code and Codex-style plugin installs. It should keep using the Node launcher path in `mcp-app/bin/run-server.mjs`, which resolves plugin-root environment variables before falling back to the repository-relative path.
- **`.claude-plugin/plugin.json`** - Claude Code plugin manifest. Enables `/plugin install spreadsheet-peek@wolfie-tools` after the marketplace is added. The `skills/spreadsheet-peek/SKILL.md` path is a **symlink** to the repo-root `SKILL.md` (single source of truth - edit the root file, never the symlinked copy). Version field here should track `SKILL.md`'s frontmatter version.
- **`.claude-plugin/marketplace.json`** - the `wolfie-tools` marketplace definition. `version` and `description` here also track `SKILL.md`'s frontmatter; updating SKILL.md's `version` in lockstep is part of the release checklist.
- **`.codex-plugin/plugin.json`** / **`.codex-plugin/marketplace.json`** - Codex plugin packaging metadata. Codex support should be treated as structured preview and fallback visual output until inline MCP App rendering is verified in the host.
- **`README.md`** / **`docs/how-it-works.md`** - user-facing rationale. Cites numeric claims (e.g. "~3.9x cheaper") that must match what `benchmarks/measure_tokens.py` actually prints.
- **`benchmarks/measure_tokens.py`** - the arbiter for token-cost claims. Uses `tiktoken`'s `cl100k_base` encoding as a Claude proxy. Runs against `examples/sample-financials.xlsx` (7 cols), `examples/tall-ledger.xlsx` (8 cols), and `examples/wide-table.xlsx` (29 cols) so ratios are characterized across workbook topology, not just one shape.
- **`benchmarks/verify_claims.py`** - smoke-checks non-token claims: direct preview for `.xlsx`, `.xlsm`, `.xls`, `.xlsb`, `.ods`, `.csv`, `.tsv`, and `.txt`; Balance Sheet date rendering; currency/percentage rendering; `sed` pipe hygiene; and `agent --max-tokens`.
- **`examples/generate_sample.py`** / **`examples/generate_wide_table.py`** / **`examples/generate_tall_ledger.py`** / **`examples/generate_delimited_samples.py`** / **`examples/generate_messy_csv.py`** - deterministic sample generators. Commit the regenerated files alongside generator changes; the benchmark and delimited-format docs pin to them.
- **`scripts/record_contrast.tape`** + **`scripts/naive_preview.py`** - the "why this exists" contrast GIF (openpyxl tuple dump vs `wolfxl peek`). The naive script is a pedagogical artifact - it is *supposed* to look like throwaway agent code, so keep it minimal.
- **`examples/demo.tape`** / **`scripts/record_screencast.tape`** - VHS tape scripts for reproducible GIF/screencast regeneration.
- **`install.sh`** - POSIX `sh` installer. Runs compatibility-checked `cargo install --force wolfxl-cli` (single path on macOS, Linux, and Windows in v2.0.0 - homebrew tap is sprint-2 backlog), then drops `SKILL.md` into `~/.claude/skills/spreadsheet-peek/`. Must stay clean under `shellcheck -o all`; uses `mktemp` + `trap` for atomic SKILL.md download.
- **`.github/workflows/benchmark.yml`** - runs `measure_tokens.py` on PR branch and master, posts (or updates) a single drift comment if output differs. `WOLFXL_CLI_VERSION` is pinned in the workflow env (currently `0.8.0`) and read from each checkout so CLI bump PRs compare the proposed PR binary against the current master baseline.
- **`docs/agent-setup.md`** - per-agent install instructions. Verification badges (✅ Verified vs 📖 Documented) distinguish personally round-tripped integrations from spec-only ones.

## The four load-bearing invariants

1. **Agent-agnostic `SKILL.md`.** No Claude Code-only or Codex-only features in the body. Frontmatter is the only place host-specific triggers live. If you add a feature that only works in one host, document it outside the skill body.
2. **Numeric claims match the benchmark.** If you change `SKILL.md`, `README.md`, `benchmarks/README.md`, or `docs/how-it-works.md` in ways that touch the token-cost table (~3.9x ratio on financials, ~3.6x on tall ledger, ~3.0x on wide; 114.6 tokens/row box-drawing, 29.6 tokens/row text export on the 7-column financials sample), rerun `measure_tokens.py` and update all four sources, or CI will flag drift.
3. **`wolfxl-cli` version pin in CI.** The `WOLFXL_CLI_VERSION` env in `.github/workflows/benchmark.yml` must point at a real published crates.io version. The workflow resolves that value from both the PR checkout and the master checkout, so CLI bump PRs compare PR output using the proposed binary against master output using the current binary. Verified via `cargo search wolfxl-cli`. An unpinned or fictional version makes every CI run fail (precedent: an earlier `xleak 0.9.0` pin was fictional and broke every run; the current `0.8.0` matches the published `wolfxl-cli` crate).
4. **MCP viewer stays local-first and read-only.** `mcp-app/` must validate local paths, reject unsupported file types, cap preview size, and call `wolfxl` rather than parsing spreadsheets in ad hoc JavaScript. If richer metadata is needed, add it upstream in `wolfxl-cli` instead of growing a second spreadsheet parser here.

## Commands

### Reproduce the token benchmarks
```bash
uv run --with tiktoken --with openpyxl python benchmarks/measure_tokens.py
```
Prints the markdown table cited in README/docs. Any edit that touches the cost claims should be followed by this command; paste the new table into the affected files.

### Verify behavioral claims
```bash
uv run --with openpyxl python benchmarks/verify_claims.py
```
Checks stable support claims beyond token math: multi-format direct previews, date and number-format rendering, sed-limited export, and budgeted agent output.

### Test the MCP app package
```bash
cd mcp-app
npm ci
npm test
npx tsc --noEmit
npm run build
npx mcpb validate manifest.json
npm run pack:mcpb
```
Build output is committed for `dist/server.js` and `dist/viewer/index.html`. The `.mcpb` archive is generated locally under `mcp-app/dist/` and stays ignored.

### Regenerate the sample workbook
```bash
uv run --with openpyxl python examples/generate_sample.py
uv run --with openpyxl python examples/generate_tall_ledger.py
```
Commit regenerated `.xlsx` files alongside generator changes.

### Re-record the demo GIF / screencast
```bash
brew install charmbracelet/tap/vhs
vhs examples/demo.tape          # README demo
vhs scripts/record_screencast.tape  # long-form walkthrough
```

### Test the install script locally
```bash
sh install.sh        # idempotent; re-running skips already-done steps
shellcheck -o all install.sh
```

### Install the current working-copy skill into your own Claude Code
```bash
mkdir -p ~/.claude/skills/spreadsheet-peek
cp SKILL.md ~/.claude/skills/spreadsheet-peek/SKILL.md
# Then start a fresh Claude Code session to pick it up.
```

### Try `wolfxl peek` against the committed sample
```bash
wolfxl peek examples/sample-financials.xlsx -n 10
wolfxl peek examples/sample-financials.xlsx --sheet "Balance Sheet" --export text | sed -n '1,20p'
```

## Testing philosophy

There is no automated test suite because the behavior under test is "does a live agent invoke `wolfxl peek` at the right moment". `CONTRIBUTING.md` documents the manual loop: copy modified `SKILL.md` to the agent's skills directory, start a fresh session, reference a spreadsheet, verify invocation.

The benchmark drift check (`.github/workflows/benchmark.yml`) guards token-cost claims. The MCP app workflow (`.github/workflows/mcp-app.yml`) guards the viewer package by installing `wolfxl-cli`, running unit tests, building the bundled server/viewer, and validating the MCPB manifest.

## Sister project: `wolfxl-cli`

The CLI this skill teaches agents to use is published from the [`SynthGL/wolfxl`](https://github.com/SynthGL/wolfxl) repo (same author). Anything that needs a parser-side change - new flags, new output formats, fixed style rendering - belongs upstream there, not here. This repo is intentionally a thin behavioral wrapper.

The current version contract is: `spreadsheet-peek 2.2.x` requires `wolfxl-cli >= 0.8.0` (the first release with the full `peek` / `map` / `agent` / `schema` surface plus direct `.xls`, `.xlsb`, `.ods`, `.csv`, `.tsv`, and `.txt` reads and common number-format-aware rendering).

## House style

- Regular hyphens (`-`), never em dashes (`—`). The CONTRIBUTING guide enforces this and the user's global preference reinforces it.
- Avoid "it's not X, it's Y" and "not just X but Y" constructions. State Y directly.
- Keep code examples short and copy-pasteable.
- When updating the CHANGELOG, use the existing `[Unreleased]` → dated-version flow and group entries under Added / Changed / Fixed.

## PR checklist (from CONTRIBUTING.md)

- `SKILL.md` stays agent-agnostic (no Claude Code-only features).
- MCP viewer changes stay local-first, read-only, and covered by `mcp-app/test/`.
- Frontmatter description still matches the proactive-trigger rules in the body.
- Token-cost claims still reproduce via `benchmarks/measure_tokens.py`.
- `CHANGELOG.md` has a new entry under `[Unreleased]`.
- New files in `examples/` are linked from `examples/README.md`.
