/**
 * Zod schemas for validation
 */

import { z } from 'zod';

/**
 * Agent configuration schema for registry validation
 * Matches the expected YAML structure for agent definitions
 */
export const AgentConfigSchema = z.object({
  agent_id: z
    .string()
    .min(1, 'agent_id is required')
    .regex(/^[a-z0-9-]+$/, 'agent_id must contain only lowercase letters, numbers, and hyphens'),
  display_name: z.string().min(1, 'display_name is required'),
  description: z.string().min(1, 'description is required'),
  endpoint: z
    .string()
    .url('endpoint must be a valid URL')
    .refine((url) => url.startsWith('https://'), 'endpoint must use HTTPS in production'),
  type: z.literal('mcp'),
  is_default: z.boolean(),
  confidence_threshold: z.number().min(0).max(1),
  clarification_required: z.boolean(),
  examples: z.array(z.string()).min(1, 'at least one example is required'),
});

/** Type inference from schema */
export type AgentConfigInput = z.infer<typeof AgentConfigSchema>;

/** Alias for AgentConfigInput to match domain types */
export type AgentConfig = AgentConfigInput;

/** Agent type enum */
export type AgentType = 'mcp';

/**
 * JSON-RPC 2.0 request schema
 */
export const MCPRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.string().min(1),
  id: z.union([z.string(), z.number()]),
  params: z.record(z.unknown()).optional(),
});

/**
 * JSON-RPC 2.0 error schema
 */
export const MCPErrorSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.unknown().optional(),
});

/**
 * JSON-RPC 2.0 response schema
 * Enforces: exactly one of result or error must be present
 */
export const MCPResponseSchema = z
  .object({
    jsonrpc: z.literal('2.0'),
    id: z.union([z.string(), z.number()]),
    result: z.unknown().optional(),
    error: MCPErrorSchema.optional(),
  })
  .refine((data) => (data.result !== undefined) !== (data.error !== undefined), {
    message: 'Response must have exactly one of result or error',
    path: ['result', 'error'],
  });

/**
 * MCP tool definition schema
 */
export const ToolDefinitionSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(
      /^[a-z][a-z0-9_-]*$/,
      'Tool name must start with lowercase letter and contain only lowercase letters, numbers, underscores, and hyphens',
    ),
  description: z.string().min(1, 'description is required'),
  inputSchema: z.record(z.unknown()),
});

/** Type inference */
export type ToolDefinitionInput = z.infer<typeof ToolDefinitionSchema>;

/**
 * Agent request contract schema (orchestrator → agent)
 */
export const AgentRequestContractSchema = z.object({
  session_id: z.string().uuid('session_id must be a valid UUID'),
  request_id: z.string().uuid('request_id must be a valid UUID'),
  employee_id: z.string().min(1, 'employee_id is required'),
  raw_input: z.string().min(1, 'raw_input is required'),
  display_name: z.string().optional(),
  intent_summary: z.string().optional(),
  entities: z.record(z.unknown()).optional(),
  turn_history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .optional(),
  workflow_state: z.record(z.unknown()).optional(),
});

/** Type inference */
export type AgentRequestContract = z.infer<typeof AgentRequestContractSchema>;

/**
 * Agent response contract schema (agent → orchestrator)
 */
export const AgentResponseContractSchema = z.object({
  content: z.string().min(1, 'content must be a non-empty string'),
  workflow_complete: z.boolean(),
  workflow_state: z.record(z.unknown()).optional(),
  isError: z.boolean().optional(),
  errorMessage: z.string().optional(),
});

/** Type inference */
export type AgentResponseContract = z.infer<typeof AgentResponseContractSchema>;

/**
 * UUID validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate UUID format
 */
export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

export { isValidURL, isPrivateURL } from '../utils/index.js';
