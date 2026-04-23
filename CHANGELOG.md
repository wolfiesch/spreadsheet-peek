# Changelog

All notable changes to `spreadsheet-peek` are documented here. This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added `examples/sample-ledger.csv`, `examples/sample-ledger.tsv`, and `examples/generate_delimited_samples.py` so direct CSV/TSV input costs are benchmarked against committed fixtures.
- `benchmarks/measure_tokens.py` now prints a separate direct-delimited-input cost table for `.csv` and `.tsv` previews without disturbing the existing workbook output-mode ratios.
- Added `examples/sample-ledger.txt` and `examples/quoted-multiline.csv` so comma-delimited `.txt` and quoted multiline CSV inputs are benchmarked and smoke-tested from committed fixtures.
- Added `mcp-app/`, a local Node/TypeScript MCP server and MCP App viewer that uses the installed `wolfxl` binary to return bounded structured previews, readable text fallbacks, and a Claude Desktop-oriented inline grid with sheet tabs, sticky headers, search, range selection, and selected-range handoff.
- Added root `.mcp.json` plus `.codex-plugin/` metadata so Claude Code and Codex plugin installs can expose the same `preview_workbook` and `open_workbook_viewer` tools after the bundled server is built.
- Added `.github/workflows/mcp-app.yml` to install `wolfxl-cli`, run the MCP app tests, build the bundled server/viewer, and validate the MCPB manifest on relevant PRs.

### Changed

- `SKILL.md`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, and the new MCP package metadata are bumped to 2.2.0 for the inline-viewer release.
- `.codex-plugin/plugin.json` now carries complete Codex-facing discovery metadata, including the shared skill path, MCP server path, read-only interface summary, and short starter prompts.
- README, `SKILL.md`, and `docs/how-it-works.md` now cite the direct-delimited benchmark rows surfaced by the drift workflow.
- The MCP app now sources its runtime app version from `package.json` and drops the unused Vite basic SSL dev dependency.
- README, `docs/how-it-works.md`, `docs/agent-setup.md`, and `mcp-app/README.md` now document the verified Claude Desktop inline-viewer path and the tested MCP Apps host-hydration contract.

### Fixed

- The MCP app package now overrides transitive `tmp` to a patched 0.2.x release, clearing the low-severity development dependency alert inherited through the MCPB CLI toolchain.
- `.claude-plugin/marketplace.json` now uses an HTTPS git URL source so clean Claude Code plugin installs do not require GitHub SSH keys.
- The MCP server now resolves `wolfxl` from explicit environment overrides, Cargo, Homebrew, common system paths, and finally `PATH`, which helps desktop hosts launched with a thin environment find `cargo install` binaries.
- The MCP TSV handoff now escapes tabs, newlines, carriage returns, and backslashes so multiline CSV cells cannot shift table rows or columns in model-facing text.
- The MCP app build and root `.mcp.json` launcher now avoid POSIX-only shell assumptions for Windows plugin hosts.
- The viewer no longer abandons host connection after a fixed 1.5 second timeout.
- The MCP preview tools no longer return SVG image content blocks, avoiding unsupported-image warnings in Claude Desktop while keeping structured preview data and readable text output.
- The MCP viewer now preserves host tool input through the app handshake, shows loading/error states, and fits narrow Claude Desktop embeds by keeping horizontal scrolling inside the spreadsheet grid.
- The Claude embed now reports a fixed useful content height instead of sizing itself from the initially collapsed iframe viewport.
- The MCP viewer tests now simulate host `tool-input` and `tool-result` hydration, including requested-sheet loading and representative wide, tall, and messy preview shapes.
- The inline viewer now gives selected ranges, search hits, focus, and enabled summarize actions clearer visual affordances.
- The viewer now compares requested ranges and preview caps before skipping host-input hydration, and keeps loading/error status visible even when a search term has matches.
- The Claude inline viewer now ships a much smaller HTML resource and makes `open_workbook_viewer` return a lightweight launcher result, reducing host request-expiry and tool-result submission failures.
- MCPB tool descriptions and docs now favor natural spreadsheet preview requests over exact-tool-call prompts, improving Claude Desktop discovery and avoiding prompt-shape false alarms during manual smoke tests.
- Codex setup docs now record the verified Codex CLI 0.123.0 plugin install, `preview_workbook` MCP tool smoke, and `open_workbook_viewer` resource-link smoke while keeping visible Codex Desktop inline-viewer rendering marked unverified.
- The MCP host bridge now pins post-handshake messages to the first concrete host origin it receives, and viewer/server status labels handle trailing slashes in requested paths.
- The MCP host bridge now cleans up failed handshakes and times out unanswered host requests so pending JSON-RPC calls cannot hang forever.

