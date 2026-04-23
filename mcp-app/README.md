# Spreadsheet Peek MCP App

This package turns the `spreadsheet-peek` skill into a local, read-only MCP server plus an MCP App viewer. It keeps `SKILL.md` as the behavioral layer and uses `wolfxl` as the parser.

## Tools

- `preview_workbook`: returns a bounded structured preview and text summary.
- `open_workbook_viewer`: returns a lightweight launcher plus a `ui://spreadsheet-peek/viewer/index.html` MCP App resource for hosts that render inline apps. The viewer then calls `preview_workbook` to hydrate the grid.

Both tools accept:

```json
{
  "path": "/absolute/path/to/workbook.xlsx",
  "sheet": "P&L",
  "range": "A1:H25",
  "maxRows": 50,
  "maxColumns": 40
}
```

`path` should be absolute when the host is not running from the same project directory as the workbook.

When testing through Claude Desktop chat, prefer a natural request such as "Please preview `/absolute/path/to/workbook.xlsx`, sheet `P&L`, using Spreadsheet Peek if available." The JSON shape above is for MCP clients and tests; asking a model to call an exact tool with exact arguments can trigger host-side caution before Spreadsheet Peek runs.

## Host Behavior

The inline viewer is designed for MCP Apps hosts that render `ui://` resources, with Claude Desktop as the verified target for the full grid. The viewer listens for the host's initial `tool-input`, keeps it through the `ui/initialize` handshake, calls `preview_workbook` when the host can proxy server tools, and hydrates the returned `structuredContent` into the grid. This is what keeps a requested sheet such as `P&L` or `Balance Sheet` from falling back to the bundled sample preview.

Hosts that do not render MCP Apps still receive the text summary and structured workbook preview from `preview_workbook`, while `open_workbook_viewer` returns a small launcher result with a resource link. Treat Codex support as structured/text fallback until inline MCP App rendering is verified there.

The browser regression tests cover:

- collapsed-host iframe sizing and fixed content-height reporting;
- requested-sheet hydration from `tool-input` through `preview_workbook`;
- wide, tall, and messy preview shapes rendered from host `tool-result` data;
- search, cell selection, and selected-range summarize affordances.

## Development

```bash
cd mcp-app
npm install
npm test
npm run build
```

For browser UI work:

```bash
npm run dev
```

## Claude Desktop Bundle

Build and pack a local `.mcpb`:

```bash
cd mcp-app
npm install
npm run pack:mcpb
```

The bundle is written to `mcp-app/dist/spreadsheet-peek.mcpb`.

The bundle expects `wolfxl` to be installed. It resolves the binary from `SPREADSHEET_PEEK_WOLFXL_BIN`, `WOLFXL_BIN`, `~/.cargo/bin/wolfxl`, common Homebrew paths, and then `PATH`:

```bash
cargo install wolfxl-cli --version 0.8.0 --force
```

## Plugin Development

The root `.mcp.json` points Claude Code and Codex plugin installs at the Node launcher in `mcp-app/bin/run-server.mjs`, which runs the committed `mcp-app/dist/server.js`. Rebuild the bundle after TypeScript or viewer changes:

```bash
cd mcp-app
npm run build
```
