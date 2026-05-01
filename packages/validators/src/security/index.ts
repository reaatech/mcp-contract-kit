/**
 * Security validator orchestrator
 */

import type { Validator } from '@reaatech/mcp-contract-core';
import { TestCategory } from '@reaatech/mcp-contract-core';
import { authValidator } from './auth.validator.js';
import { inputSanitizationValidator } from './input-sanitization.validator.js';
import { ssrfValidator } from './ssrf.validator.js';

/**
 * All security validators
 */
export const securityValidators: Validator[] = [
  ssrfValidator,
  authValidator,
  inputSanitizationValidator,
];

/**
 * Get validators for security category
 */
export function getSecurityValidators(): Validator[] {
  return securityValidators.filter((v) => v.category === TestCategory.SECURITY);
}

// Re-export individual validators
export { ssrfValidator } from './ssrf.validator.js';
export { authValidator } from './auth.validator.js';
export { inputSanitizationValidator } from './input-sanitization.validator.js';
