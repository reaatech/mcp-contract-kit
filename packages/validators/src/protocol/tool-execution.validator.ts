/**
 * Tool execution validator - validates tools/call behavior
 */

import type {
  TestResult,
  ToolDefinition,
  ValidationContext,
  Validator,
} from '@reaatech/mcp-contract-core';
import { Severity, TestCategory, now } from '@reaatech/mcp-contract-core';

function buildSampleValue(schema: Record<string, unknown>): unknown {
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum[0];
  }

  if (schema.default !== undefined) {
    return schema.default;
  }

  switch (schema.type) {
    case 'string':
      return 'sample';
    case 'number':
    case 'integer':
      return 1;
    case 'boolean':
      return true;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return 'sample';
  }
}

function buildValidArguments(tool: ToolDefinition): Record<string, unknown> {
  const schema = tool.inputSchema;
  if (schema.type !== 'object') {
    return {};
  }

  const properties =
    schema.properties && typeof schema.properties === 'object'
      ? (schema.properties as Record<string, Record<string, unknown>>)
      : {};
  const required =
    Array.isArray(schema.required) && schema.required.every((item) => typeof item === 'string')
      ? (schema.required as string[])
      : [];

  const args: Record<string, unknown> = {};
  for (const key of required) {
    if (properties[key]) {
      args[key] = buildSampleValue(properties[key]);
    }
  }
  return args;
}

/**
 * Tool execution validator implementation
 */
export const toolExecutionValidator: Validator = {
  name: 'tool-execution-validator',
  category: TestCategory.PROTOCOL,
  severity: Severity.CRITICAL,

  async validate(context: ValidationContext): Promise<TestResult> {
    const start = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    let toolsFound = 0;
    let toolsTested = 0;

    try {
      // Get list of tools
      const tools = await context.client.listTools();
      toolsFound = tools.length;

      if (toolsFound === 0) {
        return {
          validator: this.name,
          category: this.category,
          passed: false,
          severity: this.severity,
          message: 'No tools available to test execution',
          durationMs: Math.round(performance.now() - start),
          timestamp: now(),
        };
      }

      // Test execution of the first tool with synthesized valid args
      const firstTool = tools[0];
      if (!firstTool) {
        return {
          validator: this.name,
          category: this.category,
          passed: false,
          severity: this.severity,
          message: 'tools/list returned empty array',
          durationMs: Math.round(performance.now() - start),
          timestamp: now(),
        };
      }
      const validArgs = buildValidArguments(firstTool);

      // Test 1: Call a valid tool
      try {
        const result = await context.client.callTool(firstTool.name, validArgs);
        toolsTested++;

        // Validate response structure
        if (!result.content || !Array.isArray(result.content)) {
          errors.push(`[${firstTool.name}] Response 'content' must be an array`);
        } else if (result.content.length === 0 && !result.isError) {
          warnings.push(`[${firstTool.name}] Response content array was empty`);
        }
      } catch (error) {
        errors.push(`[${firstTool.name}] Tool execution failed: ${(error as Error).message}`);
      }

      // Test 2: Call an unknown tool (should return error)
      try {
        const unknownResult = await context.client.callTool('__nonexistent_tool_12345__', {});

        if (!unknownResult.isError) {
          errors.push('Unknown tool should return isError: true or an error response');
        }
      } catch (_error) {
        // Expected to throw or return error - this is good
      }

      // Test 3: Call tool with invalid arguments (if schema exists)
      if (firstTool.inputSchema && Object.keys(firstTool.inputSchema).length > 0) {
        try {
          // Send completely invalid arguments
          const invalidResult = await context.client.callTool(firstTool.name, {
            __invalid_arg__: 'this should fail validation',
          });

          // If it didn't error, that's a warning (should validate inputs)
          if (!invalidResult.isError) {
            warnings.push(`[${firstTool.name}] Tool accepted invalid arguments without validation`);
          }
        } catch (_error) {
          // Expected - tool should reject invalid args
        }
      }
    } catch (error) {
      errors.push(`Tool execution testing failed: ${(error as Error).message}`);
    }

    if (errors.length === 0 && warnings.length === 0) {
      return {
        validator: this.name,
        category: this.category,
        passed: true,
        severity: Severity.INFO,
        message: `Tool execution validated successfully. Tested ${toolsTested} of ${toolsFound} tool(s).`,
        details: { toolsFound, toolsTested },
        durationMs: Math.round(performance.now() - start),
        timestamp: now(),
      };
    }

    if (errors.length === 0) {
      return {
        validator: this.name,
        category: this.category,
        passed: true,
        severity: Severity.WARNING,
        message: `Tool execution passed with ${warnings.length} warning(s)`,
        details: { warnings, toolsFound, toolsTested },
        durationMs: Math.round(performance.now() - start),
        timestamp: now(),
      };
    }

    return {
      validator: this.name,
      category: this.category,
      passed: false,
      severity: this.severity,
      message: `Tool execution validation failed with ${errors.length} error(s)`,
      remediation:
        'Ensure tools handle unknown tool names gracefully and validate input arguments against their schemas',
      details: { errors, warnings, toolsFound, toolsTested },
      durationMs: Math.round(performance.now() - start),
      timestamp: now(),
    };
  },
};
