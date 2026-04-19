/**
 * Authentication validator
 */

import {
  Validator,
  TestResult,
  ValidationContext,
  TestCategory,
  Severity,
} from '../../types/domain.js';
import { now } from '../../utils/index.js';
import { createMCPClient } from '../../mcp-client/index.js';

/**
 * Auth validator implementation
 */
export const authValidator: Validator = {
  name: 'auth-validator',
  category: TestCategory.SECURITY,
  severity: Severity.WARNING,

  async validate(context: ValidationContext): Promise<TestResult> {
    const start = performance.now();
    const warnings: string[] = [];
    let requiresAuth = false;

    try {
      const invalidClient = createMCPClient({
        endpoint: context.endpoint,
        timeout: context.options.timeout,
        retries: 0,
        headers: {
          Authorization: 'Bearer invalid-contract-kit-token',
          'x-api-key': 'invalid-contract-kit-key',
        },
      });

      try {
        await invalidClient.connect();
        await invalidClient.listTools();
        warnings.push(
          'Server accepted request without authentication. Consider requiring API keys or bearer tokens.',
        );
      } catch (error) {
        const errorMsg = (error as Error).message;
        if (
          errorMsg.includes('401') ||
          errorMsg.includes('Unauthorized') ||
          errorMsg.includes('Authentication')
        ) {
          requiresAuth = true;
        } else {
          warnings.push(`Authentication check returned unexpected error: ${errorMsg}`);
        }
      }
    } catch (error) {
      warnings.push(`Auth validation encountered an error: ${(error as Error).message}`);
    }

    if (requiresAuth) {
      return {
        validator: this.name,
        category: this.category,
        passed: true,
        severity: Severity.INFO,
        message: 'Authentication validation passed - server requires authentication',
        durationMs: Math.round(performance.now() - start),
        timestamp: now(),
      };
    }

    if (warnings.length > 0) {
      return {
        validator: this.name,
        category: this.category,
        passed: true,
        severity: Severity.WARNING,
        message: `Authentication validation passed with ${warnings.length} warning(s)`,
        details: { warnings },
        durationMs: Math.round(performance.now() - start),
        timestamp: now(),
      };
    }

    return {
      validator: this.name,
      category: this.category,
      passed: true,
      severity: Severity.INFO,
      message: 'Authentication validation passed - no authentication required (development mode)',
      durationMs: Math.round(performance.now() - start),
      timestamp: now(),
    };
  },
};
