/**
 * Compatibility validator - end-to-end contract testing
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
 * Test scenarios for compatibility testing
 */
const TEST_SCENARIOS = [
  {
    name: 'normal_input',
    input: 'What is the IT policy for password resets?',
  },
  {
    name: 'empty_input',
    input: '',
  },
  {
    name: 'long_input',
    input: 'A'.repeat(1000),
  },
  {
    name: 'unicode_input',
    input: '你好世界 🌍 Ñoño',
  },
  {
    name: 'special_chars',
    input: '<script>alert("xss")</script>',
  },
];

/**
 * Compatibility validator implementation
 */
export const compatibilityValidator: Validator = {
  name: 'compatibility-validator',
  category: TestCategory.ROUTING,
  severity: Severity.WARNING,

  async validate(context: ValidationContext): Promise<TestResult> {
    const start = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const results: Record<string, { success: boolean; error?: string }> = {};

    for (const scenario of TEST_SCENARIOS) {
      try {
        const request = {
          session_id: generateUUID(),
          request_id: generateUUID(),
          employee_id: 'test-employee-001',
          raw_input: scenario.input,
        };

        const response = await context.client.callTool('handle_message', request);

        if (response.isError) {
          throw new Error('handle_message returned isError for scenario');
        }

        let payload: Record<string, unknown> | null = null;
        try {
          const data = response.content?.[0]?.data;
          const text = response.content?.[0]?.text;
          if (data && typeof data === 'object' && !Array.isArray(data)) {
            payload = data as Record<string, unknown>;
          } else if (text) {
            payload = JSON.parse(text) as Record<string, unknown>;
          }
        } catch {
          payload = null;
        }

        const validation = AgentResponseContractSchema.safeParse(payload);
        if (!validation.success) {
          throw new Error(validation.error.issues.map((issue) => issue.message).join('; '));
        }

        results[scenario.name] = { success: true };
      } catch (error) {
        const errorMsg = (error as Error).message;
        results[scenario.name] = { success: false, error: errorMsg };

        // Empty input might legitimately fail
        if (scenario.name === 'empty_input') {
          warnings.push(`Empty input handling: ${errorMsg}`);
        } else {
          errors.push(`Scenario '${scenario.name}' failed: ${errorMsg}`);
        }
      }
    }

    // Check error handling consistency
    const failedScenarios = Object.entries(results).filter(([, r]) => !r.success);
    if (failedScenarios.length > 0 && failedScenarios.length < TEST_SCENARIOS.length) {
      warnings.push(
        `${failedScenarios.length} of ${TEST_SCENARIOS.length} scenarios failed - check error handling consistency`,
      );
    }

    if (errors.length === 0 && warnings.length === 0) {
      return {
        validator: this.name,
        category: this.category,
        passed: true,
        severity: Severity.INFO,
        message: `Compatibility validation passed. All ${TEST_SCENARIOS.length} scenarios succeeded.`,
        details: { scenarios: Object.keys(results) },
        durationMs: Math.round(performance.now() - start),
        timestamp: now(),
      };
    }

    if (errors.length === 0) {
      return {
        validator: this.name,
        category: this.category,
        passed: true,
        severity: Severity.WARNING,
        message: `Compatibility validation passed with ${warnings.length} warning(s)`,
        details: { warnings, results },
        durationMs: Math.round(performance.now() - start),
        timestamp: now(),
      };
    }

    return {
      validator: this.name,
      category: this.category,
      passed: false,
      severity: this.severity,
      message: `Compatibility validation failed with ${errors.length} error(s)`,
      remediation:
        'Ensure agent handles various input scenarios gracefully and returns consistent error responses',
      details: { errors, warnings, results },
      durationMs: Math.round(performance.now() - start),
      timestamp: now(),
    };
  },
};
