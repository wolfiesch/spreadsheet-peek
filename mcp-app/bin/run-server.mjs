#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const roots = [
  process.env.CLAUDE_PLUGIN_ROOT,
  process.env.CODEX_PLUGIN_ROOT,
  resolve(scriptDir, "..", ".."),
  process.cwd(),
].filter(Boolean);

let serverPath;
for (const root of roots) {
  const candidate = resolve(root, "mcp-app", "dist", "server.js");
  if (existsSync(candidate)) {
    serverPath = candidate;
    break;
  }
}

if (!serverPath) {
  console.error("spreadsheet-peek MCP server is not built. Run: cd mcp-app && npm install && npm run build");
  process.exit(1);
}

await import(pathToFileURL(serverPath).href);
