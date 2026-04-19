/**
 * Tool discovery validator - validates tools/list response
 */

import Ajv from 'ajv';
import {
  Validator,
  TestResult,
  ValidationContext,
  TestCategory,
  Severity,
  ToolDefinition,
} from '../../types/domain.js';
import { now } from '../../utils/index.js';

const ajv = new Ajv.default();

/**
 * Validate tool naming conventions
 */
function validateToolName(name: string): string[] {
  const errors: string[] = [];

  if (!name || name.length === 0) {
    errors.push('Tool name is empty');
    return errors;
  }

  // Check naming convention: lowercase, underscores and hyphens allowed
  if (!/^[a-z][a-z0-9_-]*$/.test(name)) {
    errors.push(
      `Tool name '${name}' should start with lowercase letter and contain only lowercase letters, numbers, underscores, and hyphens`,
    );
  }

  return errors;
}

/**
 * Validate tool definition structure
 */
function validateToolDefinition(tool: ToolDefinition): string[] {
  const errors: string[] = [];

  // Check required fields
  if (!tool.name) {
    errors.push('Tool is missing required field: name');
  }

  if (!tool.description) {
    errors.push(`Tool '${tool.name}' is missing required field: description`);
  }

  // Validate name
  if (tool.name) {
    errors.push(...validateToolName(tool.name));
  }

  // Validate inputSchema is present and is an object
  if (!tool.inputSchema) {
    errors.push(`Tool '${tool.name}' is missing required field: inputSchema`);
  } else if (typeof tool.inputSchema !== 'object' || Array.isArray(tool.inputSchema)) {
    errors.push(`Tool '${tool.name}' has invalid inputSchema: must be an object`);
  } else {
    try {
      ajv.compile(tool.inputSchema);
    } catch (error) {
      errors.push(`Tool '${tool.name}' has invalid JSON Schema: ${(error as Error).message}`);
    }
  }

  return errors;
}

/**
 * Tool discovery validator implementation
 */
export const toolDiscoveryValidator: Validator = {
  name: 'tool-discovery-validator',
  category: TestCategory.PROTOCOL,
  severity: Severity.CRITICAL,

  async validate(context: ValidationContext): Promise<TestResult> {
    const start = performance.now();
    const errors: string[] = [];
    let tools: ToolDefinition[] = [];

    try {
      // Call tools/list
      tools = await context.client.listTools();

      // Validate response is an array
      if (!Array.isArray(tools)) {
        errors.push('tools/list did not return an array');
      } else if (tools.length === 0) {
        errors.push('No tools found. Server should expose at least one tool.');
      } else {
        // Check for duplicate tool names
        const names = tools.map((t) => t.name);
        const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
        if (duplicates.length > 0) {
          errors.push(`Duplicate tool names found: ${[...new Set(duplicates)].join(', ')}`);
        }

        // Validate each tool definition
        for (const tool of tools) {
          const toolErrors = validateToolDefinition(tool);
          errors.push(...toolErrors.map((e) => `[${tool.name}] ${e}`));
        }
      }
    } catch (error) {
      errors.push(`tools/list request failed: ${(error as Error).message}`);
    }

    if (errors.length === 0) {
      return {
        validator: this.name,
        category: this.category,
        passed: true,
        severity: Severity.INFO,
        message: `Tool discovery validated successfully. Found ${tools.length} tool(s).`,
        details: { toolCount: tools.length, tools: tools.map((t) => t.name) },
        durationMs: Math.round(performance.now() - start),
        timestamp: now(),
      };
    }

    return {
      validator: this.name,
      category: this.category,
      passed: false,
      severity: this.severity,
      message: `Tool discovery validation failed with ${errors.length} error(s)`,
      remediation:
        'Ensure all tools have valid names (lowercase with underscores or hyphens), descriptions, and JSON Schema inputSchema objects',
      details: { errors },
      durationMs: Math.round(performance.now() - start),
      timestamp: now(),
    };
  },
};
