import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMCPClient } from '../src/client.js';

function jsonResponse(body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json', ...headers }),
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('MCPHttpClient streamable-HTTP behavior', () => {
  it('sends a default Accept header for JSON + SSE', async () => {
    const headerSnapshots: Record<string, string>[] = [];
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      headerSnapshots.push({ ...(init.headers as Record<string, string>) });
      return jsonResponse({ jsonrpc: '2.0', id: 1, result: {} });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = createMCPClient({ endpoint: 'http://x/mcp', timeout: 1000, retries: 0 });
    await client.connect();

    expect(headerSnapshots[0].accept).toBe('application/json, text/event-stream');
  });

  it('captures Mcp-Session-Id from initialize and echoes it on later requests', async () => {
    const headerSnapshots: Record<string, string>[] = [];
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      headerSnapshots.push({ ...(init.headers as Record<string, string>) });
      // Only the first (initialize) response carries the session id.
      const extra: Record<string, string> =
        headerSnapshots.length === 1 ? { 'mcp-session-id': 'sess-abc' } : {};
      return jsonResponse({ jsonrpc: '2.0', id: 1, result: { tools: [] } }, extra);
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = createMCPClient({ endpoint: 'http://x/mcp', timeout: 1000, retries: 0 });
    await client.connect(); // initialize → server assigns session
    await client.listTools(); // must echo the session id back

    expect(headerSnapshots[0]['mcp-session-id']).toBeUndefined();
    expect(headerSnapshots[1]['mcp-session-id']).toBe('sess-abc');
    expect(await client.getSessionId()).toBe('sess-abc');
  });

  it('lets an explicit Accept header override the default', async () => {
    const headerSnapshots: Record<string, string>[] = [];
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      headerSnapshots.push({ ...(init.headers as Record<string, string>) });
      return jsonResponse({ jsonrpc: '2.0', id: 1, result: {} });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = createMCPClient({
      endpoint: 'http://x/mcp',
      timeout: 1000,
      retries: 0,
      headers: { Accept: 'application/json' },
    });
    await client.connect();

    // Names are normalized to lowercase, so the caller's Accept cleanly replaces
    // the default with a single `accept` key (no case-variant duplicate).
    expect(headerSnapshots[0].accept).toBe('application/json');
    expect(headerSnapshots[0].Accept).toBeUndefined();
  });
});
