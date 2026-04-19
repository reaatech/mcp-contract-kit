import { describe, expect, it } from 'vitest';
import {
  compatibilityValidator,
  requestContractValidator,
  responseContractValidator,
} from '../../src/validators/routing/index.js';
import {
  authValidator,
  inputSanitizationValidator,
  ssrfValidator,
} from '../../src/validators/security/index.js';
import {
  concurrencyValidator,
  latencyValidator,
  rateLimitValidator,
} from '../../src/validators/performance/index.js';
import { Severity, TestSuite } from '../../src/types/domain.js';
import { MockClient } from '../helpers/mock-client.js';

const tools = [
  {
    name: 'handle_message',
    description: 'Handle orchestrator requests',
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
];

function createContext(endpoint = 'http://127.0.0.1:3000'): {
  client: MockClient;
  endpoint: string;
  requestId: string;
  options: {
    timeout: number;
    retries: number;
    failOn: Severity;
    verbose: boolean;
    suites: TestSuite[];
  };
  artifacts: Record<string, unknown>;
} {
  const client = new MockClient({
    tools,
    callTool: async (name, args) => {
      if (name !== 'handle_message') {
        return { content: [], isError: true };
      }

      const rawInput = String(args.raw_input ?? '');
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              content: rawInput.includes('script') ? 'Sanitized output' : `Handled ${rawInput}`,
              workflow_complete: true,
              workflow_state: { length: rawInput.length },
            }),
          },
        ],
      };
    },
    sendRequest: async (request) => {
      if (request.method === 'tools/list') {
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: { tools },
        };
      }
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {},
      };
    },
  });

  return {
    client,
    endpoint,
    requestId: 'request-id',
    options: {
      timeout: 1000,
      retries: 0,
      failOn: Severity.CRITICAL,
      verbose: false,
      suites: [TestSuite.ROUTING, TestSuite.SECURITY, TestSuite.PERFORMANCE],
    },
    artifacts: {},
  };
}

function createFailingClient(): MockClient {
  return new MockClient({
    tools,
    callTool: async () => {
      throw new Error('Connection refused');
    },
    sendRequest: async () => {
      throw new Error('Connection refused');
    },
  });
}

function createErrorResponseClient(): MockClient {
  return new MockClient({
    tools,
    callTool: async () => {
      return { content: [], isError: true };
    },
  });
}

function createMissingHandleMessageClient(): MockClient {
  return new MockClient({
    tools: [
      {
        name: 'other_tool',
        description: 'Not handle_message',
        inputSchema: { type: 'object' },
      },
    ],
  });
}

