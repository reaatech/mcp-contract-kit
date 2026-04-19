/**
 * Performance validator orchestrator
 */

import { Validator, TestCategory } from '../../types/domain.js';
import { latencyValidator } from './latency.validator.js';
import { concurrencyValidator } from './concurrency.validator.js';
import { rateLimitValidator } from './rate-limit.validator.js';

/**
 * All performance validators
 */
export const performanceValidators: Validator[] = [
  latencyValidator,
  concurrencyValidator,
  rateLimitValidator,
];

/**
 * Get validators for performance category
 */
export function getPerformanceValidators(): Validator[] {
  return performanceValidators.filter((v) => v.category === TestCategory.PERFORMANCE);
}

// Re-export individual validators
export { latencyValidator } from './latency.validator.js';
export { concurrencyValidator } from './concurrency.validator.js';
export { rateLimitValidator } from './rate-limit.validator.js';
