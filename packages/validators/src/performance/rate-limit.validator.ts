/**
 * Rate limit validator - tests rate limiting behavior
 */

import type { TestResult, ValidationContext, Validator } from '@reaatech/mcp-contract-core';
import { Severity, TestCategory, now } from '@reaatech/mcp-contract-core';

interface RateLimitOptions {
  burstRequests?: number;
}

const DEFAULT_BURST_REQUESTS = 20;

/**
 * Rate limit validator implementation
 */
export const rateLimitValidator: Validator = {
  name: 'rate-limit-validator',
  category: TestCategory.PERFORMANCE,
  severity: Severity.WARNING,

  async validate(context: ValidationContext): Promise<TestResult> {
    const start = performance.now();
    const warnings: string[] = [];
    const options = (context.artifacts?.rateLimitOptions as RateLimitOptions) ?? {};
    const burstRequests = options.burstRequests ?? DEFAULT_BURST_REQUESTS;
    let rateLimited = false;

    try {
      // Send a burst of requests to trigger rate limiting
      for (let i = 0; i < burstRequests; i++) {
        try {
          const response = await context.client.sendRequest({
            jsonrpc: '2.0',
            method: 'tools/list',
            id: i + 1,
          });

          // Check if response indicates rate limiting
          if (response.error?.code === 429) {
            rateLimited = true;
            break;
          }
        } catch (error) {
          const errorMsg = (error as Error).message;
          if (errorMsg.includes('429') || errorMsg.includes('Too Many Request')) {
            rateLimited = true;
            break;
          }
        }
      }

      // If rate limited, check for Retry-After header behavior
      if (rateLimited) {
        warnings.push('Server implements rate limiting (429 response detected)');
      }
    } catch (error) {
      warnings.push(`Rate limit test encountered an error: ${(error as Error).message}`);
    }

    if (!rateLimited) {
      warnings.push(
        `Server did not rate limit after ${burstRequests} rapid requests. Consider implementing rate limiting for production.`,
      );
    }

    if (warnings.length === 0) {
      return {
        validator: this.name,
        category: this.category,
        passed: true,
        severity: Severity.INFO,
        message: 'Rate limiting detected - server implements rate limiting',
        details: { rateLimited, burstRequests, warnings },
        durationMs: Math.round(performance.now() - start),
        timestamp: now(),
      };
    }

    return {
      validator: this.name,
      category: this.category,
      passed: true,
      severity: Severity.WARNING,
      message: rateLimited
        ? 'Rate limiting detected with follow-up recommendations'
        : `No rate limiting detected after ${burstRequests} requests`,
      details: { rateLimited, burstRequests, warnings },
      durationMs: Math.round(performance.now() - start),
      timestamp: now(),
    };
  },
};