## [2.1.0] - 2026-04-22

### Changed

- `SKILL.md`, README, setup docs, plugin manifests, and launch-copy drafts now describe the current stable support boundary precisely: direct `wolfxl peek` reads for `.xlsx`, `.xlsm`, `.xls`, `.xlsb`, `.ods`, `.csv`, `.tsv`, and comma-delimited `.txt`; value-first caveats for legacy/delimited inputs; and common date/currency/percentage rendering where the underlying file carries OOXML style metadata.
- `SKILL.md`, `.claude-plugin/plugin.json`, and `.claude-plugin/marketplace.json` are bumped to 2.1.0 to mark the broader direct-format behavior.
- `examples/generate_sample.py` now writes real date cells for the Balance Sheet period headers and regenerates `examples/sample-financials.xlsx`, so the sample workbook demonstrates an actual supported rendering behavior instead of relying only on string literals.
- Added `examples/tall-ledger.xlsx` plus `examples/generate_tall_ledger.py`, and expanded the benchmark corpus to cover a row-heavy 8-column accounting-detail shape in addition to the financial package and wide dashboard.
- Added tiny `.xls`, `.xlsb`, and `.ods` smoke fixtures under `examples/` so the published direct-format claims are checked in CI instead of merely documented.
- `benchmarks/measure_tokens.py` now measures export previews against the same data-row count as box-drawing previews. The headline ratios are now ~3.9x for the 7-column financial workbook, ~3.6x for the 8-column tall ledger, and ~3.0x for the 29-column wide workbook, replacing the older line-count-based ~4.9x / ~3.6x figures.
- Added `benchmarks/verify_claims.py` and wired it into CI to smoke-test non-token claims: direct preview for `.xlsx`, `.xlsm`, `.xls`, `.xlsb`, `.ods`, `.csv`, `.tsv`, and `.txt`; Balance Sheet date rendering; currency/percentage rendering; `sed` pipe hygiene; and `agent --max-tokens`.
- Token-efficient examples now use `sed -n '1,Np'` instead of `head` for `wolfxl peek --export text` output, avoiding the broken-pipe warning current stable `wolfxl-cli` releases can emit when `head` exits early.

### Fixed

- `install.sh` now treats old `wolfxl` binaries as incompatible unless they expose the full `peek` / `map` / `agent` / `schema` surface, and uses `cargo install --force wolfxl-cli` so reruns can upgrade them in place.
- `.github/workflows/benchmark.yml` now resolves `WOLFXL_CLI_VERSION` from both the PR and master checkouts before installing branch-specific `wolfxl` binaries, runs when docs/manifests with benchmark claims change, preserves the benchmark command's exit code through `tee`, and updates a single sticky drift comment instead of posting duplicates.
- `docs/how-it-works.md` now refers to the embedded recording as a screencast instead of pinning a stale duration.
- `benchmarks/measure_tokens.py` now measures bounded export previews by truncating command output inside Python instead of piping `wolfxl peek` through `head`, so the benchmark stays portable and fails only on real command failures.
- Benchmark provenance docs, `install.sh`, and the bug report template now cite `wolfxl-cli 0.8.0`, matching the current 2.1.x support contract.

## [2.0.0] - 2026-04-19

