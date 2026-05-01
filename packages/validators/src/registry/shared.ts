/**
 * Shared helpers for registry validation.
 */

import { readFileSync, statSync } from 'node:fs';
import type { AgentConfigInput, ValidationError } from '@reaatech/mcp-contract-core';
import { AgentConfigSchema, Severity } from '@reaatech/mcp-contract-core';
import { parse } from 'yaml';

export const MAX_REGISTRY_FILE_SIZE = 1024 * 1024; // 1MB

export interface LoadedRegistry {
  raw: unknown;
  content: string;
  agents: AgentConfigInput[];
  errors: ValidationError[];
  warnings: ValidationError[];
}

function normalizeRegistryDocument(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (
    parsed &&
    typeof parsed === 'object' &&
    'agents' in parsed &&
    Array.isArray((parsed as { agents?: unknown[] }).agents)
  ) {
    return (parsed as { agents: unknown[] }).agents;
  }

  return [parsed];
}

export function loadRegistryFile(yamlPath: string): LoadedRegistry {
  const warnings: ValidationError[] = [];

  let content: string;
  try {
    const stats = statSync(yamlPath);
    if (stats.size > MAX_REGISTRY_FILE_SIZE) {
      return {
        raw: null,
        content: '',
        agents: [],
        warnings,
        errors: [
          {
            field: 'file',
            message: `File size exceeds ${MAX_REGISTRY_FILE_SIZE / 1024 / 1024}MB limit`,
            severity: Severity.CRITICAL,
            type: 'FILE_TOO_LARGE',
          },
        ],
      };
    }

    content = readFileSync(yamlPath, 'utf-8');
  } catch (error) {
    return {
      raw: null,
      content: '',
      agents: [],
      warnings,
      errors: [
        {
          field: 'file',
          message: `Failed to read file: ${(error as Error).message}`,
          severity: Severity.CRITICAL,
          type: 'FILE_READ_ERROR',
        },
      ],
    };
  }

  let parsed: unknown;
  try {
    parsed = parse(content);
  } catch (error) {
    return {
      raw: null,
      content,
      agents: [],
      warnings,
      errors: [
        {
          field: 'file',
          message: `YAML parse error: ${(error as Error).message}`,
          severity: Severity.CRITICAL,
          type: 'YAML_PARSE_ERROR',
        },
      ],
    };
  }

  const candidates = normalizeRegistryDocument(parsed);
  const agents: AgentConfigInput[] = [];
  const errors: ValidationError[] = [];

  for (const [index, candidate] of candidates.entries()) {
    const validation = AgentConfigSchema.safeParse(candidate);
    if (!validation.success) {
      for (const issue of validation.error.issues) {
        errors.push({
          field: issue.path.length > 0 ? `${index}.${issue.path.join('.')}` : `${String(index)}`,
          message: issue.message,
          severity: Severity.CRITICAL,
          type: 'SCHEMA_VALIDATION_ERROR',
        });
      }
      continue;
    }

    const config = validation.data;
    if (config.description.length < 20) {
      warnings.push({
        field: `${index}.description`,
        message: 'Description is very short (< 20 chars), consider adding more detail',
        severity: Severity.INFO,
        type: 'SHORT_DESCRIPTION',
      });
    }

    agents.push(config);
  }

  return {
    raw: parsed,
    content,
    agents,
    errors,
    warnings,
  };
}
