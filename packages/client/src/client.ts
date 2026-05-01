/**
 * MCP Client for testing MCP servers
 * Implements the MCPClient interface for conformance testing
 */

import type {
  MCPClient,
  MCPRequest,
  MCPResponse,
  ToolDefinition,
  ToolResult,
} from '@reaatech/mcp-contract-core';
import { generateId } from '@reaatech/mcp-contract-core';
import {
  buildInitializeRequest,
  buildListToolsRequest,
  buildToolCallRequest,
} from './request-builder.js';
import { HttpTransport } from './transport.js';
import type { MCPTransport } from './transport.js';

interface MCPClientOptions {
  endpoint: string;
  timeout: number;
  retries: number;
  headers?: Record<string, string>;
}

/**
 * MCP Client implementation for HTTP-based MCP servers
 */
export class MCPHttpClient implements MCPClient {
  private readonly endpoint: string;
  private sessionId: string | null = null;
  private connected = false;
  private requestId = 0;
  private readonly transport: MCPTransport;

  constructor(options: MCPClientOptions) {
    this.endpoint = options.endpoint;
    this.transport = new HttpTransport(options);
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    // Test connectivity with a simple request
    try {
      await this.sendRequest(buildInitializeRequest(this.nextId()));
      this.connected = true;
    } catch (_error) {
      // If initialize fails, try tools/list as a connectivity check
      try {
        await this.sendRequest(buildListToolsRequest(this.nextId()));
        this.connected = true;
      } catch (innerError) {
        throw new Error(
          `Failed to connect to MCP server at ${this.endpoint}: ${(innerError as Error).message}`,
        );
      }
    }
  }

  async sendRequest<T = unknown>(request: MCPRequest): Promise<MCPResponse<T>> {
    const response = await this.transport.request<T>(request);
    return response.body;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.sendRequest<{
      content: Array<{ type: string; text?: string; data?: unknown }>;
      isError?: boolean;
    }>(buildToolCallRequest(name, args, this.nextId()));

    if (response.error) {
      return {
        content: [],
        isError: true,
      };
    }

    return {
      content: response.result?.content ?? [],
      isError: response.result?.isError ?? false,
    };
  }

  async listTools(): Promise<ToolDefinition[]> {
    const response = await this.sendRequest<{
      tools: Array<{
        name: string;
        description?: string;
        inputSchema?: Record<string, unknown>;
      }>;
    }>(buildListToolsRequest(this.nextId()));

    if (response.error) {
      throw new Error(`Failed to list tools: ${response.error.message}`);
    }

    return (response.result?.tools ?? []).map((tool) => ({
      name: tool.name,
      description: tool.description ?? '',
      inputSchema: tool.inputSchema ?? {},
    }));
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      try {
        await this.sendRequest({
          jsonrpc: '2.0',
          method: 'notifications/terminated',
          id: this.nextId(),
        });
      } catch {
        // Ignore errors on disconnect
      }
    }
    this.connected = false;
    this.sessionId = null;
  }

  async getSessionId(): Promise<string> {
    this.sessionId ??= generateId();
    return this.sessionId;
  }

  private nextId(): number {
    return ++this.requestId;
  }
}

/**
 * Create an MCP client for the given endpoint
 */
export function createMCPClient(
  options: Omit<MCPClientOptions, 'endpoint'> & { endpoint: string },
): MCPClient {
  return new MCPHttpClient({
    endpoint: options.endpoint,
    timeout: options.timeout,
    retries: options.retries,
    headers: options.headers,
  });
}
