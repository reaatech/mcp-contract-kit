/**
 * Helpers for constructing MCP JSON-RPC requests and tracing headers.
 */

import type { MCPRequest } from '@reaatech/mcp-contract-core';
import { generateUUID } from '@reaatech/mcp-contract-core';
import { getVersion } from '@reaatech/mcp-contract-core';
import { getCurrentContext, toTraceParent } from '@reaatech/mcp-contract-observability';

export function buildRequest(
  method: string,
  params?: Record<string, unknown>,
  id: string | number = generateUUID(),
): MCPRequest {
  return {
    jsonrpc: '2.0',
    method,
    id,
    ...(params ? { params } : {}),
  };
}

export function buildInitializeRequest(id: string | number = generateUUID()): MCPRequest {
  return buildRequest(
    'initialize',
    {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'mcp-contract-kit',
        version: getVersion(),
      },
    },
    id,
  );
}

export function buildListToolsRequest(id: string | number = generateUUID()): MCPRequest {
  return buildRequest('tools/list', undefined, id);
}

export function buildToolCallRequest(
  name: string,
  args: Record<string, unknown>,
  id: string | number = generateUUID(),
): MCPRequest {
  return buildRequest(
    'tools/call',
    {
      name,
      arguments: args,
    },
    id,
  );
}

export function createTracingHeaders(): Record<string, string> {
  const context = getCurrentContext();
  if (!context) {
    return {};
  }

  return {
    traceparent: toTraceParent(context),
  };
}
