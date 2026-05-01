/**
 * Request contract validator - validates orchestrator → agent request format
 */

import type {
  TestResult,
  ToolDefinition,
  ValidationContext,
  Validator,
} from '@reaatech/mcp-contract-core';
import {
  AgentRequestContractSchema,
  Severity,
  TestCategory,
  generateUUID,
  now,
} from '@reaatech/mcp-contract-core';

/**
 * Create a valid test request
 */
function createTestRequest(): Record<string, unknown> {
  return {
    session_id: generateUUID(),
    request_id: generateUUID(),
    employee_id: 'test-employee-001',
    raw_input: 'What is the IT policy for password resets?',
    display_name: 'Test User',
  };
}

/**
 * Request contract validator implementation
 */
export const requestContractValidator: Validator = {
  name: 'request-contract-validator',
  category: TestCategory.ROUTING,
  severity: Severity.CRITICAL,

  async validate(context: ValidationContext): Promise<TestResult> {
    const start = performance.now();
    const errors: string[] = [];
    let handleMessageTool: ToolDefinition | undefined;

    // Validate the schema itself
    const testRequest = createTestRequest();
    const result = AgentRequestContractSchema.safeParse(testRequest);

    if (!result.success) {
      errors.push('Test request failed schema validation (internal error)');
    }

    // Test that the agent can receive a properly formatted request
    try {
      const tools = await context.client.listTools();
      handleMessageTool = tools.find((tool) => tool.name === 'handle_message');
      if (!handleMessageTool) {
        errors.push('Agent does not expose the required handle_message tool');
      } else {
        const response = await context.client.callTool('handle_message', testRequest);

        if (response.isError && (!response.content || response.content.length === 0)) {
          errors.push('handle_message rejected a valid contract request');
        }
      }
    } catch (error) {
      // Tool call failed - may not have handle_message
      errors.push(`Failed to send request to agent: ${(error as Error).message}`);
    }

    if (errors.length === 0) {
      return {
        validator: this.name,
        category: this.category,
        passed: true,
        severity: Severity.INFO,
        message: 'Request contract validation passed',
        details: {
          requestSchema: Object.keys(testRequest),
          inputSchema: handleMessageTool?.inputSchema ?? {},
        },
        durationMs: Math.round(performance.now() - start),
        timestamp: now(),
      };
    }

    return {
      validator: this.name,
      category: this.category,
      passed: false,
      severity: this.severity,
      message: `Request contract validation failed with ${errors.length} error(s)`,
      remediation:
        'Ensure agent supports the standard request format with session_id, request_id, employee_id, and raw_input fields',
      details: { errors },
      durationMs: Math.round(performance.now() - start),
      timestamp: now(),
    };
  },
};
