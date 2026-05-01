/**
 * Response contract validator - validates agent → orchestrator response format
 */

import type { TestResult, ValidationContext, Validator } from '@reaatech/mcp-contract-core';
import {
  AgentResponseContractSchema,
  Severity,
  TestCategory,
  generateUUID,
  now,
} from '@reaatech/mcp-contract-core';

/**
 * Validate a response against the contract schema
 */
function validateResponseFormat(response: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const result = AgentResponseContractSchema.safeParse(response);

  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push(`${issue.path.join('.')}: ${issue.message}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function extractContractPayload(response: {
  content?: Array<{ text?: string; data?: unknown }>;
  isError?: boolean;
}): Record<string, unknown> | null {
  const firstContent = response.content?.[0];
  if (!firstContent) {
    return null;
  }

  if (firstContent.data && typeof firstContent.data === 'object') {
    return firstContent.data as Record<string, unknown>;
  }

  if (typeof firstContent.text === 'string') {
    try {
      return JSON.parse(firstContent.text) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Response contract validator implementation
 */
export const responseContractValidator: Validator = {
  name: 'response-contract-validator',
  category: TestCategory.ROUTING,
  severity: Severity.CRITICAL,

  async validate(context: ValidationContext): Promise<TestResult> {
    const start = performance.now();
    const errors: string[] = [];
    // Test that the agent returns a properly formatted response
    try {
      const request = {
        session_id: generateUUID(),
        request_id: generateUUID(),
        employee_id: 'test-employee-001',
        raw_input: 'Hello',
      };

      const response = await context.client.callTool('handle_message', request);

      // Check response structure
      if (!response.isError && response.content && response.content.length > 0) {
        const parsed = extractContractPayload(response);
        if (!parsed) {
          errors.push('Response content did not include a JSON/text contract payload');
        } else {
          const validation = validateResponseFormat(parsed);
          if (!validation.valid) {
            errors.push(...validation.errors.map((e) => `Response: ${e}`));
          }
        }
      } else if (response.isError) {
        errors.push('handle_message returned an error for a basic valid request');
      } else {
        errors.push('handle_message returned no content');
      }
    } catch (error) {
      errors.push(`Failed to get response from agent: ${(error as Error).message}`);
    }

    if (errors.length === 0) {
      return {
        validator: this.name,
        category: this.category,
        passed: true,
        severity: Severity.INFO,
        message: 'Response contract validation passed',
        durationMs: Math.round(performance.now() - start),
        timestamp: now(),
      };
    }

    return {
      validator: this.name,
      category: this.category,
      passed: false,
      severity: this.severity,
      message: `Response contract validation failed with ${errors.length} error(s)`,
      remediation:
        'Ensure agent responses include content (non-empty string) and workflow_complete (boolean) fields',
      details: { errors },
      durationMs: Math.round(performance.now() - start),
      timestamp: now(),
    };
  },
};
