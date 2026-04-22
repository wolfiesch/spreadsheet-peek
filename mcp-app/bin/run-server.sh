#!/bin/sh
set -eu

ROOT="${CLAUDE_PLUGIN_ROOT:-${CODEX_PLUGIN_ROOT:-}}"
if [ -z "$ROOT" ]; then
  ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
fi

SERVER="$ROOT/mcp-app/dist/server.js"
if [ ! -f "$SERVER" ]; then
  echo "spreadsheet-peek MCP server is not built. Run: cd $ROOT/mcp-app && npm install && npm run build" >&2
  exit 1
fi

exec node "$SERVER"
