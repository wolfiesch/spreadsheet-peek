import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod/v4";

import { loadWorkbookPreview, selectionToTsv } from "./workbook.js";
import { APP_VERSION } from "./version.js";

const APP_URI = "ui://spreadsheet-peek/viewer/index.html";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const viewerHtmlPath = join(__dirname, "viewer", "index.html");

const previewInputSchema = {
  path: z
    .string()
    .describe("Absolute path to a local spreadsheet, Excel workbook, CSV, TSV, ODS, or delimited table file."),
  sheet: z.string().optional().describe("Optional workbook sheet name, such as P&L. Defaults to the first sheet."),
  range: z.string().optional().describe("Optional A1 range such as A1:H25."),
  maxRows: z.number().int().min(1).max(500).optional().describe("Maximum data rows to return."),
  maxColumns: z.number().int().min(1).max(120).optional().describe("Maximum columns to return."),
};

const server = new McpServer({
  name: "spreadsheet-peek",
  version: APP_VERSION,
});

registerAppResource(
  server,
  "Spreadsheet Peek Viewer",
  APP_URI,
  {
    title: "Spreadsheet Peek Viewer",
    description: "Interactive local spreadsheet grid viewer.",
    _meta: {
      ui: {
        csp: {
          resourceDomains: [],
          connectDomains: [],
        },
      },
    },
  },
  async () => ({
    contents: [
      {
        uri: APP_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: await readFile(viewerHtmlPath, "utf8"),
        _meta: {
          ui: {
            csp: {
              resourceDomains: [],
              connectDomains: [],
            },
          },
        },
      },
    ],
  }),
);

registerAppTool(
  server,
  "preview_workbook",
  {
    title: "Preview Workbook",
    description:
      "Preview a local spreadsheet, Excel workbook, CSV, TSV, ODS, or sheet by file path; returns bounded structured workbook data and a readable table summary.",
    inputSchema: previewInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    _meta: {
      ui: {
        resourceUri: APP_URI,
        visibility: ["model", "app"],
      },
    },
  },
  async (args) => previewResult(args),
);

registerAppTool(
  server,
  "open_workbook_viewer",
  {
    title: "Open Workbook Viewer",
    description:
      "Render a local spreadsheet, Excel workbook, CSV, TSV, ODS, or sheet inline from a file path using the Spreadsheet Peek grid viewer.",
    inputSchema: previewInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    _meta: {
      ui: {
        resourceUri: APP_URI,
        visibility: ["model"],
      },
    },
  },
  async (args) => {
    const fileName = typeof args.path === "string" ? args.path.split(/[\\/]/).at(-1) : "workbook";
    const sheetSuffix = typeof args.sheet === "string" && args.sheet.trim() ? ` / ${args.sheet.trim()}` : "";
    return {
      content: [
        {
          type: "text" as const,
          text: `Opening ${fileName}${sheetSuffix} in the Spreadsheet Peek inline viewer.`,
        },
        {
          type: "resource_link",
          uri: APP_URI,
          name: "Spreadsheet Peek Viewer",
          title: "Open interactive spreadsheet viewer",
          mimeType: RESOURCE_MIME_TYPE,
        },
      ],
    };
  },
);

async function previewResult(args: {
  path: string;
  sheet?: string;
  range?: string;
  maxRows?: number;
  maxColumns?: number;
}): Promise<CallToolResult> {
  try {
    const preview = await loadWorkbookPreview(args);
    const tsv = selectionToTsv(preview);
    return {
      content: [
        {
          type: "text" as const,
          text: `${preview.summary}\n\nRange: ${preview.range}\nSheets: ${preview.sheets
            .map((sheet) => sheet.name)
            .join(", ")}\n\n${tsv}`,
        },
      ],
      structuredContent: preview as unknown as Record<string, unknown>,
    };
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }
}

const transport = new StdioServerTransport();
await server.connect(transport);
