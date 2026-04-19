/**
 * Unit tests for Zod schemas
 */

import { describe, it, expect } from 'vitest';
import {
  AgentConfigSchema,
  MCPRequestSchema,
  MCPResponseSchema,
  ToolDefinitionSchema,
  AgentRequestContractSchema,
  AgentResponseContractSchema,
} from '../../src/types/schemas.js';

function omitKey<T extends Record<string, unknown>>(
  value: T,
  key: keyof T,
): Record<string, unknown> {
  const copy = { ...value };
  delete copy[key];
  return copy;
}

describe('schemas', () => {
  describe('AgentConfigSchema', () => {
    const validAgent = {
      agent_id: 'test-agent',
      display_name: 'Test Agent',
      description: 'A test agent for validation',
      endpoint: 'https://example.com/agent',
      type: 'mcp' as const,
      is_default: false,
      confidence_threshold: 0.7,
      clarification_required: true,
      examples: ['example 1', 'example 2'],
    };

    it('should validate a correct agent config', () => {
      const result = AgentConfigSchema.safeParse(validAgent);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const invalid = omitKey(validAgent, 'agent_id');
      const result = AgentConfigSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid endpoint URL', () => {
      const invalid = { ...validAgent, endpoint: 'not-a-url' };
      const result = AgentConfigSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject non-HTTPS endpoint', () => {
      const invalid = { ...validAgent, endpoint: 'http://example.com' };
      const result = AgentConfigSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid type', () => {
      const invalid = { ...validAgent, type: 'invalid' };
      const result = AgentConfigSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject confidence_threshold out of range', () => {
      const invalid = { ...validAgent, confidence_threshold: 1.5 };
      const result = AgentConfigSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject empty examples', () => {
      const invalid = { ...validAgent, examples: [] };
      const result = AgentConfigSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('MCPRequestSchema', () => {
    const validRequest = {
      jsonrpc: '2.0' as const,
      method: 'tools/list',
      id: 1,
    };

    it('should validate a correct request', () => {
      const result = MCPRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should accept params', () => {
      const withParams = { ...validRequest, params: { name: 'test' } };
      const result = MCPRequestSchema.safeParse(withParams);
      expect(result.success).toBe(true);
    });

    it('should reject missing jsonrpc', () => {
      const invalid = omitKey(validRequest, 'jsonrpc');
      const result = MCPRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject wrong jsonrpc version', () => {
      const invalid = { ...validRequest, jsonrpc: '1.0' };
      const result = MCPRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject missing method', () => {
      const invalid = omitKey(validRequest, 'method');
      const result = MCPRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const invalid = omitKey(validRequest, 'id');
      const result = MCPRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('MCPResponseSchema', () => {
    const validResultResponse = {
      jsonrpc: '2.0' as const,
      id: 1,
      result: { tools: [] },
    };

    const validErrorResponse = {
      jsonrpc: '2.0' as const,
      id: 1,
      error: { code: -32600, message: 'Invalid Request' },
    };

    it('should validate a result response', () => {
      const result = MCPResponseSchema.safeParse(validResultResponse);
      expect(result.success).toBe(true);
    });

    it('should validate an error response', () => {
      const result = MCPResponseSchema.safeParse(validErrorResponse);
      expect(result.success).toBe(true);
    });

    it('should reject missing jsonrpc', () => {
      const invalid = omitKey(validResultResponse, 'jsonrpc');
      const result = MCPResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const invalid = omitKey(validResultResponse, 'id');
      const result = MCPResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject both result and error', () => {
      const invalid = {
        ...validResultResponse,
        error: { code: -32600, message: 'Error' },
      };
      const result = MCPResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject neither result nor error', () => {
      const invalid = { jsonrpc: '2.0', id: 1 };
      const result = MCPResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('ToolDefinitionSchema', () => {
    const validTool = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    };

    it('should validate a correct tool definition', () => {
      const result = ToolDefinitionSchema.safeParse(validTool);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalid = { ...validTool, name: '' };
      const result = ToolDefinitionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject missing inputSchema', () => {
      const invalid = omitKey(validTool, 'inputSchema');
      const result = ToolDefinitionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('AgentRequestContractSchema', () => {
    const validRequest = {
      session_id: '550e8400-e29b-41d4-a716-446655440000',
      request_id: '660e8400-e29b-41d4-a716-446655440001',
      employee_id: 'emp123',
      raw_input: 'What is the weather?',
      display_name: 'Weather Agent',
      intent_summary: 'Get weather info',
    };

    it('should validate a correct request', () => {
      const result = AgentRequestContractSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const invalid = omitKey(validRequest, 'session_id');
      const result = AgentRequestContractSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format', () => {
      const invalid = { ...validRequest, session_id: 'not-a-uuid' };
      const result = AgentRequestContractSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject empty raw_input', () => {
      const invalid = { ...validRequest, raw_input: '' };
      const result = AgentRequestContractSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const withOptional = {
        ...validRequest,
        entities: { location: 'SF' },
        turn_history: [{ role: 'user', content: 'hello' }],
        workflow_state: { step: 1 },
      };
      const result = AgentRequestContractSchema.safeParse(withOptional);
      expect(result.success).toBe(true);
    });
  });

  describe('AgentResponseContractSchema', () => {
    const validResponse = {
      content: 'The weather is sunny.',
      workflow_complete: true,
    };

    it('should validate a correct response', () => {
      const result = AgentResponseContractSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const invalid = { ...validResponse, content: '' };
      const result = AgentResponseContractSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject missing content', () => {
      const invalid = omitKey(validResponse, 'content');
      const result = AgentResponseContractSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject missing workflow_complete', () => {
      const invalid = omitKey({ content: 'test', workflow_complete: true }, 'workflow_complete');
      const result = AgentResponseContractSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const withOptional = {
        ...validResponse,
        workflow_state: { next_step: 'done' },
        isError: false,
        errorMessage: '',
      };
      const result = AgentResponseContractSchema.safeParse(withOptional);
      expect(result.success).toBe(true);
    });
  });
});
