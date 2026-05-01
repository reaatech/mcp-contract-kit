/**
 * Protocol validator orchestrator
 */

import type { Validator } from '@reaatech/mcp-contract-core';
import { TestCategory } from '@reaatech/mcp-contract-core';
import { jsonrpcValidator } from './jsonrpc.validator.js';
import { sessionValidator } from './session.validator.js';
import { toolDiscoveryValidator } from './tool-discovery.validator.js';
import { toolExecutionValidator } from './tool-execution.validator.js';

/**
 * All protocol validators
 */
export const protocolValidators: Validator[] = [
  jsonrpcValidator,
  toolDiscoveryValidator,
  toolExecutionValidator,
  sessionValidator,
];

/**
 * Get validators for protocol category
 */
export function getProtocolValidators(): Validator[] {
  return protocolValidators.filter((v) => v.category === TestCategory.PROTOCOL);
}

// Re-export individual validators
export { jsonrpcValidator } from './jsonrpc.validator.js';
export { toolDiscoveryValidator } from './tool-discovery.validator.js';
export { toolExecutionValidator } from './tool-execution.validator.js';
export { sessionValidator } from './session.validator.js';
