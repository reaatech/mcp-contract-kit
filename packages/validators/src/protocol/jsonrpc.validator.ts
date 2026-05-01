/**
 * JSON-RPC 2.0 compliance validator
 */

import type {
  MCPRequest,
  MCPResponse,
  TestResult,
  ValidationContext,
  Validator,
} from '@reaatech/mcp-contract-core';
import { Severity, TestCategory, now } from '@reaatech/mcp-contract-core';

/**
 * Validate JSON-RPC 2.0 response format
 */
function validateJSONRPCResponse(
  response: MCPResponse,
  requestId: string | number,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check jsonrpc version
  if (response.jsonrpc !== '2.0') {
    errors.push(`Missing or invalid 'jsonrpc' field. Expected '2.0', got '${response.jsonrpc}'`);
  }

  // Check id matches request
  if (response.id !== requestId) {
    errors.push(
      `Response 'id' (${String(response.id)}) does not match request 'id' (${String(requestId)})`,
    );
  }

  // Check result XOR error
  const hasResult = response.result !== undefined;
  const hasError = response.error !== undefined;

  if (hasResult && hasError) {
    errors.push("Response contains both 'result' and 'error'. They are mutually exclusive.");
  } else if (!hasResult && !hasError) {
    errors.push("Response contains neither 'result' nor 'error'. One must be present.");
  }

  // Validate error structure if present
  if (hasError && response.error) {
    if (typeof response.error.code !== 'number') {
      errors.push(`Error 'code' must be a number, got ${typeof response.error.code}`);
    } else {
      // Check reserved error code ranges
      const code = response.error.code;
      if (
        code === -32700 ||
        code === -32600 ||
        code === -32601 ||
        code === -32602 ||
        code === -32603
      ) {
        // These are valid reserved codes
      } else if (code >= -32099 && code <= -32000) {
        // Server error range - valid
      } else if (code < -32700 || code > -32000) {
        errors.push(
          `Error code ${code} is outside valid ranges. Use -32700 to -32000 for standard errors.`,
        );
      }
    }

    if (typeof response.error.message !== 'string') {
      errors.push(`Error 'message' must be a string, got ${typeof response.error.message}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * JSON-RPC 2.0 validator implementation
 */
export const jsonrpcValidator: Validator = {
  name: 'jsonrpc-validator',
  category: TestCategory.PROTOCOL,
  severity: Severity.CRITICAL,

  async validate(context: ValidationContext): Promise<TestResult> {
    const start = performance.now();
    const errors: string[] = [];

    try {
      // Test request 1: tools/list
      const requestId1 = 1;
      const request1: MCPRequest = {
        jsonrpc: '2.0',
        method: 'tools/list',
        id: requestId1,
      };

      const response1 = await context.client.sendRequest(request1);
      const validation1 = validateJSONRPCResponse(response1, requestId1);
      if (!validation1.valid) {
        errors.push(...validation1.errors.map((e) => `[tools/list] ${e}`));
      }

      // Test request 2: initialize
      const requestId2 = 2;
      const request2: MCPRequest = {
        jsonrpc: '2.0',
        method: 'initialize',
        id: requestId2,
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'mcp-contract-kit',
            version: '1.0.0',
          },
        },
      };

      const response2 = await context.client.sendRequest(request2);
      const validation2 = validateJSONRPCResponse(response2, requestId2);
      if (!validation2.valid) {
        errors.push(...validation2.errors.map((e) => `[initialize] ${e}`));
      }

      // Test request 3: Invalid method (should return error)
      const requestId3 = 3;
      const request3: MCPRequest = {
        jsonrpc: '2.0',
        method: 'nonexistent/method',
        id: requestId3,
      };

      const response3 = await context.client.sendRequest(request3);
      const validation3 = validateJSONRPCResponse(response3, requestId3);
      if (!validation3.valid) {
        errors.push(...validation3.errors.map((e) => `[nonexistent/method] ${e}`));
      }

      // Check that error response was received for invalid method
      if (!response3.error) {
        errors.push('[nonexistent/method] Expected error response for unknown method');
      }
    } catch (error) {
      errors.push(`Request failed: ${(error as Error).message}`);
    }

    if (errors.length === 0) {
      return {
        validator: this.name,
        category: this.category,
        passed: true,
        severity: Severity.INFO,
        message: 'JSON-RPC 2.0 compliance validated successfully',
        durationMs: Math.round(performance.now() - start),
        timestamp: now(),
      };
    }

    return {
      validator: this.name,
      category: this.category,
      passed: false,
      severity: this.severity,
      message: `JSON-RPC 2.0 validation failed with ${errors.length} error(s)`,
      remediation:
        'Ensure all responses follow JSON-RPC 2.0 specification: include jsonrpc: "2.0", matching id, and either result or error (not both)',
      details: { errors },
      durationMs: Math.round(performance.now() - start),
      timestamp: now(),
    };
  },
};
