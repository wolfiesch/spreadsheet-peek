type JsonRpcId = number;

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcNotification = {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
    data?: unknown;
  };
};

type ToolInputParams = {
  arguments?: Record<string, unknown>;
};

type ToolResult = {
  isError?: boolean;
  content?: Array<{ type: string; text?: string }>;
  structuredContent?: unknown;
};

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

const MCP_APPS_PROTOCOL_VERSION = "2026-01-26";

export class HostBridge {
  ontoolinputpartial?: (params: ToolInputParams) => void;
  ontoolinput?: (params: ToolInputParams) => void;
  ontoolresult?: (params: ToolResult) => void;
  ontoolcancelled?: (params: { reason?: string }) => void;

  private nextId = 1;
  private pending = new Map<JsonRpcId, PendingRequest>();
  private resizeObserver?: ResizeObserver;
  private lastWidth = 0;
  private lastHeight = 0;
  private connected = false;
  private targetOrigin = "*";

  constructor(
    private readonly appInfo: { name: string; version: string },
    private readonly target: Window = window.parent,
  ) {}

  async connect(): Promise<void> {
    window.addEventListener("message", this.handleMessage);
    const result = await this.request("ui/initialize", {
      appInfo: this.appInfo,
      appCapabilities: {},
      protocolVersion: MCP_APPS_PROTOCOL_VERSION,
    });
    if (!result || typeof result !== "object") {
      throw new Error("MCP host did not complete the app handshake.");
    }
    this.connected = true;
    this.notify("ui/notifications/initialized");
    this.startResizeNotifications();
  }

  close(): void {
    this.connected = false;
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    window.removeEventListener("message", this.handleMessage);
    for (const pending of this.pending.values()) {
      pending.reject(new Error("MCP host connection closed."));
    }
    this.pending.clear();
  }

  async callServerTool(params: {
    name: string;
    arguments?: Record<string, unknown>;
  }): Promise<ToolResult> {
    return (await this.request("tools/call", params)) as ToolResult;
  }

  async updateModelContext(params: {
    content?: Array<{ type: "text"; text: string }>;
    structuredContent?: Record<string, unknown>;
  }): Promise<void> {
    await this.request("ui/update-model-context", params);
  }

  async sendMessage(params: {
    role: "user";
    content: Array<{ type: "text"; text: string }>;
  }): Promise<void> {
    await this.request("ui/message", params);
  }

  private request(method: string, params?: Record<string, unknown>): Promise<unknown> {
    const id = this.nextId++;
    const message: JsonRpcRequest = { jsonrpc: "2.0", id, method, params };
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.target.postMessage(message, this.targetOrigin);
    });
  }

  private notify(method: string, params?: Record<string, unknown>): void {
    if (!this.connected && method !== "ui/notifications/initialized") return;
    const message: JsonRpcNotification = { jsonrpc: "2.0", method, params };
    this.target.postMessage(message, this.targetOrigin);
  }

  private handleMessage = (event: MessageEvent<unknown>): void => {
    if (event.source !== this.target) return;
    if (this.targetOrigin !== "*" && event.origin !== this.targetOrigin) return;
    if (this.targetOrigin === "*" && event.origin && event.origin !== "null") {
      this.targetOrigin = event.origin;
    }
    if (!isJsonRpcMessage(event.data)) return;
    const message = event.data;
    if ("id" in message && !("method" in message)) {
      this.handleResponse(message);
      return;
    }
    if (!("method" in message)) return;
    const params = isObject(message.params) ? message.params : {};
    switch (message.method) {
      case "ui/notifications/tool-input-partial":
        this.ontoolinputpartial?.(params as ToolInputParams);
        break;
      case "ui/notifications/tool-input":
        this.ontoolinput?.(params as ToolInputParams);
        break;
      case "ui/notifications/tool-result":
        this.ontoolresult?.(params as ToolResult);
        break;
      case "ui/notifications/tool-cancelled":
        this.ontoolcancelled?.(params as { reason?: string });
        break;
      case "ui/notifications/host-context-changed":
        this.scheduleResizeNotification();
        break;
      default:
        break;
    }
  };

  private handleResponse(message: JsonRpcResponse): void {
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    if (message.error) {
      pending.reject(new Error(message.error.message ?? "MCP host request failed."));
      return;
    }
    pending.resolve(message.result);
  }

  private startResizeNotifications(): void {
    if (!("ResizeObserver" in window)) {
      this.scheduleResizeNotification();
      return;
    }
    this.resizeObserver = new ResizeObserver(() => this.scheduleResizeNotification());
    this.resizeObserver.observe(document.documentElement);
    this.resizeObserver.observe(document.body);
    this.scheduleResizeNotification();
  }

  private scheduleResizeNotification(): void {
    requestAnimationFrame(() => {
      const html = document.documentElement;
      const previousHeight = html.style.height;
      html.style.height = "max-content";
      const height = Math.ceil(html.getBoundingClientRect().height);
      html.style.height = previousHeight;
      const width = Math.ceil(window.innerWidth);
      if (width === this.lastWidth && height === this.lastHeight) return;
      this.lastWidth = width;
      this.lastHeight = height;
      this.notify("ui/notifications/size-changed", { width, height });
    });
  }
}

function isJsonRpcMessage(value: unknown): value is JsonRpcRequest | JsonRpcNotification | JsonRpcResponse {
  return isObject(value) && value.jsonrpc === "2.0";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
