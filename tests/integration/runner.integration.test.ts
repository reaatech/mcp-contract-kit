import { afterEach, describe, expect, it, vi } from 'vitest';
import { runTests, validateProtocol, validateRouting } from '../../src/runner.js';

function installMockFetch(rateLimitAfter = 8): void {
  let requestCount = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      requestCount += 1;
      const request = JSON.parse(String(init?.body)) as {
        id: string | number;
        method: string;
        params?: Record<string, unknown>;
      };

      if (request.method === 'initialize') {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: request.id,
            result: { protocolVersion: '2024-11-05' },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      if (request.method === 'tools/list') {
        if (requestCount > rateLimitAfter) {
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: request.id,
              error: { code: 429, message: 'Too Many Requests' },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }

        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: request.id,
            result: {
              tools: [
                {
                  name: 'handle_message',
                  description: 'Main routing entry point',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      session_id: { type: 'string' },
                      request_id: { type: 'string' },
                      employee_id: { type: 'string' },
                      raw_input: { type: 'string' },
                    },
                    required: ['session_id', 'request_id', 'employee_id', 'raw_input'],
                  },
                },
              ],
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      if (request.method === 'tools/call') {
        const params = request.params as {
          name?: string;
          arguments?: Record<string, unknown>;
        };
        if (params.name !== 'handle_message') {
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [],
                isError: true,
              },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }

        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: request.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    content: `Handled: ${String(params.arguments?.raw_input ?? '')}`,
                    workflow_complete: true,
                    workflow_state: { echoed: true },
                  }),
                },
              ],
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          error: { code: -32601, message: 'Method not found' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }),
  );
}

describe('runner integration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('runs end-to-end suites through the real runner and client stack', async () => {
    installMockFetch(100);

    const report = await runTests({ endpoint: 'https://agents.example.com' });
    const protocol = await validateProtocol({
      endpoint: 'https://agents.example.com',
    });
    const routing = await validateRouting({
      endpoint: 'https://agents.example.com',
    });

    expect(report.results.length).toBeGreaterThan(0);
    expect(protocol.passed).toBe(true);
    expect(routing.passed).toBe(true);
  });
});
