# Changelog

All notable changes to `spreadsheet-peek` are documented here. This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Pre-publish hardening: closed the CSV-support gap, shipped the plugin path, diversified the benchmark corpus, and added the "why this exists" visual.

### Added
- `.claude-plugin/plugin.json` - Claude Code plugin manifest (name, version, description, author, keywords). Enables `/plugin install wolfiesch/spreadsheet-peek` as an alternative to the `curl | sh` install
- `skills/spreadsheet-peek/SKILL.md` - symlink to repo-root `SKILL.md` so the plugin manifest's default skill-discovery path resolves without duplicating the file (single source of truth)
- `examples/wide-table.xlsx` + `examples/generate_wide_table.py` - 29-column operations-dashboard stress test. Benchmark corpus now covers both typical (7 col) and wide (29 col) shapes so the token-efficiency story holds across workbook topology
- `examples/messy.csv` + `examples/generate_messy_csv.py` - UTF-8-BOM CSV exercising commas-in-fields, escaped quotes, embedded newlines, emoji, European decimals, trailing whitespace, and null fields. Makes the CSV fallback section in `SKILL.md` demonstrable instead of asserted
- `scripts/naive_preview.py` + `scripts/record_contrast.tape` + `assets/contrast.gif` - contrast demo GIF showing what a naive agent reaches for (openpyxl tuple dump) vs the same agent with `spreadsheet-peek` (one `xleak` call). Dracula, 1200x720, 193 KB. Referenced at the top of the README above the TUI demo
- FAQ section in `README.md` - covers "Why not MCP?", "Why not pandas/openpyxl?", "Sandboxed agents?", "CSV?", "Windows?", and "Context bloat?". Answers the objections every agent-tooling reader silently raises before installing
- `CSV Fallback` section in `SKILL.md` - shell recipes (`head`, `column -s, -t`, `mlr --icsv --opprint`, `csvlook`) the agent should reach for on `.csv` input since `xleak 0.2.5` doesn't parse CSV directly

### Changed
- `SKILL.md` version bumped to 1.3.0; frontmatter `description` narrowed to Excel-family with explicit "CSV via shell fallback" language so the retrieval hook is accurate; `filePattern` keeps `*.csv` so the skill still fires on CSV paths and the agent reaches for the fallback instead of blindly trying `xleak`
- `SKILL.md` command reference - documented `--list-tables` and `--table` for workbooks with Excel named tables
- `benchmarks/measure_tokens.py` - refactored to run the same mode grid against every sample via a `benches_for(path, prefix)` helper; now benchmarks both `sample-financials.xlsx` and `wide-table.xlsx` with per-sample ratio summaries
- `benchmarks/README.md` and `docs/how-it-works.md` - results tables and worked examples updated to show the two-sample story: ratio drops from 5.1x (financials) to 3.6x (wide), but absolute per-row savings grows 3.4x (95 -> 326 tokens/row). Wide-table users pay more in raw tokens, so the mode-switch rule matters more for them
- `README.md` quick-start and `docs/agent-setup.md` - Claude Code install now shows plugin install as Option A (recommended) with the manual skill copy demoted to Options B/C. File-formats section splits Excel-family (xleak) from CSV (shell fallback) to correctly represent what each path does
- `README.md` token-efficiency table expanded to show both sample shapes inline so the headline ratio isn't derived from a single corpus

### Fixed
- Incorrect `xleak` CSV support claim across `README.md`, `SKILL.md`, and `docs/agent-setup.md`. `xleak 0.2.5` returns `Error: Cannot detect file format` on CSV input; pre-publish docs implied otherwise. This was the highest-impact pre-release bug - a user following the README would have tried `xleak data.csv` and hit a confusing parse error. Fixed at all four levels: prerequisite line in SKILL.md, frontmatter description, agent-setup snippets, and README file-formats table
- `scripts/naive_preview.py` Pyright warning - added `assert ws is not None` for the Optional `wb.active` return (appropriate for a demo script representing agent-written code)

## [1.3.0] - 2026-04-16

Launch-polish pass. No behavioral changes to `SKILL.md`; everything here is supporting material and maintenance infrastructure.

### Added
- `docs/how-it-works.md` - technical deep-dive covering proactive-trigger rationale, the token-efficiency math with a worked 30-spreadsheet session, and a blueprint for sibling skills (`pdf-peek`, `sql-peek`, `parquet-peek`)
- `assets/screencast.mp4` and `assets/screencast.gif` - long-form screencast demonstrating xleak's interactive TUI mode (navigation, `Ctrl+G` jump, sheet cycling, `/` search, `?` help overlay), produced reproducibly via `scripts/record_screencast.tape`
- `assets/og-card.png` - Dracula-themed 1280x640 Open Graph card for social link previews, generated reproducibly via `scripts/generate_og_card.py`
- `install.sh` - POSIX sh installer that provisions `xleak` via brew (macOS) or cargo (Linux), then drops `SKILL.md` into `~/.claude/skills/spreadsheet-peek/`. Idempotent, atomic SKILL.md download via `mktemp` + trap, clean under `shellcheck -o all`
- `.github/ISSUE_TEMPLATE/` - bug report, feature request, and question forms plus `config.yml` disabling blank issues
- `.github/pull_request_template.md` - PR checklist mirroring the `CONTRIBUTING.md` review criteria
- `.github/workflows/benchmark.yml` - CI workflow that re-measures token costs on any PR touching `SKILL.md`, `benchmarks/**`, or `examples/**` and posts a single drift comment (edit-in-place via `peter-evans/create-or-update-comment@v4`) when output differs from master
- Agent-setup verification badges (`docs/agent-setup.md`) - explicit "Verified" vs "Documented" status per agent so readers can distinguish personally round-tripped integrations from spec-only ones

### Changed
- `README.md` - added `curl | sh` one-liner in Quick Start and a Deep Dive section linking to `docs/how-it-works.md`

### Fixed
- `benchmark.yml` pinned `xleak` to `0.2.5` (the actual latest on crates.io); the initial `0.9.0` pin was fictional and caused every CI run to fail with `could not find xleak ... with version =0.9.0`

## [1.2.0] - 2026-04-16

First public release.

### Added
- Agent-agnostic `SKILL.md` with behavioral rules for proactive spreadsheet previews
- Installation instructions for Claude Code, Codex, Cursor, and generic AGENTS.md-based agents
- Reproducible sample workbook (`examples/sample-financials.xlsx`) with P&L, Balance Sheet, and Revenue Breakdown sheets
- VHS tape script (`examples/demo.tape`) for regenerating the README demo GIF
- Token cost benchmarks (`benchmarks/measure_tokens.py`) with reproducible methodology using `tiktoken`
- CONTRIBUTING guide and MIT license

### Changed
- Token efficiency numbers updated with measured values (~5x ratio, not the previously estimated ~13x)
- Generalized language: removed all project-specific references from the private origin version of the skill

## Pre-release history

- **1.1.0** (2026-03-22, private) - Added token efficiency guidance distinguishing box-drawing from text-export modes
- **1.0.0** (2026-03-20, private) - Initial version built for internal use as a Claude Code skill
