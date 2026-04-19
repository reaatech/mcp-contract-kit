/**
 * Registry validator orchestrator
 */

import { Validator, TestCategory } from '../../types/domain.js';
import { schemaValidator } from './schema.validator.js';
import { invariantValidator } from './invariant.validator.js';
import { envExpansionValidator } from './env-expansion.validator.js';

/**
 * All registry validators
 */
export const registryValidators: Validator[] = [
  schemaValidator,
  invariantValidator,
  envExpansionValidator,
];

/**
 * Get validators for a specific category
 */
export function getRegistryValidators(): Validator[] {
  return registryValidators.filter((v) => v.category === TestCategory.REGISTRY);
}

// Re-export individual validators
export { schemaValidator } from './schema.validator.js';
export { invariantValidator } from './invariant.validator.js';
export { envExpansionValidator } from './env-expansion.validator.js';

// Re-export helper functions
export { validateAgentYAML } from './schema.validator.js';
export { validateInvariants } from './invariant.validator.js';
export { validateEnvExpansion, extractEnvVars } from './env-expansion.validator.js';
