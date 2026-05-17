/**
 * Registry validator orchestrator
 */

import type { Validator } from '@reaatech/mcp-contract-core';
import { TestCategory } from '@reaatech/mcp-contract-core';
import { envExpansionValidator } from './env-expansion.validator.js';
import { invariantValidator } from './invariant.validator.js';
import { schemaValidator } from './schema.validator.js';

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

export {
  envExpansionValidator,
  extractEnvVars,
  validateEnvExpansion,
} from './env-expansion.validator.js';
export { invariantValidator, validateInvariants } from './invariant.validator.js';
// Re-export individual validators
// Re-export helper functions
export { schemaValidator, validateAgentYAML } from './schema.validator.js';