describe('routing, security, and performance validators', () => {
  it('validates the routing contract end to end', async () => {
    const context = createContext();
    await expect(requestContractValidator.validate(context)).resolves.toMatchObject({
      passed: true,
    });
    await expect(responseContractValidator.validate(context)).resolves.toMatchObject({
      passed: true,
    });
    await expect(compatibilityValidator.validate(context)).resolves.toMatchObject({
      passed: true,
    });
  });

  it('reports local endpoint SSRF guidance as warnings', async () => {
    const result = await ssrfValidator.validate(createContext('http://localhost:3000'));
    expect(result.passed).toBe(true);
    expect(result.severity).toBe(Severity.WARNING);
  });

  it('surfaces auth, input sanitization, and performance guidance', async () => {
    const context = createContext();
    const auth = await authValidator.validate(context);
    const input = await inputSanitizationValidator.validate(context);
    const latency = await latencyValidator.validate(context);
    const concurrency = await concurrencyValidator.validate(context);
    const rateLimit = await rateLimitValidator.validate(context);

    expect(auth.passed).toBe(true);
    expect(input.passed).toBe(true);
    expect(latency.passed).toBe(true);
    expect(concurrency.passed).toBe(true);
    expect(rateLimit.passed).toBe(true);
  });

  it('handles request contract validator when client throws', async () => {
    const client = createFailingClient();
    const context = createContext();
    context.client = client;

    const result = await requestContractValidator.validate(context);
    expect(result.passed).toBe(false);
    expect(result.details?.errors).toContainEqual(expect.stringContaining('Failed to send request'));
  });

  it('handles request contract validator when handle_message is missing', async () => {
    const client = createMissingHandleMessageClient();
    const context = createContext();
    context.client = client;

    const result = await requestContractValidator.validate(context);
    expect(result.passed).toBe(false);
    expect(result.details?.errors).toContainEqual(expect.stringContaining('handle_message'));
  });

  it('handles response contract validator when client throws', async () => {
    const client = createFailingClient();
    const context = createContext();
    context.client = client;

    const result = await responseContractValidator.validate(context);
    expect(result.passed).toBe(false);
    expect(result.details?.errors).toContainEqual(expect.stringContaining('Failed to get response'));
  });

  it('handles response contract validator when response is error', async () => {
    const client = createErrorResponseClient();
    const context = createContext();
    context.client = client;

    const result = await responseContractValidator.validate(context);
    expect(result.passed).toBe(false);
    expect(result.details?.errors).toContainEqual(expect.stringContaining('returned an error'));
  });

  it('handles response contract validator when response has no content', async () => {
    const client = new MockClient({
      tools,
      callTool: async () => {
        return { content: [] };
      },
    });
    const context = createContext();
    context.client = client;

    const result = await responseContractValidator.validate(context);
    expect(result.passed).toBe(false);
    expect(result.details?.errors).toContainEqual(expect.stringContaining('no content'));
  });

  it('handles compatibility validator when client throws', async () => {
    const client = createFailingClient();
    const context = createContext();
    context.client = client;

    const result = await compatibilityValidator.validate(context);
    expect(result.passed).toBe(false);
  });

  it('detects SSRF vulnerability with private IP', async () => {
    const result = await ssrfValidator.validate(createContext('http://10.0.0.1:8080'));
    expect(result.passed).toBe(true);
    expect(result.severity).toBe(Severity.WARNING);
  });

  it('detects SSRF vulnerability with internal hostname', async () => {
    const result = await ssrfValidator.validate(createContext('http://internal.corp:8080'));
    expect(result.passed).toBe(true);
  });

  it('validates public endpoint passes SSRF check', async () => {
    const result = await ssrfValidator.validate(createContext('https://api.example.com'));
    expect(result.severity).toBe(Severity.INFO);
  });

  it('concurrency validator handles all requests failing', async () => {
    const client = createFailingClient();
    const context = createContext();
    context.client = client;

    const result = await concurrencyValidator.validate(context);
    expect(result.passed).toBe(false);
    expect(result.details?.errors).toContain('All concurrent requests failed');
  });

  it('rate limit validator handles request error', async () => {
    const client = createFailingClient();
    const context = createContext();
    context.client = client;

    const result = await rateLimitValidator.validate(context);
    expect(result.passed).toBe(true);
    expect(result.details).toBeDefined();
  });

  it('detects input sanitization issues', async () => {
    const sqlPattern = "' OR '1'='1";
    const client = new MockClient({
      tools,
      callTool: async (name, _args) => {
        if (name !== 'handle_message') {
          return { content: [], isError: true };
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                content: `User input: ${sqlPattern}`,
                workflow_complete: true,
              }),
            },
          ],
        };
      },
    });
    const context = createContext();
    context.client = client;

    const result = await inputSanitizationValidator.validate(context);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe(Severity.WARNING);
  });

  it('rate limit validator handles rate limited response', async () => {
    const client = new MockClient({
      tools,
      sendRequest: async () => {
        return { jsonrpc: '2.0', id: 1, error: { code: 429, message: 'Too Many Requests' } };
      },
    });
    const context = createContext();
    context.client = client;

    const result = await rateLimitValidator.validate(context);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe(Severity.WARNING);
    expect(result.details?.rateLimited).toBe(true);
  });

  it('rate limit validator handles rate limited error message', async () => {
    const client = new MockClient({
      tools,
      sendRequest: async () => {
        throw new Error('429 Too Many Requests');
      },
    });
    const context = createContext();
    context.client = client;

    const result = await rateLimitValidator.validate(context);
    expect(result.passed).toBe(true);
    expect(result.details?.rateLimited).toBe(true);
  });

  it('concurrency validator handles partial failures', async () => {
    let count = 0;
    const client = new MockClient({
      tools,
      sendRequest: async () => {
        count++;
        if (count <= 3) return { jsonrpc: '2.0', id: 1, result: {} };
        throw new Error('Connection refused');
      },
    });
    const context = createContext();
    context.client = client;

    const result = await concurrencyValidator.validate(context);
    expect(result.passed).toBe(false);
    expect(result.details?.errors).toContain('2 of 5 concurrent requests failed');
  });

  it('ssrf validator detects non-HTTPS endpoint', async () => {
    const result = await ssrfValidator.validate(createContext('http://api.example.com'));
    expect(result.passed).toBe(true);
    expect(result.severity).toBe(Severity.WARNING);
  });

  it('ssrf validator detects invalid URL', async () => {
    const result = await ssrfValidator.validate(createContext('not-a-valid-url'));
    expect(result.passed).toBe(false);
  });
});
