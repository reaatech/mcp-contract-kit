import { createServer, Server } from 'node:http';

interface MockServerOptions {
  requireAuth?: boolean;
  latencyMs?: number;
  rateLimitAfter?: number;
}

export async function startMockMcpServer(
  options: MockServerOptions = {},
): Promise<{ server: Server; url: string }> {
  let requestCount = 0;
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }

    if (options.requireAuth) {
      const auth = req.headers.authorization ?? req.headers['x-api-key'];
      if (!auth || String(auth).includes('invalid-contract-kit')) {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
    }

    if (options.rateLimitAfter && requestCount >= options.rateLimitAfter) {
      res.writeHead(429, {
        'content-type': 'application/json',
        'retry-after': '1',
      });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 0,
          error: { code: 429, message: 'Too Many Requests' },
        }),
      );
      return;
    }

    requestCount += 1;
    if (options.latencyMs) {
      await new Promise((resolve) => setTimeout(resolve, options.latencyMs));
    }

    const request = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as {
      id: string | number;
      method: string;
      params?: Record<string, unknown>;
    };

    if (request.method === 'initialize') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          result: { protocolVersion: '2024-11-05' },
        }),
      );
      return;
    }

    if (request.method === 'tools/list') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
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
      );
      return;
    }

    if (request.method === 'tools/call') {
      const params = request.params as {
        name?: string;
        arguments?: Record<string, unknown>;
      };
      if (params.name !== 'handle_message') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: request.id,
            error: { code: -32601, message: 'Unknown tool' },
          }),
        );
        return;
      }

      const rawInput = String(params.arguments?.raw_input ?? '');
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  content: rawInput.length === 0 ? 'Empty input handled' : `Handled: ${rawInput}`,
                  workflow_complete: true,
                  workflow_state: { length: rawInput.length },
                }),
              },
            ],
          },
        }),
      );
      return;
    }

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        jsonrpc: '2.0',
        id: request.id,
        error: { code: -32601, message: 'Method not found' },
      }),
    );
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start mock MCP server');
  }

  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
  };
}
