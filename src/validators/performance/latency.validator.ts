/**
 * Latency validator - measures response times
 */

import {
  Validator,
  TestResult,
  ValidationContext,
  TestCategory,
  Severity,
} from '../../types/domain.js';
import { now, calculateStats } from '../../utils/index.js';

/** Default latency thresholds in milliseconds */
const THRESHOLDS = {
  p50: 1000,
  p90: 3000,
  p99: 5000,
};

/**
 * Latency validator implementation
 */
export const latencyValidator: Validator = {
  name: 'latency-validator',
  category: TestCategory.PERFORMANCE,
  severity: Severity.WARNING,

  async validate(context: ValidationContext): Promise<TestResult> {
    const start = performance.now();
    const errors: string[] = [];
    const latencies: number[] = [];
    const sampleSize = 5;

    try {
      // Measure latency for multiple requests
      for (let i = 0; i < sampleSize; i++) {
        const requestStart = performance.now();
        await context.client.sendRequest({
          jsonrpc: '2.0',
          method: 'tools/list',
          id: i + 1,
        });
        const requestEnd = performance.now();
        latencies.push(Math.round(requestEnd - requestStart));
      }

      const stats = calculateStats(latencies);

      // Check against thresholds
      if (stats.p50 > THRESHOLDS.p50) {
        errors.push(
          `p50 latency (${Math.round(stats.p50)}ms) exceeds threshold (${THRESHOLDS.p50}ms)`,
        );
      }
      if (stats.p90 > THRESHOLDS.p90) {
        errors.push(
          `p90 latency (${Math.round(stats.p90)}ms) exceeds threshold (${THRESHOLDS.p90}ms)`,
        );
      }
      if (stats.p99 > THRESHOLDS.p99) {
        errors.push(
          `p99 latency (${Math.round(stats.p99)}ms) exceeds threshold (${THRESHOLDS.p99}ms)`,
        );
      }

      if (errors.length === 0) {
        return {
          validator: this.name,
          category: this.category,
          passed: true,
          severity: Severity.INFO,
          message: `Latency validation passed. p50: ${Math.round(stats.p50)}ms, p90: ${Math.round(stats.p90)}ms, p99: ${Math.round(stats.p99)}ms`,
          details: { ...stats, sampleSize, thresholds: THRESHOLDS },
          durationMs: Math.round(performance.now() - start),
          timestamp: now(),
        };
      }

      return {
        validator: this.name,
        category: this.category,
        passed: false,
        severity: this.severity,
        message: `Latency validation failed with ${errors.length} error(s)`,
        remediation:
          'Optimize tool execution, add caching, or increase server resources to reduce latency.',
        details: { errors, stats: { ...stats, sampleSize }, thresholds: THRESHOLDS },
        durationMs: Math.round(performance.now() - start),
        timestamp: now(),
      };
    } catch (error) {
      return {
        validator: this.name,
        category: this.category,
        passed: false,
        severity: this.severity,
        message: `Latency validation failed: ${(error as Error).message}`,
        details: { error: (error as Error).message },
        durationMs: Math.round(performance.now() - start),
        timestamp: now(),
      };
    }
  },
};
