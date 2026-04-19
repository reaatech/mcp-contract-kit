/**
 * Routing validator orchestrator
 */

import { Validator, TestCategory } from '../../types/domain.js';
import { requestContractValidator } from './request-contract.validator.js';
import { responseContractValidator } from './response-contract.validator.js';
import { compatibilityValidator } from './compatibility.validator.js';

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
