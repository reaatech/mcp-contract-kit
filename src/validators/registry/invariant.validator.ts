/**
 * Invariant validator for agent registry
 * Ensures: one default agent, unique IDs, valid endpoints, etc.
 */

import {
  Validator,
  TestResult,
  ValidationContext,
  TestCategory,
  Severity,
  ValidationError,
} from '../../types/domain.js';
import { AgentConfig, AgentConfigInput, isPrivateURL, isValidURL } from '../../types/schemas.js';
import { now } from '../../utils/index.js';
import { loadRegistryFile } from './shared.js';

interface InvariantValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Check that exactly one agent is marked as default
 */
function checkSingleDefault(agents: AgentConfig[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const defaults = agents.filter((a) => a.is_default);

  if (defaults.length === 0) {
    errors.push({
      field: 'is_default',
      message: 'No agent is marked as default. Exactly one agent must be the default.',
      severity: Severity.CRITICAL,
      type: 'NO_DEFAULT_AGENT',
    });
  } else if (defaults.length > 1) {
    errors.push({
      field: 'is_default',
      message: `Multiple agents (${defaults.length}) are marked as default. Exactly one agent must be the default.`,
      severity: Severity.CRITICAL,
      type: 'MULTIPLE_DEFAULTS',
    });
  }

  return errors;
}

/**
 * Check that the default agent has confidence_threshold = 0
 */
function checkDefaultThreshold(agents: AgentConfig[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const defaultAgent = agents.find((a) => a.is_default);

  if (defaultAgent && defaultAgent.confidence_threshold !== 0) {
    errors.push({
      field: 'confidence_threshold',
      message: `Default agent must have confidence_threshold = 0, got ${defaultAgent.confidence_threshold}`,
      severity: Severity.CRITICAL,
      type: 'INVALID_DEFAULT_THRESHOLD',
    });
  }

  return errors;
}

/**
 * Check that all agent IDs are unique
 */
function checkUniqueIds(agents: AgentConfig[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const ids = agents.map((a) => a.agent_id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

  if (duplicates.length > 0) {
    errors.push({
      field: 'agent_id',
      message: `Duplicate agent IDs found: ${[...new Set(duplicates)].join(', ')}`,
      severity: Severity.CRITICAL,
      type: 'DUPLICATE_AGENT_IDS',
    });
  }

  return errors;
}

/**
 * Check that endpoints are valid and not private/localhost
 */
function checkEndpoints(agents: AgentConfig[]): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const agent of agents) {
    if (!isValidURL(agent.endpoint)) {
      errors.push({
        field: 'endpoint',
        message: `Agent '${agent.agent_id}' has an invalid endpoint URL: ${agent.endpoint}`,
        severity: Severity.CRITICAL,
        type: 'INVALID_ENDPOINT_URL',
      });
    } else if (isPrivateURL(agent.endpoint)) {
      errors.push({
        field: 'endpoint',
        message: `Agent '${agent.agent_id}' has a private/localhost endpoint: ${agent.endpoint}. This is a security risk (SSRF).`,
        severity: Severity.CRITICAL,
        type: 'SSRF_VULNERABILITY',
      });
    } else if (agent.endpoint.length > 2048) {
      errors.push({
        field: 'endpoint',
        message: `Agent '${agent.agent_id}' endpoint URL exceeds 2048 characters`,
        severity: Severity.CRITICAL,
        type: 'ENDPOINT_TOO_LONG',
      });
    }
  }

  return errors;
}

/**
 * Validate invariants across a collection of agents
 */
export function validateInvariants(agents: AgentConfig[]): InvariantValidationResult {
  const errors: ValidationError[] = [];

  errors.push(...checkSingleDefault(agents));
  errors.push(...checkDefaultThreshold(agents));
  errors.push(...checkUniqueIds(agents));
  errors.push(...checkEndpoints(agents));

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Invariant validator implementation
 */
export const invariantValidator: Validator = {
  name: 'invariant-validator',
  category: TestCategory.REGISTRY,
  severity: Severity.CRITICAL,

  async validate(context: ValidationContext): Promise<TestResult> {
    const start = performance.now();
    let agents = context.artifacts?.registryAgents as AgentConfigInput[] | undefined;

    if ((!agents || agents.length === 0) && context.options.yamlPath) {
      const loaded = loadRegistryFile(context.options.yamlPath);
      context.artifacts = {
        ...context.artifacts,
        registryAgents: loaded.agents,
      };
      agents = loaded.agents;
    }

    if (!agents || agents.length === 0) {
      return {
        validator: this.name,
        category: this.category,
        passed: false,
        severity: this.severity,
        message: 'No valid agent configurations available for invariant validation',
        remediation:
          'Provide a valid registry YAML with at least one agent definition before running invariant checks.',
        durationMs: Math.round(performance.now() - start),
        timestamp: now(),
      };
    }

    const result = validateInvariants(agents);

    if (result.valid) {
      return {
        validator: this.name,
        category: this.category,
        passed: true,
        severity: Severity.INFO,
        message: `Invariant validation passed for ${agents.length} agent(s)`,
        durationMs: Math.round(performance.now() - start),
        timestamp: now(),
      };
    }

    return {
      validator: this.name,
      category: this.category,
      passed: false,
      severity: this.severity,
      message: `Invariant validation failed with ${result.errors.length} error(s)`,
      remediation: result.errors.map((e) => e.message).join('\n'),
      details: { errors: result.errors },
      durationMs: Math.round(performance.now() - start),
      timestamp: now(),
    };
  },
};
