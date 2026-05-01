# @reaatech/mcp-contract-validators

[![npm version](https://img.shields.io/npm/v/@reaatech/mcp-contract-validators.svg)](https://www.npmjs.com/package/@reaatech/mcp-contract-validators)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/reaatech/mcp-contract-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/reaatech/mcp-contract-kit/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — API may change before the stable release. Use with a lockfile.

Conformance validators for MCP servers — protocol compliance, registry validation, routing contracts, security posture, and performance baseline.

---

## Installation

```bash
npm install @reaatech/mcp-contract-validators
# or
yarn add @reaatech/mcp-contract-validators
# or
pnpm add @reaatech/mcp-contract-validators
```

---

## Feature Overview

| Suite | What It Checks | Severity |
|-------|----------------|----------|
| **Protocol** | JSON-RPC 2.0 compliance, `tools/list`, `tools/call`, session management | Critical |
| **Registry** | Agent YAML schema, invariants (unique IDs, default agent), env variable syntax | Critical |
| **Routing** | Request/response contract format, `handle_message` tool, cross-scenario compatibility | Critical |
| **Security** | SSRF protection, authentication posture, input sanitization (XSS, prompt injection, SQLi) | Warning |
| **Performance** | Latency percentiles (p50/p90/p99), concurrent request handling, rate limiting | Warning |

---

## Quick Start

```typescript
import {
  getProtocolValidators,
  getRegistryValidators,
  getRoutingValidators,
  getSecurityValidators,
  getPerformanceValidators,
} from '@reaatech/mcp-contract-validators';
import { createMCPClient } from '@reaatech/mcp-contract-client';

const client = createMCPClient({ endpoint: 'http://localhost:8080' });
await client.connect();

// Run a single suite
for (const validator of getProtocolValidators()) {
  const result = await validator.validate({
    client,
    endpoint: 'http://localhost:8080',
    options: { timeout: 30000, retries: 2 },
    requestId: crypto.randomUUID(),
  });
  console.log(`${result.validator}: ${result.passed ? 'PASS' : 'FAIL'} — ${result.message}`);
}

await client.disconnect();
```

Or import individual validators directly:

```typescript
import {
  jsonrpcValidator,
  toolDiscoveryValidator,
  ssrfValidator,
  latencyValidator,
} from '@reaatech/mcp-contract-validators';

const result = await jsonrpcValidator.validate(context);
```

---

## Validator Suites

### Protocol

Validates MCP JSON-RPC 2.0 specification compliance.

| Validator | Export | What it checks |
|-----------|--------|----------------|
| **JSON-RPC Validator** | `jsonrpcValidator` | Ensures all responses include `jsonrpc: "2.0"`, matching `id` fields, mutually exclusive `result`/`error`, valid error code ranges, and that unknown methods return proper errors. Sends `tools/list`, `initialize`, and a bogus method to verify end-to-end compliance. |
| **Tool Discovery Validator** | `toolDiscoveryValidator` | Validates the `tools/list` response: checks that at least one tool is exposed, no duplicate tool names, every tool has a valid name (lowercase with underscores/hyphens), a description, and a valid JSON Schema `inputSchema`. |
| **Tool Execution Validator** | `toolExecutionValidator` | Calls tools via `tools/call` with synthesized valid arguments, verifies that unknown tool names return errors, and checks that tools reject invalid arguments per their input schema. Validates response `content` array structure. |
| **Session Validator** | `sessionValidator` | Verifies that session IDs are non-empty, persist across calls and tool invocations, and that separate clients get isolated session identifiers. Recommends UUID-format session IDs. |

### Registry

Validates agent YAML configuration files for orchestrator registries.

| Validator | Export | What it checks |
|-----------|--------|----------------|
| **Schema Validator** | `schemaValidator` | Parses agent YAML files and validates each agent definition against the `AgentConfigSchema`. Ensures all required fields (`agent_id`, `display_name`, `description`, `endpoint`, `type`, `is_default`, `confidence_threshold`, `clarification_required`, `examples`) are present and correctly typed. Re-exports `validateAgentYAML()` for direct programmatic use. |
| **Invariant Validator** | `invariantValidator` | Validates cross-agent invariants: exactly one default agent, default agent has `confidence_threshold: 0`, all `agent_id` values are unique, all endpoints are valid URLs, no private/localhost endpoints (SSRF prevention), and endpoint URLs stay under 2048 characters. Re-exports `validateInvariants()` for direct use. |
| **Env Expansion Validator** | `envExpansionValidator` | Validates `${ENV_VAR}` syntax in YAML files: detects incomplete variable references, invalid variable names (must be uppercase with underscores), undefined environment variables, and circular references between env vars. Re-exports `validateEnvExpansion()` and `extractEnvVars()`. |

### Routing

Validates the request/response contracts used between an orchestrator and an agent.

| Validator | Export | What it checks |
|-----------|--------|----------------|
| **Request Contract Validator** | `requestContractValidator` | Ensures the agent exposes a `handle_message` tool that accepts the standard request format (`session_id`, `request_id`, `employee_id`, `raw_input`, plus optional `display_name`, `intent_summary`, `entities`, `turn_history`, `workflow_state`). Validates against `AgentRequestContractSchema`. |
| **Response Contract Validator** | `responseContractValidator` | Validates that `handle_message` responses conform to the standard response contract: `content` (non-empty string) and `workflow_complete` (boolean), with an optional `workflow_state` object. Validates against `AgentResponseContractSchema`. |
| **Compatibility Validator** | `compatibilityValidator` | End-to-end contract testing across multiple input scenarios: normal text, empty input, long input (1000 chars), unicode/emoji, and special characters (XSS payloads). Verifies consistent error handling across all scenarios. |

### Security

Validates the security posture of the MCP server.

| Validator | Export | What it checks |
|-----------|--------|----------------|
| **SSRF Validator** | `ssrfValidator` | Checks that the endpoint URL is not a private/localhost address, uses HTTPS in production, and is a syntactically valid URL. Flags private IPs and non-HTTPS endpoints as warnings. |
| **Auth Validator** | `authValidator` | Tests whether the server requires authentication by sending a request with an invalid token. Warns if the server accepts unauthenticated requests, and reports positively if 401/Unauthorized responses are returned. |
| **Input Sanitization Validator** | `inputSanitizationValidator` | Sends prompt injection, XSS, and SQL injection patterns to `handle_message` and checks whether the agent echoes back unsanitized payloads. Tests: "Ignore previous instructions" variants, `<script>` tags, SQL DROP/OR injection strings. |

### Performance

Validates the performance characteristics of the MCP server.

| Validator | Export | What it checks |
|-----------|--------|----------------|
| **Latency Validator** | `latencyValidator` | Sends 5 `tools/list` requests and computes p50, p90, and p99 latency percentiles. Fails if p50 > 1000ms, p90 > 3000ms, or p99 > 5000ms. Uses `calculateStats` from core. |
| **Concurrency Validator** | `concurrencyValidator` | Sends 5 concurrent `tools/list` requests via `Promise.all` and verifies all complete without failures. Averages response times and reports any failed concurrent requests. |
| **Rate Limit Validator** | `rateLimitValidator` | Sends a burst of 20 rapid `tools/list` requests and checks for 429 (Too Many Requests) responses. Warns if no rate limiting is detected in production scenarios. |

---

## API Reference

### Suite Accessors

Each suite exports a function that returns all validators filtered to that category:

```typescript
import {
  getProtocolValidators,    // → [jsonrpcValidator, toolDiscoveryValidator, toolExecutionValidator, sessionValidator]
  getRegistryValidators,    // → [schemaValidator, invariantValidator, envExpansionValidator]
  getRoutingValidators,     // → [requestContractValidator, responseContractValidator, compatibilityValidator]
  getSecurityValidators,    // → [ssrfValidator, authValidator, inputSanitizationValidator]
  getPerformanceValidators, // → [latencyValidator, concurrencyValidator, rateLimitValidator]
} from '@reaatech/mcp-contract-validators';
```

Also available as the full pre-composed arrays:

```typescript
import {
  protocolValidators,
  registryValidators,
  routingValidators,
  securityValidators,
  performanceValidators,
} from '@reaatech/mcp-contract-validators';
```

### Individual Validators

Every validator is exported as a named constant implementing the `Validator` interface:

```typescript
// Protocol
export { jsonrpcValidator } from '@reaatech/mcp-contract-validators';
export { toolDiscoveryValidator } from '@reaatech/mcp-contract-validators';
export { toolExecutionValidator } from '@reaatech/mcp-contract-validators';
export { sessionValidator } from '@reaatech/mcp-contract-validators';

// Registry
export { schemaValidator } from '@reaatech/mcp-contract-validators';
export { invariantValidator } from '@reaatech/mcp-contract-validators';
export { envExpansionValidator } from '@reaatech/mcp-contract-validators';

// Routing
export { requestContractValidator } from '@reaatech/mcp-contract-validators';
export { responseContractValidator } from '@reaatech/mcp-contract-validators';
export { compatibilityValidator } from '@reaatech/mcp-contract-validators';

// Security
export { ssrfValidator } from '@reaatech/mcp-contract-validators';
export { authValidator } from '@reaatech/mcp-contract-validators';
export { inputSanitizationValidator } from '@reaatech/mcp-contract-validators';

// Performance
export { latencyValidator } from '@reaatech/mcp-contract-validators';
export { concurrencyValidator } from '@reaatech/mcp-contract-validators';
export { rateLimitValidator } from '@reaatech/mcp-contract-validators';
```

### Registry Helper Functions

In addition to validators, the registry suite re-exports standalone helper functions:

```typescript
import {
  validateAgentYAML,    // (yamlPath: string, options?: { strict?: boolean }) => SchemaValidationResult
  validateInvariants,   // (agents: AgentConfig[]) => InvariantValidationResult
  validateEnvExpansion, // (content: string) => EnvExpansionResult
  extractEnvVars,       // (str: string) => string[]
} from '@reaatech/mcp-contract-validators';
```

---

## Creating a Custom Validator

Implement the `Validator` interface from `@reaatech/mcp-contract-core`:

```typescript
import type { Validator, TestResult, ValidationContext } from '@reaatech/mcp-contract-core';
import { Severity, TestCategory, now } from '@reaatech/mcp-contract-core';

export const myValidator: Validator = {
  name: 'my-custom-validator',
  category: TestCategory.PROTOCOL,
  severity: Severity.WARNING,

  async validate(context: ValidationContext): Promise<TestResult> {
    const start = performance.now();
    const errors: string[] = [];

    try {
      const tools = await context.client.listTools();
      if (tools.length < 3) {
        errors.push('Expected at least 3 tools for production readiness');
      }
    } catch (error) {
      errors.push(`Validation failed: ${(error as Error).message}`);
    }

    if (errors.length === 0) {
      return {
        validator: this.name,
        category: this.category,
        passed: true,
        severity: Severity.INFO,
        message: 'Custom validation passed',
        durationMs: Math.round(performance.now() - start),
        timestamp: now(),
      };
    }

    return {
      validator: this.name,
      category: this.category,
      passed: false,
      severity: this.severity,
      message: `Custom validation failed with ${errors.length} error(s)`,
      remediation: 'Ensure the server exposes at least 3 tools for production',
      details: { errors },
      durationMs: Math.round(performance.now() - start),
      timestamp: now(),
    };
  },
};
```

The `ValidationContext` provides access to:

| Property | Type | Description |
|----------|------|-------------|
| `client` | `MCPClient` | Pre-connected MCP client for `sendRequest`, `callTool`, `listTools` |
| `endpoint` | `string` | Target MCP server URL |
| `options` | `TestOptions` | Test configuration (timeout, retries, yamlPath) |
| `requestId` | `string` | Unique request ID for tracing |
| `artifacts` | `Record<string, unknown>` | Shared data passed between validators (e.g. pre-loaded registry agents) |

---

## Related Packages

| Package | Description |
|---------|-------------|
| [`@reaatech/mcp-contract-core`](https://www.npmjs.com/package/@reaatech/mcp-contract-core) | Shared types, schemas, and utilities |
| [`@reaatech/mcp-contract-client`](https://www.npmjs.com/package/@reaatech/mcp-contract-client) | MCP client for connecting to servers |
| [`@reaatech/mcp-contract-observability`](https://www.npmjs.com/package/@reaatech/mcp-contract-observability) | OpenTelemetry instrumentation and logging |
| [`mcp-contract-kit`](https://www.npmjs.com/package/mcp-contract-kit) | Full CLI and programmatic test runner |

---

## License

MIT
