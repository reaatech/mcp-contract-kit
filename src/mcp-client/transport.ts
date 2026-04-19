/**
 * Transport layer for MCP requests.
 */

import { MCPRequest, MCPResponse } from '../types/domain.js';
import { retry } from '../utils/index.js';

export interface TransportResponse<T> {
  body: MCPResponse<T>;
  status: number;
  headers: Headers;
}

export interface MCPTransport {
  request<T>(request: MCPRequest): Promise<TransportResponse<T>>;
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
    this.headers = {
      'content-type': 'application/json',
      ...options.headers,
    };
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

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const contentType = response.headers.get('content-type') ?? '';
          const body = contentType.includes('text/event-stream')
            ? parseSsePayload<T>(rawBody)
            : (JSON.parse(rawBody) as MCPResponse<T>);

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
