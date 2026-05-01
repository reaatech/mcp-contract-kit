# @reaatech/mcp-contract-client

[![npm version](https://img.shields.io/npm/v/@reaatech/mcp-contract-client)](https://www.npmjs.com/package/@reaatech/mcp-contract-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/reaatech/mcp-contract-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/reaatech/mcp-contract-kit/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change before the stable release.

MCP client SDK for connecting to and testing Model Context Protocol (MCP) servers over HTTP. Supports JSON-RPC 2.0 request/response, tool discovery, tool invocation, tracing propagation, and SSE streaming.

## Installation

```bash
npm install @reaatech/mcp-contract-client
```

```bash
pnpm add @reaatech/mcp-contract-client
```

## Feature Overview

- Full JSON-RPC 2.0 request/response over HTTP
- Factory function (`createMCPClient`) and class API (`MCPHttpClient`)
- Tool discovery via `tools/list` and tool invocation via `tools/call`
- Automatic retry with configurable backoff
- AbortSignal-based request timeouts
- SSE (Server-Sent Events) stream parsing for streaming transports
- Trace context propagation via W3C `traceparent` headers
- Typed request builders for `initialize`, `tools/list`, and `tools/call`
- Composable transport layer (`MCPTransport` interface)

## Quick Start

```ts
import { createMCPClient, HttpTransport } from '@reaatech/mcp-contract-client';

// Create a client
const client = createMCPClient({
  endpoint: 'http://localhost:8080',
  timeout: 10000,
  retries: 2,
});

// Connect (sends initialize, or falls back to tools/list)
await client.connect();

// Discover tools
const tools = await client.listTools();
console.log(tools.map(t => t.name));

// Call a tool
const result = await client.callTool('my_tool', { key: 'value' });
console.log(result.content);

// Disconnect
await client.disconnect();
```

## API Reference

### `createMCPClient(options)`

Factory function that returns an `MCPClient` instance.

```ts
function createMCPClient(
  options: Omit<MCPClientOptions, 'endpoint'> & { endpoint: string }
): MCPClient;
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `endpoint` | `string` | _(required)_ | URL of the MCP server |
| `timeout` | `number` | _(required)_ | Request timeout in milliseconds |
| `retries` | `number` | _(required)_ | Maximum retry attempts on failure |
| `headers` | `Record<string, string>` | `undefined` | Additional headers to include with every request |

`MCPClient` is the interface from `@reaatech/mcp-contract-core`:

```ts
interface MCPClient {
  connect(): Promise<void>;
  sendRequest<T>(request: MCPRequest): Promise<MCPResponse<T>>;
  callTool(name: string, args: Record<string, unknown>): Promise<ToolResult>;
  listTools(): Promise<ToolDefinition[]>;
  disconnect(): Promise<void>;
  getSessionId(): Promise<string>;
}
```

---

### `MCPHttpClient` (class)

Concrete `MCPClient` implementation that communicates with an MCP server over HTTP. Uses `HttpTransport` internally.

```ts
import { MCPHttpClient } from '@reaatech/mcp-contract-client';
```

#### Constructor

```ts
new MCPHttpClient(options: MCPClientOptions)
```

`MCPClientOptions`:

| Field | Type | Description |
|-------|------|-------------|
| `endpoint` | `string` | Server URL |
| `timeout` | `number` | Per-request timeout (ms) |
| `retries` | `number` | Max retry attempts |
| `headers` | `Record<string, string>` _(optional)_ | Extra HTTP headers |

#### Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `connect()` | `Promise<void>` | Sends an `initialize` request (falls back to `tools/list` to verify connectivity). Idempotent — safe to call when already connected. |
| `sendRequest<T>(request)` | `Promise<MCPResponse<T>>` | Sends an arbitrary JSON-RPC request and returns the parsed response body. |
| `callTool(name, args)` | `Promise<ToolResult>` | Sends a `tools/call` request and returns the tool result (`content` array + `isError` flag). |
| `listTools()` | `Promise<ToolDefinition[]>` | Sends a `tools/list` request and returns the parsed tool definitions. Throws if the server returns an error. |
| `disconnect()` | `Promise<void>` | Sends a `notifications/terminated` notification and resets internal state. Safe to call when already disconnected. |
| `getSessionId()` | `Promise<string>` | Returns (or generates) a UUID session identifier. |

---

### `HttpTransport` (class)

Low-level HTTP transport that implements `MCPTransport`. Handles request serialization, response parsing, SSE detection, retries, and timeout.

```ts
import { HttpTransport } from '@reaatech/mcp-contract-client';
```

#### Constructor

```ts
new HttpTransport(options: TransportOptions)
```

#### TransportOptions

| Field | Type | Description |
|-------|------|-------------|
| `endpoint` | `string` | Server URL |
| `timeout` | `number` | Request timeout (ms), enforced via `AbortController` |
| `retries` | `number` | Max retry attempts with exponential backoff (base=100ms, max=2000ms) |
| `headers` | `Record<string, string>` _(optional)_ | Extra HTTP headers (merged with `content-type: application/json`) |

#### Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `request<T>(request)` | `Promise<TransportResponse<T>>` | Sends a JSON-RPC request via `POST` and returns the full transport response including status code and headers. Automatically handles SSE (`text/event-stream`) and JSON content types. |

---

### `TransportResponse<T>`

Return value from `MCPTransport.request()`.

| Field | Type | Description |
|-------|------|-------------|
| `body` | `MCPResponse<T>` | Parsed JSON-RPC response body |
| `status` | `number` | HTTP status code |
| `headers` | `Headers` | Response headers |

### `MCPTransport` (interface)

Transport abstraction that can be implemented for custom transports.

```ts
interface MCPTransport {
  request<T>(request: MCPRequest): Promise<TransportResponse<T>>;
}
```

---

### Request Builders

Convenience functions that construct `MCPRequest` objects conforming to JSON-RPC 2.0.

#### `buildRequest(method, params?, id?)`

Constructs a generic JSON-RPC 2.0 request.

```ts
function buildRequest(
  method: string,
  params?: Record<string, unknown>,
  id?: string | number
): MCPRequest;
```

#### `buildInitializeRequest(id?)`

Constructs an `initialize` request with `protocolVersion: "2024-11-05"` and client info.

```ts
function buildInitializeRequest(id?: string | number): MCPRequest;
```

#### `buildListToolsRequest(id?)`

Constructs a `tools/list` request.

```ts
function buildListToolsRequest(id?: string | number): MCPRequest;
```

#### `buildToolCallRequest(name, args, id?)`

Constructs a `tools/call` request with the given tool name and arguments.

```ts
function buildToolCallRequest(
  name: string,
  args: Record<string, unknown>,
  id?: string | number
): MCPRequest;
```

---

### `createTracingHeaders()`

Generates W3C trace context propagation headers (`traceparent`) from the current OpenTelemetry context. Returns an empty object when no active context is found.

```ts
function createTracingHeaders(): Record<string, string>;
```

Commonly used to inject distributed tracing headers into `MCPClientOptions.headers`:

```ts
const client = createMCPClient({
  endpoint: 'http://localhost:8080',
  timeout: 10000,
  retries: 2,
  headers: createTracingHeaders(),
});
```

## Usage Patterns

### Sending Custom Requests

Use `sendRequest` with a request builder for any MCP method:

```ts
import { buildRequest } from '@reaatech/mcp-contract-client';

const response = await client.sendRequest(
  buildRequest('resources/list', {}, 1)
);
```

### Tool Discovery & Invocation

```ts
const tools = await client.listTools();

for (const tool of tools) {
  console.log(`${tool.name}: ${tool.description}`);
}

const result = await client.callTool('greet', { name: 'World' });
if (result.isError) {
  console.error('Tool returned an error');
} else {
  for (const item of result.content) {
    if (item.type === 'text') {
      console.log(item.text);
    }
  }
}
```

### Retry & Timeout Configuration

The transport retries on network failures and HTTP errors with exponential backoff. Configure via constructor options:

```ts
const client = createMCPClient({
  endpoint: 'http://localhost:8080',
  timeout: 5000,   // 5s per request
  retries: 3,       // up to 3 retries
});
```

### Using the Transport Directly

For cases where you need access to response status codes or headers, use `HttpTransport` directly:

```ts
const transport = new HttpTransport({
  endpoint: 'http://localhost:8080',
  timeout: 10000,
  retries: 2,
});

const { body, status, headers } = await transport.request(
  buildInitializeRequest()
);

console.log(status); // 200
```

## Error Handling

The client throws on connection failures, timeouts, and transport-level errors:

```ts
try {
  await client.connect();
} catch (error) {
  console.error('Connection failed:', error.message);
  // Example: "Failed to connect to MCP server at http://localhost:8080: ..."
}
```

JSON-RPC errors appear on the response object, not as thrown exceptions:

```ts
const response = await client.sendRequest(
  buildRequest('tools/call', { name: 'nonexistent', arguments: {} })
);

if (response.error) {
  console.error(`RPC error ${response.error.code}: ${response.error.message}`);
}
```

The `callTool` helper normalizes errors — a JSON-RPC error produces a `ToolResult` with `isError: true` and an empty `content` array.

## Related Packages

- [@reaatech/mcp-contract-core](https://www.npmjs.com/package/@reaatech/mcp-contract-core) — Domain types, JSON-RPC 2.0 schemas, and shared utilities
- [@reaatech/mcp-contract-validators](https://www.npmjs.com/package/@reaatech/mcp-contract-validators) — Conformance validators
- [@reaatech/mcp-contract-observability](https://www.npmjs.com/package/@reaatech/mcp-contract-observability) — OpenTelemetry tracing and metrics
- [@reaatech/mcp-contract-cli](https://www.npmjs.com/package/@reaatech/mcp-contract-cli) — CLI tool and programmatic API
- [@reaatech/mcp-contract-reporters](https://www.npmjs.com/package/@reaatech/mcp-contract-reporters) — Test result reporters (console, JSON, HTML)

## License

MIT
