/**
 * Environment variable expansion validator
 * Validates ${ENV_VAR} syntax and detects circular references
 */

import { readFileSync } from 'node:fs';
import type {
  TestResult,
  ValidationContext,
  ValidationError,
  Validator,
} from '@reaatech/mcp-contract-core';
import { Severity, TestCategory, now } from '@reaatech/mcp-contract-core';

const ENV_VAR_REGEX = /\$\{([^}]+)\}/g;

interface EnvExpansionResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  variables: string[];
}

/**
 * Extract all environment variable references from a string
 */
export function extractEnvVars(str: string): string[] {
  const matches = str.matchAll(ENV_VAR_REGEX);
  return Array.from(matches, (m) => m[1] ?? '').filter(Boolean);
}

/**
 * Validate environment variable syntax in a string
 */
function validateEnvSyntax(str: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for incomplete variable references
  const incompleteMatches = str.match(/\$\{[^}]*$/gm);
  if (incompleteMatches) {
    errors.push({
      field: 'env_syntax',
      message: 'Incomplete environment variable reference(s) found',
      severity: Severity.CRITICAL,
      type: 'INCOMPLETE_ENV_VAR',
    });
  }

  // Check for invalid variable names
  const allMatches = str.matchAll(ENV_VAR_REGEX);
  for (const match of allMatches) {
    const varName = match[1];
    if (!varName || !/^[A-Z_][A-Z0-9_]*$/.test(varName)) {
      errors.push({
        field: 'env_syntax',
        message: `Invalid environment variable name '${varName}'. Must be uppercase letters, numbers, and underscores.`,
        severity: Severity.WARNING,
        type: 'INVALID_ENV_VAR_NAME',
      });
    }
  }

  return errors;
}

/**
 * Check for undefined environment variables
 */
function checkUndefinedVars(variables: string[]): ValidationError[] {
  const warnings: ValidationError[] = [];
  const undefinedVars = variables.filter((v) => !(v in process.env));

  if (undefinedVars.length > 0) {
    warnings.push({
      field: 'env_vars',
      message: `Undefined environment variables: ${undefinedVars.join(', ')}`,
      severity: Severity.WARNING,
      type: 'ENV_VAR_UNDEFINED',
    });
  }

  return warnings;
}

/**
 * Detect circular references in environment variable values
 */
function detectCircularRefs(content: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const envVars = [...new Set(extractEnvVars(content))];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const walk = (varName: string): boolean => {
    if (visiting.has(varName)) {
      return true;
    }

    if (visited.has(varName)) {
      return false;
    }

    visiting.add(varName);
    const value = process.env[varName] ?? '';
    for (const nestedVar of extractEnvVars(value)) {
      if (walk(nestedVar)) {
        return true;
      }
    }
    visiting.delete(varName);
    visited.add(varName);
    return false;
  };

  for (const varName of envVars) {
    if (walk(varName)) {
      errors.push({
        field: 'env_vars',
        message: `Circular reference detected for environment variable '${varName}'`,
        severity: Severity.CRITICAL,
        type: 'CIRCULAR_ENV_REF',
      });
      break;
    }
  }

  return errors;
}

/**
 * Validate environment variable usage in content
 */
export function validateEnvExpansion(content: string): EnvExpansionResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Extract all environment variable references
  const variables = extractEnvVars(content);

  // Validate syntax
  errors.push(...validateEnvSyntax(content));

  // Check for undefined variables
  warnings.push(...checkUndefinedVars(variables));

  // Detect circular references
  errors.push(...detectCircularRefs(content));

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    variables,
  };
}

/**
 * Environment expansion validator implementation
 */
export const envExpansionValidator: Validator = {
  name: 'env-expansion-validator',
  category: TestCategory.REGISTRY,
  severity: Severity.WARNING,

  async validate(context: ValidationContext): Promise<TestResult> {
    const start = performance.now();

    // This validator needs content to validate
    // It can be passed via context or read from a file
    const yamlPath = context.options.yamlPath;
    if (!yamlPath) {
      return {
        validator: this.name,
        category: this.category,
        passed: true,
        severity: Severity.INFO,
        message: 'No YAML path provided, skipping environment variable validation',
        durationMs: Math.round(performance.now() - start),
        timestamp: now(),
      };
    }

    let content: string;
    try {
      content = readFileSync(yamlPath, 'utf-8');
    } catch (error) {
      return {
        validator: this.name,
        category: this.category,
        passed: false,
        severity: Severity.CRITICAL,
        message: `Failed to read file: ${(error as Error).message}`,
        durationMs: Math.round(performance.now() - start),
        timestamp: now(),
      };
    }

    const result = validateEnvExpansion(content);

    if (result.valid && result.warnings.length === 0) {
      return {
        validator: this.name,
        category: this.category,
        passed: true,
        severity: Severity.INFO,
        message: 'Environment variable validation passed',
        details: { variables: result.variables },
        durationMs: Math.round(performance.now() - start),
        timestamp: now(),
      };
    }

    if (result.valid) {
      return {
        validator: this.name,
        category: this.category,
        passed: true,
        severity: Severity.WARNING,
        message: `Environment variable validation passed with ${result.warnings.length} warning(s)`,
        details: {
          variables: result.variables,
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
      message: `Environment variable validation failed with ${result.errors.length} error(s)`,
      remediation: result.errors.map((e) => e.message).join('\n'),
      details: {
        errors: result.errors,
        warnings: result.warnings,
        variables: result.variables,
      },
      durationMs: Math.round(performance.now() - start),
      timestamp: now(),
    };
  },
};
