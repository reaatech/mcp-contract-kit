/**
 * SSRF protection validator
 */

import type { TestResult, ValidationContext, Validator } from '@reaatech/mcp-contract-core';
import { Severity, TestCategory, isPrivateURL, now } from '@reaatech/mcp-contract-core';

/**
 * SSRF validator implementation
 */
export const ssrfValidator: Validator = {
  name: 'ssrf-validator',
  category: TestCategory.SECURITY,
  severity: Severity.WARNING,

  async validate(context: ValidationContext): Promise<TestResult> {
    const start = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check the endpoint URL itself
    if (isPrivateURL(context.endpoint)) {
      warnings.push(
        `Endpoint URL '${context.endpoint}' points to a private/localhost address. This is acceptable for local testing, but not for production registries.`,
      );
    }

    // Check that the endpoint is HTTPS
    try {
      const url = new URL(context.endpoint);
      if (url.protocol !== 'https:') {
        warnings.push(
          `Endpoint URL '${context.endpoint}' does not use HTTPS. Production endpoints should use HTTPS.`,
        );
      }
    } catch {
      errors.push(`Endpoint URL '${context.endpoint}' is not a valid URL.`);
    }

    if (errors.length === 0 && warnings.length === 0) {
      return {
        validator: this.name,
        category: this.category,
        passed: true,
        severity: Severity.INFO,
        message: 'SSRF protection validation passed',
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
        message: `SSRF protection validation passed with ${warnings.length} warning(s)`,
        remediation:
          'Use public HTTPS endpoints for production registrations, and reject localhost/private URLs in agent metadata.',
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
      message: `SSRF protection validation failed with ${errors.length} error(s)`,
      remediation:
        'Use public HTTPS endpoints only. Never use localhost or private IP addresses in production.',
      details: { errors, warnings },
      durationMs: Math.round(performance.now() - start),
      timestamp: now(),
    };
  },
};
