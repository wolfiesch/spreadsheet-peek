# Spreadsheet Peek MCP App

This package turns the `spreadsheet-peek` skill into a local, read-only MCP server plus an MCP App viewer. It keeps `SKILL.md` as the behavioral layer and uses `wolfxl` as the parser.

## Tools

- `preview_workbook`: returns a bounded structured preview, text summary, and SVG image fallback.
- `open_workbook_viewer`: returns the same preview plus a `ui://spreadsheet-peek/viewer/index.html` MCP App resource for hosts that render inline apps.

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
