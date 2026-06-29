/**
 * Transport layer for MCP requests.
 */

import type { MCPRequest, MCPResponse } from '@reaatech/mcp-contract-core';
import { retry } from '@reaatech/mcp-contract-core';

export interface TransportResponse<T> {
  body: MCPResponse<T>;
  status: number;
  headers: Headers;
}

export interface MCPTransport {
  request<T>(request: MCPRequest): Promise<TransportResponse<T>>;
  /** Set/override a header sent on every subsequent request (e.g. the session id). */
  setHeader(name: string, value: string): void;
}

export interface TransportOptions {
  endpoint: string;
  timeout: number;
  retries: number;
  headers?: Record<string, string>;
}

function parseSsePayload<T>(payload: string): MCPResponse<T> {
  const dataLines = payload
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter(Boolean);

  if (dataLines.length === 0) {
    throw new Error('SSE response did not include any data payload');
  }

  return JSON.parse(dataLines.join('\n')) as MCPResponse<T>;
}

export class HttpTransport implements MCPTransport {
  private readonly endpoint: string;
  private readonly timeout: number;
  private readonly retries: number;
  private readonly headers: Record<string, string>;

  constructor(options: TransportOptions) {
    this.endpoint = options.endpoint;
    this.timeout = options.timeout;
    this.retries = options.retries;
    // Defaults first; the MCP Streamable HTTP transport requires clients to accept
    // BOTH JSON and SSE, otherwise it answers HTTP 406 Not Acceptable.
    this.headers = {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    };
    // Merge caller headers with lowercased names so an explicit `--header Accept`
    // cleanly overrides the default instead of producing two case-variant keys
    // (HTTP header names are case-insensitive; servers read them lowercased).
    for (const [name, value] of Object.entries(options.headers ?? {})) {
      this.headers[name.toLowerCase()] = value;
    }
  }

  setHeader(name: string, value: string): void {
    this.headers[name.toLowerCase()] = value;
  }

  async request<T>(request: MCPRequest): Promise<TransportResponse<T>> {
    return retry(
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
          const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(request),
            signal: controller.signal,
          });
          const rawBody = await response.text();
          const contentType = response.headers.get('content-type') ?? '';

          let body: MCPResponse<T> | undefined;
          try {
            body = contentType.includes('text/event-stream')
              ? parseSsePayload<T>(rawBody)
              : (JSON.parse(rawBody) as MCPResponse<T>);
          } catch {
            body = undefined;
          }

          // JSON-RPC conveys protocol errors in the response body, sometimes with
          // a non-2xx HTTP status (e.g. 400 for "Invalid Request"). If the body is
          // a usable JSON-RPC response, return it so validators can inspect the
          // error rather than losing it to a thrown transport error. Only surface
          // an HTTP-level error when the body isn't a JSON-RPC response (genuine
          // transport/gateway failures like 429/5xx with non-JSON bodies).
          if (body && body.jsonrpc === '2.0') {
            return { body, status: response.status, headers: response.headers };
          }

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          if (!body) {
            throw new Error(`Failed to parse JSON-RPC response from ${this.endpoint}`);
          }

          return {
            body,
            status: response.status,
            headers: response.headers,
          };
        } finally {
          clearTimeout(timeoutId);
        }
      },
      {
        maxRetries: this.retries,
        baseDelayMs: 100,
        maxDelayMs: 2000,
      },
    );
  }
}
