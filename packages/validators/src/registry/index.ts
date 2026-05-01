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

// Re-export individual validators
export { schemaValidator } from './schema.validator.js';
export { invariantValidator } from './invariant.validator.js';
export { envExpansionValidator } from './env-expansion.validator.js';

// Re-export helper functions
export { validateAgentYAML } from './schema.validator.js';
export { validateInvariants } from './invariant.validator.js';
export { validateEnvExpansion, extractEnvVars } from './env-expansion.validator.js';
