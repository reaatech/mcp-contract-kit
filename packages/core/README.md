# @reaatech/mcp-contract-core

[![npm version](https://img.shields.io/npm/v/@reaatech/mcp-contract-core)](https://www.npmjs.com/package/@reaatech/mcp-contract-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/mcp-contract-kit/ci.yml?branch=main)](https://github.com/reaatech/mcp-contract-kit/actions)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Core domain types, JSON-RPC 2.0 schemas, and shared utilities for MCP contract validation.
Provides the foundational enums, interfaces, Zod schemas, and helper functions used across all
`@reaatech/mcp-contract-*` packages.

## Installation

```bash
npm install @reaatech/mcp-contract-core
```

```bash
pnpm add @reaatech/mcp-contract-core
```

## Feature Overview

- **Enums** — `Severity`, `TestCategory`, and `TestSuite` for categorizing test results
- **Result types** — `TestResult`, `TestReport`, and `ValidationError` interfaces for structured test output
- **Validator contracts** — `Validator` and `ValidationContext` interfaces for implementing custom validators
- **MCP client types** — `MCPClient`, `MCPRequest`, `MCPResponse`, `MCPError`, `ToolDefinition`, `ToolResult` for JSON-RPC 2.0 interaction
- **Zod schemas** — Runtime validation schemas for agent YAML, JSON-RPC messages, tools, and orchestrator contracts
- **Utilities** — UUID generation, retry with backoff, URL validation, statistics, sensitive data redaction, and more

## Quick Start

```ts
import {
  Severity,
  TestCategory,
  TestSuite,
  AgentConfigSchema,
  MCPResponseSchema,
} from '@reaatech/mcp-contract-core';
import type {
  TestResult,
  TestReport,
  Validator,
  AgentConfig,
} from '@reaatech/mcp-contract-core';

// Use enums
const severity = Severity.CRITICAL;
const category = TestCategory.PROTOCOL;

// Create a test result
const result: TestResult = {
  validator: 'json-rpc-compliance',
  category: TestCategory.PROTOCOL,
  passed: false,
  severity: Severity.CRITICAL,
  message: 'Missing jsonrpc field in response',
  remediation: 'Add "jsonrpc": "2.0" to all responses',
  durationMs: 5,
  timestamp: new Date().toISOString(),
};

// Validate with schemas
const parsed = AgentConfigSchema.safeParse({
  agent_id: 'my-agent',
  display_name: 'My Agent',
  description: 'A test agent',
  endpoint: 'https://api.example.com',
  type: 'mcp',
  is_default: false,
  confidence_threshold: 0.8,
  clarification_required: true,
  examples: ['What is the weather?'],
});

if (!parsed.success) {
  console.error(parsed.error.flatten());
}
```

## Exports

### Categories

| Export | Kind | Description |
|--------|------|-------------|
| `Severity` | enum | `CRITICAL`, `WARNING`, `INFO` — severity levels for test results |
| `TestCategory` | enum | `REGISTRY`, `PROTOCOL`, `ROUTING`, `SECURITY`, `PERFORMANCE` — validator categories |
| `TestSuite` | enum | `REGISTRY`, `PROTOCOL`, `ROUTING`, `SECURITY`, `PERFORMANCE`, `ALL` — test suite identifiers |

### Results

| Export | Kind | Description |
|--------|------|-------------|
| `TestResult` | interface | Individual test result with validator, category, passed, severity, message, remediation, details, duration, timestamp |
| `TestReport` | interface | Aggregated test report with id, endpoint, timing, results array, summary, failures, passed flag, error, version |
| `ValidationError` | interface | Validation error with field, message, line, severity, type |

### Validation

| Export | Kind | Description |
|--------|------|-------------|
| `Validator` | interface | Validator contract with `name`, `category`, `severity`, `validate()`, and optional `setup()`/`teardown()` |
| `ValidationContext` | interface | Context passed to validators with `client`, `endpoint`, `options`, `requestId`, `artifacts` |

### Client Types

| Export | Kind | Description |
|--------|------|-------------|
| `MCPClient` | interface | MCP client interface with `connect()`, `sendRequest()`, `callTool()`, `listTools()`, `disconnect()`, `getSessionId()` |
| `MCPRequest` | interface | JSON-RPC 2.0 request with `jsonrpc`, `method`, `id`, `params` |
| `MCPResponse<T>` | interface | JSON-RPC 2.0 response with `jsonrpc`, `id`, optional `result` or `error` |
| `MCPError` | interface | JSON-RPC 2.0 error with `code`, `message`, `data` |
| `ToolDefinition` | interface | MCP tool definition with `name`, `description`, `inputSchema` |
| `ToolResult` | interface | Tool call result with `content` array and optional `isError` |

### Config Types

| Export | Kind | Description |
|--------|------|-------------|
| `TestOptions` | interface | Test execution options with `timeout`, `retries`, `failOn`, `verbose`, `suites`, `yamlPath` |

### Schemas

| Export | Kind | Description |
|--------|------|-------------|
| `AgentConfigSchema` | ZodObject | Validates agent YAML definition (agent_id, display_name, description, endpoint, type, is_default, confidence_threshold, clarification_required, examples) |
| `MCPRequestSchema` | ZodObject | Validates JSON-RPC 2.0 request structure |
| `MCPErrorSchema` | ZodObject | Validates JSON-RPC 2.0 error structure |
| `MCPResponseSchema` | ZodObject | Validates JSON-RPC 2.0 response (enforces exactly one of result or error) |
| `ToolDefinitionSchema` | ZodObject | Validates MCP tool definition (name, description, inputSchema) |
| `AgentRequestContractSchema` | ZodObject | Validates orchestrator-to-agent request contract |
| `AgentResponseContractSchema` | ZodObject | Validates agent-to-orchestrator response contract |

### Schema Types

| Export | Kind | Description |
|--------|------|-------------|
| `AgentConfigInput` | type | Inferred type from `AgentConfigSchema` |
| `AgentConfig` | type | Alias for `AgentConfigInput` |
| `AgentType` | type | String literal type `'mcp'` |
| `ToolDefinitionInput` | type | Inferred type from `ToolDefinitionSchema` |
| `AgentRequestContract` | type | Inferred type from `AgentRequestContractSchema` |
| `AgentResponseContract` | type | Inferred type from `AgentResponseContractSchema` |

### Utilities

| Export | Kind | Description |
|--------|------|-------------|
| `generateId()` | function | Generate a unique request ID using timestamp and random string |
| `generateUUID()` | function | Generate a cryptographically random UUID v4 |
| `sleep(ms)` | function | Promise-based sleep for a given number of milliseconds |
| `retry(fn, opts)` | function | Retry a function with exponential backoff |
| `measureTime(fn)` | function | Measure execution time of an async function, returns `{ result, durationMs }` |
| `now()` | function | Get current ISO 8601 timestamp string |
| `truncate(str, maxLength)` | function | Truncate a string to a maximum length, appending `...` if truncated |
| `redactSensitiveData(obj, keys?)` | function | Redact sensitive keys (password, token, secret, key, authorization) from an object |
| `percentile(values, p)` | function | Calculate the p-th percentile from an array of numbers |
| `isValidURL(value)` | function | Check if a value is a valid http/https URL |
| `isPrivateURL(value)` | function | Check if a URL is private/localhost (SSRF protection) |
| `calculateStats(values)` | function | Calculate min, max, mean, p50, p90, p99 from an array of values |
| `isValidUUID(value)` | function | Validate a string against UUID v4 format |
| `getVersion()` | function | Read the package version from the nearest `package.json` |

## Usage Pattern

All Zod schemas are paired with inferred types. Use the schema for runtime validation and the
type for compile-time safety:

```ts
import { AgentConfigSchema, MCPResponseSchema } from '@reaatech/mcp-contract-core';
import type { AgentConfig, MCPResponse } from '@reaatech/mcp-contract-core';

// Runtime validation
function parseAgentConfig(raw: unknown): AgentConfig {
  return AgentConfigSchema.parse(raw);
}

// Type annotation
function handleResponse(response: MCPResponse<string>): string | undefined {
  const parsed = MCPResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error('Invalid JSON-RPC response');
  }
  return parsed.data.result;
}
```

## Related Packages

- [@reaatech/mcp-contract-cli](https://www.npmjs.com/package/@reaatech/mcp-contract-cli) — CLI tool and public API for conformance testing
- [@reaatech/mcp-contract-client](https://www.npmjs.com/package/@reaatech/mcp-contract-client) — MCP client SDK
- [@reaatech/mcp-contract-validators](https://www.npmjs.com/package/@reaatech/mcp-contract-validators) — Conformance validators
- [@reaatech/mcp-contract-reporters](https://www.npmjs.com/package/@reaatech/mcp-contract-reporters) — Report formatters
- [@reaatech/mcp-contract-observability](https://www.npmjs.com/package/@reaatech/mcp-contract-observability) — Logging, metrics, tracing

## License

MIT
