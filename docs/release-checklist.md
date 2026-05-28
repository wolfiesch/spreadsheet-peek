# Release Checklist

Use this checklist when publishing a Spreadsheet Peek release.

## 1. Upstream CLI

- Merge the matching `wolfxl-cli` change in the `SynthGL/wolfxl` repo.
- Run the upstream CLI tests.
- Bump and publish the `wolfxl-cli` crate when the Spreadsheet Peek release depends on a new CLI feature.
- Confirm crates.io sees the version:

```bash
cargo search wolfxl-cli --limit 1
```

## 2. Spreadsheet Peek Repo

- Update `SKILL.md`, plugin metadata, README, setup docs, and benchmark docs to the intended release version.
- Keep `.github/workflows/benchmark.yml` and `.github/workflows/mcp-app.yml` pinned to a real published `wolfxl-cli` version.
- Move `CHANGELOG.md` entries from `[Unreleased]` to the dated release heading.
- Rerun the benchmark and claim checks:

```bash
uv run --with tiktoken --with openpyxl python benchmarks/measure_tokens.py
uv run --with openpyxl python benchmarks/verify_claims.py
```

- Rerun the local comparison harness when public benchmark language changes:

```bash
uv run --with tiktoken --with openpyxl python benchmarks/compare_converters.py
```

## 3. MCP App

- Install dependencies and run the MCP app checks:

```bash
cd mcp-app
npm ci
npm audit
npm test
npx tsc --noEmit
npm run build
npx mcpb validate manifest.json
npm run pack:mcpb
```

- If the viewer changed, capture a fresh screenshot or GIF that shows the public-facing behavior.

## 4. Published Install Smoke

- Install the published CLI, then run the installer targets from the repo root:

```bash
cargo install wolfxl-cli --version 0.9.0 --force
sh install.sh --help
sh install.sh --target skill-only --output /tmp/spreadsheet-peek/SKILL.md
sh install.sh --target codex --output /tmp/spreadsheet-peek/AGENTS-snippet.md
```

- Confirm Markdown export works when the release claims it:

```bash
wolfxl peek examples/sample-financials.xlsx --export markdown | sed -n '1,8p'
```

## 5. Tag And Release

- Tag the Spreadsheet Peek repo:

```bash
git tag v2.4.0
git push origin v2.4.0
gh release create v2.4.0 --title "spreadsheet-peek 2.4.0" --notes-file /tmp/spreadsheet-peek-release-notes.md
```

- Tag the upstream `wolfxl` repo with the `wolfxl-cli` crate version when needed.
- Verify the GitHub release, crates.io package, README, and changelog all describe the same version boundary.
