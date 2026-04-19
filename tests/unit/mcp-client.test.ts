import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildInitializeRequest,
  buildListToolsRequest,
  buildRequest,
  buildToolCallRequest,
  createTracingHeaders,
  HttpTransport,
  MCPHttpClient,
} from '../../src/mcp-client/index.js';
import { clearSpans, setCurrentContext } from '../../src/observability/index.js';

describe('mcp client and transport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearSpans();
    setCurrentContext(null);
  });

  it('builds JSON-RPC requests and tracing headers', () => {
    setCurrentContext({ traceId: 'a'.repeat(32), spanId: 'b'.repeat(16) });
    expect(buildRequest('tools/list', { ok: true }, 1)).toMatchObject({
      jsonrpc: '2.0',
      method: 'tools/list',
      id: 1,
    });
    expect(buildInitializeRequest(2).method).toBe('initialize');
    expect(buildListToolsRequest(3).method).toBe('tools/list');
    expect(buildToolCallRequest('tool', {}, 4).params?.name).toBe('tool');
    expect(createTracingHeaders().traceparent).toContain('00-');
  });

  it('parses JSON and SSE responses via the transport', async () => {
    const jsonFetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { ok: true } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', jsonFetch);
    const transport = new HttpTransport({
      endpoint: 'https://example.com',
      timeout: 1000,
      retries: 0,
    });

    const jsonResponse = await transport.request({ jsonrpc: '2.0', method: 'tools/list', id: 1 });
    expect(jsonResponse.body.result).toEqual({ ok: true });

    const sseFetch = vi.fn().mockResolvedValueOnce(
      new Response('event: message\ndata: {"jsonrpc":"2.0","id":2,"result":{"ok":true}}\n\n', {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      }),
    );
    vi.stubGlobal('fetch', sseFetch);
    const sseResponse = await transport.request({ jsonrpc: '2.0', method: 'tools/list', id: 2 });
    expect(sseResponse.body.result).toEqual({ ok: true });
  });

  it('retries with a fresh timeout controller after an aborted attempt', async () => {
    let callCount = 0;
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      callCount += 1;

      if (callCount === 1) {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        });
      }

      return Promise.resolve(
        new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { ok: true } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const transport = new HttpTransport({
      endpoint: 'https://example.com',
      timeout: 10,
      retries: 1,
    });

    const response = await transport.request({ jsonrpc: '2.0', method: 'tools/list', id: 1 });

    expect(response.body.result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('connects, lists tools, calls tools, and disconnects', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as {
        method: string;
        id: number;
        params?: { name?: string };
      };
      if (request.method === 'initialize') {
        return new Response(
          JSON.stringify({ jsonrpc: '2.0', id: request.id, result: { ok: true } }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      if (request.method === 'tools/list') {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: request.id,
            result: {
              tools: [
                {
                  name: 'handle_message',
                  description: 'desc',
                  inputSchema: {},
                },
              ],
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      if (request.method === 'tools/call') {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: request.id,
            result: {
              content: [{ type: 'text', text: 'ok' }],
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new MCPHttpClient({
      endpoint: 'https://example.com',
      timeout: 1000,
      retries: 0,
    });

    await client.connect();
    await expect(client.listTools()).resolves.toHaveLength(1);
    await expect(client.callTool('handle_message', {})).resolves.toMatchObject({
      content: [{ text: 'ok' }],
    });
    await expect(client.getSessionId()).resolves.toMatch(/-/);
    await client.disconnect();
  });
});