**Breaking change**: the skill now teaches agents to use `wolfxl peek` (from the [`wolfxl-cli`](https://crates.io/crates/wolfxl-cli) crate) instead of `xleak`. Any user with a working `1.x` install needs to install the new binary (`cargo install wolfxl-cli`) and either re-run `install.sh` or update their `/plugin install` to the v2.0.0 release. Existing shell aliases that hard-code `xleak` will silently keep working against the old binary; rebind them to `wolfxl peek` for the v2 experience.

The motivation for the swap is owning the full stack: `wolfxl-cli` is built on the same author's `wolfxl-core` Rust crate, which means feature requests this skill could previously only file as upstream issues (sprint-2 features like `--map`, `--agent --max-tokens`, `--schema`, MCP server mode) are now ours to ship.

### Added
- **Readable rendering as the headline feature.** `wolfxl peek` gives agents a clean table preview instead of raw `openpyxl` tuple dumps. Current stable output renders date cells as ISO `YYYY-MM-DD` and groups numeric cells for scanning; richer currency and percentage symbol fidelity belongs upstream in `wolfxl-cli`
- `CLAUDE.md` "Sister project" section pointing maintainers at the upstream `wolfxl` repo for parser-side changes, plus a version-contract line (`spreadsheet-peek 2.x` requires `wolfxl-cli >= 0.4.0`)

### Changed
- **`SKILL.md`** version → 2.0.0; frontmatter `description` and `bashPattern` rewritten (`xleak` → `wolfxl`/`peek\b`); body command reference rewritten across 32 invocations; "Why this skill exists" callout updated to lead with readable rendering as the first reason to prefer the CLI over disposable Python; v1-only flags that `wolfxl-cli 0.4.0` doesn't have yet (`--formulas`, `--list-tables`, `--table`, `--sheet <index>`) removed and tracked on the upstream sprint-2 backlog. `--sheet "Name"` is preserved
- **`.claude-plugin/plugin.json`** version → 2.0.0; description + keywords updated to mention `wolfxl peek` and readable rendering
- **`.claude-plugin/marketplace.json`** plugin entry version → 2.0.0; description + keywords + tags updated in lockstep with `plugin.json`
- **`install.sh`** rewritten - single install path on macOS/Linux/Windows: `cargo install wolfxl-cli` (homebrew tap is sprint-2 backlog per the migration plan's R3 risk). Sanity check now runs `command -v wolfxl` instead of `command -v xleak`
- **`.github/workflows/benchmark.yml`** - `XLEAK_VERSION: "0.2.5"` env replaced with `WOLFXL_CLI_VERSION: "0.4.0"`; cache path/key + cargo install command updated. Benchmark drift comparison continues to work unchanged because `measure_tokens.py` still emits the same markdown shape
- **`benchmarks/measure_tokens.py`** - all `xleak` invocations swapped for `wolfxl peek`; docstring + row-counter comment updated
- **`benchmarks/README.md`** results table re-measured against `wolfxl-cli 0.4.0`. New numerics at the time: financials box-drawing 573 tokens / 114.6 per row (was 593 / 118.6); wide box-drawing 2,249 / 449.8 (was 2,263 / 452.6). The export-row normalization was later corrected under `[Unreleased]`.
- **`README.md`** + **`docs/how-it-works.md`** + **`SKILL.md`** token tables and worked-example math updated to match the benchmark output. All four sources stay in lockstep so the CI drift check on the next PR doesn't fire spuriously
- **`docs/agent-setup.md`** - all per-agent install snippets (Codex AGENTS.md, Cursor rules, Continue systemMessage, Aider, Generic) rewritten to `wolfxl peek`. "Verified" badge for Claude Code re-dated to 2026-04-19 against the v2.0.0 plugin install. Troubleshooting section updated: `cargo install wolfxl-cli` replaces the homebrew install path
- **`CONTRIBUTING.md`** dev setup uses `cargo install wolfxl-cli`; "out of scope" rule sharpened ("feature requests for the parser itself belong upstream in the wolfxl repo")
- **`examples/README.md`** + **`examples/generate_wide_table.py`** + the three VHS tape scripts (`examples/demo.tape`, `scripts/record_screencast.tape`, `scripts/record_contrast.tape`) - all command examples and inline comments swapped to `wolfxl peek`. The screencast tape was retargeted from "demonstrate the interactive TUI" to "demonstrate readable preview + sheet switch + token-efficient mode + wide-table stress" because `wolfxl-cli 0.4.0` doesn't ship a TUI mode yet (planned)
- **`scripts/generate_og_card.py`** - mock terminal prompt swapped from `xleak financials.xlsx -n 5` to `wolfxl peek financials.xlsx -n 5`. Static snippet preserved (the OG card was always a hand-tuned mock, not live CLI output, to keep image generation deterministic and dependency-free)
- **`.github/ISSUE_TEMPLATE/bug_report.yml`** - the `xleak version` field becomes `wolfxl-cli version` (asks for `wolfxl --version` output)
- **`.github/ISSUE_TEMPLATE/feature_request.yml`** scope check updated; the "don't replace the backend" rule now points users at the upstream `wolfxl` repo for parser-side requests

### Fixed
- The launch-content drafts (`docs/launch-content.md`, untracked) intentionally **not** mass-edited - the v2.0.0 positioning ("I own the whole stack from Rust core to skill") is a different pitch from the v1 framing ("I wrap a great third-party CLI with proactive triggers"), and the rewrite needs author voice rather than mechanical sed. Rewrite as a follow-up before the next launch push

## [1.4.0] - 2026-04-17

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
- `SKILL.md` version bumped to 1.4.0 (behavioral change: the body now includes a full `CSV Fallback` section with the shell decision tree); frontmatter `description` narrowed to Excel-family with explicit "CSV via shell fallback" language so the retrieval hook is accurate; `filePattern` keeps `*.csv` so the skill still fires on CSV paths and the agent reaches for the fallback instead of blindly trying `xleak`. `.claude-plugin/plugin.json` version tracks 1.4.0 to match
- `SKILL.md` command reference - documented `--list-tables` and `--table` for workbooks with Excel named tables
- `benchmarks/measure_tokens.py` - refactored to run the same mode grid against every sample via a `benches_for(path, prefix)` helper; now benchmarks both `sample-financials.xlsx` and `wide-table.xlsx` with per-sample ratio summaries
- `benchmarks/README.md` and `docs/how-it-works.md` - results tables and worked examples updated to show the two-sample story: ratio drops from 5.1x (financials) to 3.6x (wide), but absolute per-row savings grows 3.4x (95 -> 326 tokens/row). Wide-table users pay more in raw tokens, so the mode-switch rule matters more for them
- `README.md` quick-start and `docs/agent-setup.md` - Claude Code install now shows plugin install as Option A (recommended) with the manual skill copy demoted to Options B/C. File-formats section splits Excel-family (xleak) from CSV (shell fallback) to correctly represent what each path does
- `README.md` token-efficiency table expanded to show both sample shapes inline so the headline ratio isn't derived from a single corpus

### Fixed
- Incorrect `xleak` CSV support claim across `README.md`, `SKILL.md`, and `docs/agent-setup.md`. `xleak 0.2.5` returns `Error: Cannot detect file format` on CSV input; pre-publish docs implied otherwise. This was the highest-impact pre-release bug - a user following the README would have tried `xleak data.csv` and hit a confusing parse error. Fixed at all four levels: prerequisite line in SKILL.md, frontmatter description, agent-setup snippets, and README file-formats table
- `scripts/naive_preview.py` Pyright warning - added `assert ws is not None` for the Optional `wb.active` return (appropriate for a demo script representing agent-written code)
- `README.md` Windows FAQ referenced `Get-Content -Head`, which is not a real PowerShell parameter. Replaced with `Get-Content -TotalCount 15` and added `Import-Csv | Format-Table` as the `column -s, -t` equivalent so the Windows-user guidance actually runs
- `SKILL.md` "accurate column count" recipe still piped `mlr` output through `tr ,` and `wc -l`, which mis-counts on the quoted-comma case the section warns about. Replaced with `mlr --icsv --opprint put '$columns = NF' then head -n 1 file.csv` using mlr's built-in NF (number of fields) for a quote-aware count

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
