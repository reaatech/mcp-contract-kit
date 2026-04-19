import {
  MCPClient,
  MCPRequest,
  MCPResponse,
  ToolDefinition,
  ToolResult,
} from '../../src/types/domain.js';

interface MockClientOptions {
  tools?: ToolDefinition[];
  sendRequest?: (request: MCPRequest) => Promise<MCPResponse>;
  callTool?: (name: string, args: Record<string, unknown>) => Promise<ToolResult>;
  sessionId?: string;
}

export class MockClient implements MCPClient {
  readonly requests: MCPRequest[] = [];
  readonly toolCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  private readonly tools: ToolDefinition[];
  private readonly sendRequestImpl?: MockClientOptions['sendRequest'];
  private readonly callToolImpl?: MockClientOptions['callTool'];
  private readonly sessionId: string;

  constructor(options: MockClientOptions = {}) {
    this.tools = options.tools ?? [];
    this.sendRequestImpl = options.sendRequest;
    this.callToolImpl = options.callTool;
    this.sessionId = options.sessionId ?? 'mock-session-id';
  }

  async connect(): Promise<void> {
    return undefined;
  }

  async sendRequest<T = unknown>(request: MCPRequest): Promise<MCPResponse<T>> {
    this.requests.push(request);
    if (this.sendRequestImpl) {
      return this.sendRequestImpl(request) as Promise<MCPResponse<T>>;
    }

    if (request.method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: { tools: this.tools } as T,
      };
    }

    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {} as T,
    };
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    this.toolCalls.push({ name, args });
    if (this.callToolImpl) {
      return this.callToolImpl(name, args);
    }

    if (name === 'handle_message') {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              content: `Echo: ${String(args.raw_input ?? '')}`,
              workflow_complete: true,
              workflow_state: { echoed: true },
            }),
          },
        ],
      };
    }

    return {
      content: [],
      isError: true,
    };
  }

  async listTools(): Promise<ToolDefinition[]> {
    return this.tools;
  }

  async disconnect(): Promise<void> {
    return undefined;
  }

  async getSessionId(): Promise<string> {
    return this.sessionId;
  }
}
