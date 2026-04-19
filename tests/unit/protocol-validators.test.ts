import { describe, expect, it } from 'vitest';
import {
  jsonrpcValidator,
  sessionValidator,
  toolDiscoveryValidator,
  toolExecutionValidator,
} from '../../src/validators/protocol/index.js';
import { Severity, TestSuite, MCPError, MCPResponse } from '../../src/types/domain.js';
import { MockClient } from '../helpers/mock-client.js';

const baseTools = [
  {
    name: 'handle_message',
    description: 'Handle orchestrator requests',
    inputSchema: {
      type: 'object',
      properties: {
        raw_input: { type: 'string' },
      },
      required: ['raw_input'],
    },
  },
];

function createContext(client: MockClient): {
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
  return {
    client,
    endpoint: 'https://agents.example.com',
    requestId: 'request-id',
    options: {
      timeout: 1000,
      retries: 0,
      failOn: Severity.CRITICAL,
      verbose: false,
      suites: [TestSuite.PROTOCOL],
    },
    artifacts: {},
  };
}

describe('protocol validators', () => {
  it('validates compliant JSON-RPC behavior', async () => {
    const client = new MockClient({
      tools: baseTools,
      sendRequest: async (request) => {
        if (request.method === 'nonexistent/method') {
          return {
            jsonrpc: '2.0',
            id: request.id,
            error: { code: -32601, message: 'Method not found' },
          };
        }

        if (request.method === 'tools/list') {
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: { tools: baseTools },
          };
        }

        return {
          jsonrpc: '2.0',
          id: request.id,
          result: { ok: true },
        };
      },
    });

    const result = await jsonrpcValidator.validate(createContext(client));
    expect(result.passed).toBe(true);
  });

  it('detects invalid tool discovery metadata', async () => {
    const client = new MockClient({
      tools: [
        {
          name: 'Bad Tool',
          description: '',
          inputSchema: { type: 'oops' },
        },
      ],
    });

    const result = await toolDiscoveryValidator.validate(createContext(client));
    expect(result.passed).toBe(false);
    expect(String(result.details?.errors)).toContain('Bad Tool');
  });

  it('validates tool execution and warns for permissive validation', async () => {
    const client = new MockClient({
      tools: baseTools,
      callTool: async (name, args) => {
        if (name !== 'handle_message') {
          return { content: [], isError: true };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                content: `Handled ${String(args.raw_input ?? 'default')}`,
                workflow_complete: true,
              }),
            },
          ],
        };
      },
    });

    const result = await toolExecutionValidator.validate(createContext(client));
    expect(result.passed).toBe(true);
    expect(result.severity).toBe(Severity.WARNING);
  });

  it('checks session consistency and isolation', async () => {
    const client = new MockClient({
      tools: baseTools,
      sessionId: 'session-12345',
    });

    const result = await sessionValidator.validate(createContext(client));
    expect(result.passed).toBe(true);
  });

  it('detects JSON-RPC response without jsonrpc field', async () => {
    const client = new MockClient({
      tools: baseTools,
      sendRequest: async (request) => {
        return {
          jsonrpc: '1.0',
          id: request.id,
          result: {},
        } as unknown as MCPResponse;
      },
    });

    const result = await jsonrpcValidator.validate(createContext(client));
    expect(result.passed).toBe(false);
    expect(result.details?.errors).toContainEqual(
      expect.stringContaining("'jsonrpc'"),
    );
  });

  it('detects JSON-RPC response with mismatched id', async () => {
    const client = new MockClient({
      tools: baseTools,
      sendRequest: async () => {
        return {
          jsonrpc: '2.0',
          id: 'wrong-id',
          result: {},
        };
      },
    });

    const result = await jsonrpcValidator.validate(createContext(client));
    expect(result.passed).toBe(false);
    expect(result.details?.errors).toContainEqual(
      expect.stringContaining("id"),
    );
  });

  it('detects JSON-RPC response with both result and error', async () => {
    const client = new MockClient({
      tools: baseTools,
      sendRequest: async (request) => {
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: { ok: true },
          error: { code: -32600, message: 'Invalid request' },
        };
      },
    });

    const result = await jsonrpcValidator.validate(createContext(client));
    expect(result.passed).toBe(false);
    expect(result.details?.errors).toContainEqual(
      expect.stringContaining("both 'result' and 'error'"),
    );
  });

  it('detects JSON-RPC response with neither result nor error', async () => {
    const client = new MockClient({
      tools: baseTools,
      sendRequest: async (request) => {
        return {
          jsonrpc: '2.0',
          id: request.id,
        };
      },
    });

    const result = await jsonrpcValidator.validate(createContext(client));
    expect(result.passed).toBe(false);
  });

  it('detects invalid error code outside valid range', async () => {
    const client = new MockClient({
      tools: baseTools,
      sendRequest: async (request) => {
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: { code: -40000, message: 'Invalid error code' },
        } as unknown as MCPResponse;
      },
    });

    const result = await jsonrpcValidator.validate(createContext(client));
    expect(result.passed).toBe(false);
    expect(result.details?.errors).toContainEqual(
      expect.stringContaining('Error code -40000 is outside valid ranges'),
    );
  });

  it('detects error response without error code', async () => {
    const client = new MockClient({
      tools: baseTools,
      sendRequest: async (request) => {
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: { message: 'Error without code' } as MCPError,
        };
      },
    });

    const result = await jsonrpcValidator.validate(createContext(client));
    expect(result.passed).toBe(false);
  });

  it('handles sendRequest throwing an error', async () => {
    const client = new MockClient({
      tools: baseTools,
      sendRequest: async () => {
        throw new Error('Connection refused');
      },
    });

    const result = await jsonrpcValidator.validate(createContext(client));
    expect(result.passed).toBe(false);
    expect(result.details?.errors).toContainEqual(
      expect.stringContaining('Connection refused'),
    );
  });

  it('detects tool discovery when tools/list returns non-array', async () => {
    const client = new MockClient({
      tools: baseTools,
    });
    (client as unknown as { listTools: () => Promise<unknown> }).listTools = async (): Promise<unknown> => 'not an array';

    const result = await toolDiscoveryValidator.validate(createContext(client));
    expect(result.passed).toBe(false);
    expect(result.details?.errors).toContain('tools/list did not return an array');
  });

  it('detects duplicate tool names', async () => {
    const client = new MockClient({
      tools: [
        { name: 'tool_a', description: 'Tool A', inputSchema: { type: 'object' } },
        { name: 'tool_a', description: 'Duplicate tool A', inputSchema: { type: 'object' } },
      ],
    });

    const result = await toolDiscoveryValidator.validate(createContext(client));
    expect(result.passed).toBe(false);
    expect(String(result.details?.errors)).toContain('Duplicate');
  });

  it('detects empty tools array', async () => {
    const client = new MockClient({
      tools: [],
    });

    const result = await toolDiscoveryValidator.validate(createContext(client));
    expect(result.passed).toBe(false);
    expect(String(result.details?.errors)).toContain('No tools found');
  });

  it('detects tool with uppercase name', async () => {
    const client = new MockClient({
      tools: [
        { name: 'InvalidTool', description: 'Has uppercase', inputSchema: { type: 'object' } },
      ],
    });

    const result = await toolDiscoveryValidator.validate(createContext(client));
    expect(result.passed).toBe(false);
    expect(String(result.details?.errors)).toContain('lowercase');
  });

  it('detects tool with missing description', async () => {
    const client = new MockClient({
      tools: [
        { name: 'valid_tool', description: '', inputSchema: { type: 'object' } },
      ],
    });

    const result = await toolDiscoveryValidator.validate(createContext(client));
    expect(result.passed).toBe(false);
    expect(String(result.details?.errors)).toContain('description');
  });

  it('detects tool with array inputSchema instead of object', async () => {
    const client = new MockClient({
      tools: [
        { name: 'valid_tool', description: 'Valid tool', inputSchema: [] as unknown as Record<string, unknown> },
      ],
    });

    const result = await toolDiscoveryValidator.validate(createContext(client));
    expect(result.passed).toBe(false);
    expect(String(result.details?.errors)).toContain('must be an object');
  });

  it('handles tool execution with no tools', async () => {
    const client = new MockClient({
      tools: [],
    });

    const result = await toolExecutionValidator.validate(createContext(client));
    expect(result.passed).toBe(false);
    expect(result.message).toContain('No tools available');
  });

  it('detects tool execution error', async () => {
    const client = new MockClient({
      tools: baseTools,
      callTool: async () => {
        throw new Error('Execution failed');
      },
    });

    const result = await toolExecutionValidator.validate(createContext(client));
    expect(result.passed).toBe(false);
    expect(String(result.details?.errors)).toContain('Execution failed');
  });

  it('detects unknown tool not returning error', async () => {
    const client = new MockClient({
      tools: baseTools,
      callTool: async () => {
        return { content: [], isError: false };
      },
    });

    const result = await toolExecutionValidator.validate(createContext(client));
    expect(result.passed).toBe(false);
    expect(String(result.details?.errors)).toContain('Unknown tool should return isError');
  });

  it('handles listTools throwing an error', async () => {
    const client = new MockClient({
      tools: baseTools,
    });
    (client as unknown as { listTools: () => Promise<unknown> }).listTools = async () => {
      throw new Error('Failed to list tools');
    };

    const result = await toolDiscoveryValidator.validate(createContext(client));
    expect(result.passed).toBe(false);
    expect(String(result.details?.errors)).toContain('tools/list request failed');
  });

  it('detects short session ID', async () => {
    const client = new MockClient({
      tools: baseTools,
      sessionId: 'abc',
    });

    const result = await sessionValidator.validate(createContext(client));
    expect(result.severity).toBe(Severity.WARNING);
  });

  it('handles session validation error', async () => {
    const client = new MockClient({
      tools: baseTools,
    });
    (client as unknown as { getSessionId: () => Promise<string> }).getSessionId = async () => {
      throw new Error('Session error');
    };

    const result = await sessionValidator.validate(createContext(client));
    expect(result.passed).toBe(false);
    expect(String(result.details?.errors)).toContain('Session validation failed');
  });
});
