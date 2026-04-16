# Changelog

All notable changes to `spreadsheet-peek` are documented here. This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
