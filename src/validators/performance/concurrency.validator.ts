/**
 * Concurrency validator - tests concurrent request handling
 */

import {
  Validator,
  TestResult,
  ValidationContext,
  TestCategory,
  Severity,
} from '../../types/domain.js';
import { now } from '../../utils/index.js';

/**
 * Concurrency validator implementation
 */
export const concurrencyValidator: Validator = {
  name: 'concurrency-validator',
  category: TestCategory.PERFORMANCE,
  severity: Severity.WARNING,

  async validate(context: ValidationContext): Promise<TestResult> {
    const start = performance.now();
    const errors: string[] = [];
    const concurrentRequests = 5;
    const results: Array<{ success: boolean; error?: string; durationMs: number }> = [];

    try {
      // Send concurrent requests
      const promises = Array.from({ length: concurrentRequests }, async (_, i) => {
        const requestStart = performance.now();
        try {
          await context.client.sendRequest({
            jsonrpc: '2.0',
            method: 'tools/list',
            id: i + 1,
          });
          return { success: true, durationMs: Math.round(performance.now() - requestStart) };
        } catch (error) {
          return {
            success: false,
            error: (error as Error).message,
            durationMs: Math.round(performance.now() - requestStart),
          };
        }
      });

      const concurrentResults = await Promise.all(promises);
      results.push(...concurrentResults);

      // Check results
      const failures = results.filter((r) => !r.success);
      if (failures.length > 0) {
        errors.push(`${failures.length} of ${concurrentRequests} concurrent requests failed`);
      }

      // Check for data integrity (all responses should be valid)
      const successful = results.filter((r) => r.success);
      if (successful.length === 0) {
        errors.push('All concurrent requests failed');
      }
    } catch (error) {
      errors.push(`Concurrency test failed: ${(error as Error).message}`);
    }

    if (errors.length === 0) {
      const durations = results.map((r) => r.durationMs);
      const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);

      return {
        validator: this.name,
        category: this.category,
        passed: true,
        severity: Severity.INFO,
        message: `Concurrency validation passed. ${concurrentRequests} concurrent requests completed. Avg: ${avgDuration}ms`,
        details: { concurrentRequests, avgDuration, results: durations },
        durationMs: Math.round(performance.now() - start),
        timestamp: now(),
      };
    }

    return {
      validator: this.name,
      category: this.category,
      passed: false,
      severity: this.severity,
      message: `Concurrency validation failed with ${errors.length} error(s)`,
      remediation:
        'Ensure the server can handle concurrent requests without race conditions or resource exhaustion.',
      details: { errors, results },
      durationMs: Math.round(performance.now() - start),
      timestamp: now(),
    };
  },
};
