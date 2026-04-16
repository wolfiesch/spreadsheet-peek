# Changelog

All notable changes to `spreadsheet-peek` are documented here. This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
