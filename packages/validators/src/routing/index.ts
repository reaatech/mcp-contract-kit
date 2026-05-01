/**
 * Routing validator orchestrator
 */

import type { Validator } from '@reaatech/mcp-contract-core';
import { TestCategory } from '@reaatech/mcp-contract-core';
import { compatibilityValidator } from './compatibility.validator.js';
import { requestContractValidator } from './request-contract.validator.js';
import { responseContractValidator } from './response-contract.validator.js';

/**
 * All routing validators
 */
export const routingValidators: Validator[] = [
  requestContractValidator,
  responseContractValidator,
  compatibilityValidator,
];

/**
 * Get validators for routing category
 */
export function getRoutingValidators(): Validator[] {
  return routingValidators.filter((v) => v.category === TestCategory.ROUTING);
}

// Re-export individual validators
export { requestContractValidator } from './request-contract.validator.js';
export { responseContractValidator } from './response-contract.validator.js';
export { compatibilityValidator } from './compatibility.validator.js';
