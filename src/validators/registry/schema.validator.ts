/**
 * Schema validator for agent registry YAML files
 */

import {
  Validator,
  TestResult,
  ValidationContext,
  TestCategory,
  Severity,
  ValidationError,
} from '../../types/domain.js';
import { AgentConfigInput } from '../../types/schemas.js';
import { now } from '../../utils/index.js';
import { loadRegistryFile } from './shared.js';

interface SchemaValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  config?: AgentConfigInput;
  agents?: AgentConfigInput[];
}

/**
 * Validate an agent YAML file against the schema
 */
export function validateAgentYAML(
  yamlPath: string,
  options: { strict?: boolean } = {},
): SchemaValidationResult {
  void options;
  const loaded = loadRegistryFile(yamlPath);
  return {
    valid: loaded.errors.length === 0,
    errors: loaded.errors,
    warnings: loaded.warnings,
    config: loaded.agents[0],
    agents: loaded.agents,
  };
}

/**
 * Schema validator implementation
 */
export const schemaValidator: Validator = {
  name: 'schema-validator',
  category: TestCategory.REGISTRY,
  severity: Severity.CRITICAL,

  async validate(context: ValidationContext): Promise<TestResult> {
    const start = performance.now();
    const yamlPath = context.options.yamlPath;

    if (!yamlPath) {
      return {
        validator: this.name,
        category: this.category,
        passed: true,
        severity: Severity.INFO,
        message: 'No YAML path provided, skipping schema validation',
        durationMs: Math.round(performance.now() - start),
        timestamp: now(),
      };
    }

    const result = validateAgentYAML(yamlPath);
    context.artifacts = {
      ...context.artifacts,
      registryAgents: result.agents ?? [],
    };

    if (result.valid) {
      return {
        validator: this.name,
        category: this.category,
        passed: true,
        severity: Severity.INFO,
        message: 'Agent YAML schema validation passed',
        details: {
          config: result.config,
          agentCount: result.agents?.length ?? 0,
          warnings: result.warnings,
        },
        durationMs: Math.round(performance.now() - start),
        timestamp: now(),
      };
    }

    return {
      validator: this.name,
      category: this.category,
      passed: false,
      severity: this.severity,
      message: `Schema validation failed with ${result.errors.length} error(s)`,
      remediation: result.errors.map((e) => `${e.field}: ${e.message}`).join('\n'),
      details: { errors: result.errors },
      durationMs: Math.round(performance.now() - start),
      timestamp: now(),
    };
  },
};
