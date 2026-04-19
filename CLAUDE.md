# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo actually is

`spreadsheet-peek` is **not a traditional code project**. The shipped artifact is a single markdown file (`SKILL.md`) that teaches AI coding agents to use `wolfxl peek` (from [`wolfxl-cli`](https://crates.io/crates/wolfxl-cli)) for inline, style-aware spreadsheet previews. Everything else in the tree - the Python benchmarks, the install script, the sample workbook, the CI - exists to keep `SKILL.md`'s behavioral and numeric claims honest.

When you edit this repo, you are usually editing agent behavior. Treat `SKILL.md` as the product.

## Repository layout (the "why", not the "what")

- **`SKILL.md`** - the product. YAML frontmatter (`name`, `description`, `filePattern`, `bashPattern`) is what agents index on; the body is what gets loaded into context at invocation time. Keep it under ~10 KB of prose - every line is verbatim context for the host agent.
- **`.claude-plugin/plugin.json`** - Claude Code plugin manifest. Enables `/plugin install spreadsheet-peek@wolfie-tools` after the marketplace is added. The `skills/spreadsheet-peek/SKILL.md` path is a **symlink** to the repo-root `SKILL.md` (single source of truth - edit the root file, never the symlinked copy). Version field here should track `SKILL.md`'s frontmatter version.
- **`.claude-plugin/marketplace.json`** - the `wolfie-tools` marketplace definition. `version` and `description` here also track `SKILL.md`'s frontmatter; updating SKILL.md's `version` in lockstep is part of the release checklist.
- **`README.md`** / **`docs/how-it-works.md`** - user-facing rationale. Cites numeric claims (e.g. "~4.9x cheaper") that must match what `benchmarks/measure_tokens.py` actually prints.
- **`benchmarks/measure_tokens.py`** - the arbiter for token-cost claims. Uses `tiktoken`'s `cl100k_base` encoding as a Claude proxy. Runs against both `examples/sample-financials.xlsx` (7 cols) and `examples/wide-table.xlsx` (29 cols) so ratios are characterized across workbook topology, not just one shape.
- **`examples/generate_sample.py`** / **`examples/generate_wide_table.py`** / **`examples/generate_messy_csv.py`** - deterministic sample generators. Commit the regenerated files alongside generator changes; the benchmark and CSV-fallback docs pin to them.
- **`scripts/record_contrast.tape`** + **`scripts/naive_preview.py`** - the "why this exists" contrast GIF (openpyxl tuple dump vs `wolfxl peek`). The naive script is a pedagogical artifact - it is *supposed* to look like throwaway agent code, so keep it minimal.
- **`examples/demo.tape`** / **`scripts/record_screencast.tape`** - VHS tape scripts for reproducible GIF/screencast regeneration.
- **`install.sh`** - POSIX `sh` installer. Runs `cargo install wolfxl-cli` (single path on macOS, Linux, and Windows in v2.0.0 - homebrew tap is sprint-2 backlog), then drops `SKILL.md` into `~/.claude/skills/spreadsheet-peek/`. Must stay clean under `shellcheck -o all`; uses `mktemp` + `trap` for atomic SKILL.md download.
- **`.github/workflows/benchmark.yml`** - runs `measure_tokens.py` on PR branch and master, posts (or updates) a single drift comment if output differs. `WOLFXL_CLI_VERSION` is pinned in the workflow env (currently `0.4.0`).
- **`docs/agent-setup.md`** - per-agent install instructions. Verification badges (✅ Verified vs 📖 Documented) distinguish personally round-tripped integrations from spec-only ones.

## The three load-bearing invariants

1. **Agent-agnostic `SKILL.md`.** No Claude Code-only features in the body. Frontmatter is the only place Claude-specific triggers live. If you add a feature that only works in Claude Code, it belongs in a separate doc.
2. **Numeric claims match the benchmark.** If you change `SKILL.md`, `README.md`, `benchmarks/README.md`, or `docs/how-it-works.md` in ways that touch the token-cost table (~4.9x ratio on financials, ~3.6x on wide; 114.6 tokens/row box-drawing, 23.4 tokens/row text export on the 7-column financials sample), rerun `measure_tokens.py` and update all four sources, or CI will flag drift.
3. **`wolfxl-cli` version pin in CI.** The `WOLFXL_CLI_VERSION` env in `.github/workflows/benchmark.yml` must point at a real published crates.io version. Verified via `cargo search wolfxl-cli`. An unpinned or fictional version makes every CI run fail (precedent: an earlier `xleak 0.9.0` pin was fictional and broke every run; the current `0.4.0` matches the published `wolfxl-cli` crate).

## Commands

### Reproduce the token benchmarks
```bash
uv run --with tiktoken --with openpyxl python benchmarks/measure_tokens.py
```
Prints the markdown table cited in README/docs. Any edit that touches the cost claims should be followed by this command; paste the new table into the affected files.

### Regenerate the sample workbook
```bash
uv run --with openpyxl python examples/generate_sample.py
```
Commit the regenerated `examples/sample-financials.xlsx` alongside generator changes.

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
wolfxl peek examples/sample-financials.xlsx --sheet "Balance Sheet" --export text | head -20
```

## Testing philosophy

There is no automated test suite because the behavior under test is "does a live agent invoke `wolfxl peek` at the right moment". `CONTRIBUTING.md` documents the manual loop: copy modified `SKILL.md` to the agent's skills directory, start a fresh session, reference a spreadsheet, verify invocation.

The one thing that *is* automated is the benchmark drift check (`.github/workflows/benchmark.yml`). That workflow is the closest thing this repo has to a regression test - treat a drift comment as a signal to either update the cited numbers or investigate why they moved.

## Sister project: `wolfxl-cli`

The CLI this skill teaches agents to use is published from the [`SynthGL/wolfxl`](https://github.com/SynthGL/wolfxl) repo (same author). Anything that needs a parser-side change - new flags, new output formats, fixed style rendering - belongs upstream there, not here. This repo is intentionally a thin behavioral wrapper.

The current version contract is: `spreadsheet-peek 2.x` requires `wolfxl-cli >= 0.4.0` (the first release with the `peek` subcommand at xleak parity plus style-aware rendering for currency / percent / date number formats).

## House style

- Regular hyphens (`-`), never em dashes (`—`). The CONTRIBUTING guide enforces this and the user's global preference reinforces it.
- Avoid "it's not X, it's Y" and "not just X but Y" constructions. State Y directly.
- Keep code examples short and copy-pasteable.
- When updating the CHANGELOG, use the existing `[Unreleased]` → dated-version flow and group entries under Added / Changed / Fixed.

## PR checklist (from CONTRIBUTING.md)

- `SKILL.md` stays agent-agnostic (no Claude Code-only features).
- Frontmatter description still matches the proactive-trigger rules in the body.
- Token-cost claims still reproduce via `benchmarks/measure_tokens.py`.
- `CHANGELOG.md` has a new entry under `[Unreleased]`.
- New files in `examples/` are linked from `examples/README.md`.
