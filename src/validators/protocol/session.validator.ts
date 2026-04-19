/**
 * Session management validator
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
 * Session validator implementation
 */
export const sessionValidator: Validator = {
  name: 'session-validator',
  category: TestCategory.PROTOCOL,
  severity: Severity.WARNING,

  async validate(context: ValidationContext): Promise<TestResult> {
    const start = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Test 1: Get session ID
      const sessionId1 = await context.client.getSessionId();
      if (!sessionId1) {
        errors.push('Session ID is empty or undefined');
      }

      // Test 2: Session ID should be consistent across calls
      const sessionId2 = await context.client.getSessionId();
      if (sessionId1 !== sessionId2) {
        warnings.push('Session ID changed between calls - sessions may not persist');
      }

      // Test 3: Session ID should be a valid format (UUID or similar)
      if (sessionId1 && sessionId1.length < 8) {
        warnings.push(
          `Session ID is very short (${sessionId1.length} chars). Consider using UUIDs.`,
        );
      }

      // Test 4: Different clients should have isolated session identifiers.
      const secondaryClient = createMCPClient({
        endpoint: context.endpoint,
        timeout: context.options.timeout,
        retries: context.options.retries,
      });
      try {
        const sessionIdOtherClient = await secondaryClient.getSessionId();
        if (sessionIdOtherClient === sessionId1) {
          warnings.push('Separate clients reused the same session ID');
        }
      } finally {
        await secondaryClient.disconnect();
      }

      // Test 5: Make a request and verify session persists
      try {
        await context.client.sendRequest({
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 1,
        });

        const sessionId3 = await context.client.getSessionId();
        if (sessionId1 !== sessionId3) {
          warnings.push('Session ID changed after making a request');
        }
      } catch (error) {
        warnings.push(`Failed to verify session persistence: ${(error as Error).message}`);
      }
    } catch (error) {
      errors.push(`Session validation failed: ${(error as Error).message}`);
    }

    if (errors.length === 0 && warnings.length === 0) {
      return {
        validator: this.name,
        category: this.category,
        passed: true,
        severity: Severity.INFO,
        message: 'Session management validated successfully',
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
        message: `Session validation passed with ${warnings.length} warning(s)`,
        details: { warnings },
        durationMs: Math.round(performance.now() - start),
        timestamp: now(),
      };
    }

    return {
      validator: this.name,
      category: this.category,
      passed: false,
      severity: this.severity,
      message: `Session validation failed with ${errors.length} error(s)`,
      remediation:
        'Ensure the MCP server properly manages session state and returns consistent session IDs',
      details: { errors, warnings },
      durationMs: Math.round(performance.now() - start),
      timestamp: now(),
    };
  },
};
