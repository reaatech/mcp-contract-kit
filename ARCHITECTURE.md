# ARCHITECTURE.md — mcp-contract-kit

> System-level design for the MCP conformance test suite.

## Overview

This monorepo is a conformance test suite for validating MCP (Model Context Protocol) servers. It provides a CLI, a programmatic API, pluggable validators across five categories (registry, protocol, routing, security, performance), and four output reporters. The kit connects to an MCP server, executes validators, aggregates results, and generates pass/fail reports with remediation guidance.

## Package Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                          cli                                │
│              (CLI entry point, runner, public API)           │
└───────────────┬──────────┬────────────┬────────────────────┘
                │          │            │
     ┌──────────▼──┐ ┌─────▼──────┐ ┌──▼───────────┐
     │  validators │ │ reporters  │ │    client     │
     │  (conform-  │ │ (output    │ │ (MCP HTTP     │
     │   ance      │ │  format-   │ │  transport)   │
     │   checks)   │ │  ters)     │ │               │
     └──────┬──────┘ └─────┬──────┘ └───────┬───────┘
            │              │                │
            └──────────────┼────────────────┘
                           │
                  ┌────────▼────────┐
                  │   observability │
                  │  (logs, metrics,│
                  │    tracing)     │
                  └────────┬───────┘
                           │
                  ┌────────▼────────┐
                  │      core       │
                  │ (types, schemas,│
                  │     utils)      │
                  └─────────────────┘
```

| Package | Path | Scope | Purpose |
|---------|------|-------|---------|
| `core` | `packages/core/` | `@reaatech/mcp-contract-core` | Domain types, Zod schemas, UUID/id generators, retry helpers |
| `observability` | `packages/observability/` | `@reaatech/mcp-contract-observability` | Pino logger, in-memory metrics, span tracing |
| `client` | `packages/client/` | `@reaatech/mcp-contract-client` | HTTP transport, MCP client (connect, tools/list, tools/call) |
| `validators` | `packages/validators/` | `@reaatech/mcp-contract-validators` | Five suites of conformance checks |
| `reporters` | `packages/reporters/` | `@reaatech/mcp-contract-reporters` | Console, JSON, Markdown, HTML output formatters |
| `cli` | `packages/cli/` | `@reaatech/mcp-contract-cli` | CLI entry point, test runner, public API functions |

## Data Flow

### Test Run (CLI / Programmatic API)

```
CLI (mcp-contract-kit test <endpoint>)
       │
       ▼
  parseArgs()         ──► Resolve suites, format, timeout, failOn
       │
       ▼
  runTests()          ──► createMCPClient(endpoint)  ──► MCPHtpClient.connect()
       │                         │
       │                         ▼
       │                 HttpTransport.request()
       │                    POST <endpoint>
       │                    JSON-RPC body
       │                         │
       ▼                         ▼
  expandSuites()      ◄── Target MCP Server responds
       │
       ▼
  getValidatorsForSuites()  ──► Array<Validator>
       │
       ▼
  executeValidators()       ──► For each validator:
       │                          1. validator.setup?(context)
       │                          2. validator.validate(context)
       │                          3. validator.teardown?(context)
       │                          4. metrics.recordDuration()
       │                          5. metrics.inc(passed/failed)
       │
       ▼
  aggregateResults()        ──► TestReport
       │
       ▼
  formatReport(report, format) ──► Console | JSON | Markdown | HTML
       │
       ▼
  Exit code 0 | 1 | 2 | 3
```

### YAML Validation (Offline)

```
CLI (mcp-contract-kit validate-yaml <path>)
       │
       ▼
  parseArgs()         ──► Resolve yamlPath, strict mode
       │
       ▼
  validateRegistry()  ──► createNullClient()  (no network)
       │
       ▼
  getRegistryValidators()   ──► [SchemaValidator, InvariantValidator, EnvExpansionValidator]
       │
       ▼
  aggregateResults()        ──► TestReport
       │
       ▼
  formatReport(report, format)
       │
       ▼
  Exit code 0 | 1
```

## Component Deep Dives

### Runner

Location: `packages/cli/src/runner.ts`

```typescript
interface RunOptions {
  endpoint: string;
  suites?: Array<TestCategory | TestSuite>;
  timeout?: number;     // default 30000
  retries?: number;     // default 3
  headers?: Record<string, string>;
  yamlPath?: string;
  verbose?: boolean;
  failOn?: Severity;    // default CRITICAL
}
```

The runner orchestrates the five execution phases:

1. **Suite Expansion** — Resolves `TestSuite.ALL` or explicit suites into `TestCategory[]`
2. **Validator Loading** — Calls `getRegistryValidators()` / `getProtocolValidators()` / etc. to get the validator set
3. **Client Creation** — `createMCPClient({ endpoint, timeout, retries })` establishes the HTTP transport
4. **Sequential Execution** — Validators run one at a time (setup → validate → teardown), collecting results
5. **Aggregation** — Counts passed, failed, warnings, criticals; generates a `TestReport`

Public API:
- `runTests(options)` — Full conformance run against an endpoint
- `validateRegistry(options)` — Offline YAML validation (no network)
- `validateProtocol(options)` / `validateRouting(options)` — Single-suite convenience wrappers
- `generateReport(report, format)` — Format a report object into a string

### Core

Location: `packages/core/src/`

```
core/
├── domain.ts    Domain types (Validator, MCPClient, TestReport, enums)
├── schemas.ts   Zod schemas (AgentConfigSchema, MCP response schemas)
├── utils.ts     generateId(), generateUUID(), now(), retry()
└── version.ts   getVersion() from package.json
```

Key domain interfaces:

```typescript
interface Validator {
  name: string;
  category: TestCategory;
  severity: Severity;
  validate(context: ValidationContext): Promise<TestResult>;
  setup?(context: ValidationContext): Promise<void>;
  teardown?(context: ValidationContext): Promise<void>;
}

interface ValidationContext {
  client: MCPClient;
  endpoint: string;
  options: TestOptions;
  requestId: string;
  artifacts?: Record<string, unknown>;
}
```

### MCP Client

Location: `packages/client/src/`

```
client/
├── client.ts            MCPHttpClient (implements MCPClient)
├── transport.ts         HttpTransport (fetch-based, SSE + JSON)
├── request-builder.ts   Builds JSON-RPC 2.0 requests
└── index.ts             createMCPClient() factory
```

```typescript
interface MCPClient {
  connect(): Promise<void>;
  sendRequest<T>(request: MCPRequest): Promise<MCPResponse<T>>;
  callTool(name: string, args: Record<string, unknown>): Promise<ToolResult>;
  listTools(): Promise<ToolDefinition[]>;
  disconnect(): Promise<void>;
  getSessionId(): Promise<string>;
}
```

**Transport:** `HttpTransport` sends POST requests with JSON-RPC bodies. It auto-detects SSE responses via the `text/event-stream` content-type and deserializes them. Includes configurable retry with exponential backoff (100 ms base, 2 s max).

### Validators

Location: `packages/validators/src/`

```
validators/src/
├── registry/       schema, invariant, env-expansion
├── protocol/       jsonrpc, tool-discovery, tool-execution, session
├── routing/        request-contract, response-contract, compatibility
├── security/       ssrf, auth, input-sanitization
└── performance/    latency, concurrency, rate-limit
```

#### Registry Compliance Validators

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Registry Validators                               │
│                                                                      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │ SchemaValidator │    │ Invariant       │    │ EnvExpansion    │  │
│  │                 │    │ Validator       │    │ Validator       │  │
│  │ Validates YAML  │    │                 │    │                 │  │
│  │ against Zod     │    │ Checks:         │    │ Checks:         │  │
│  │ schema          │    │ - One default   │    │ - ${VAR} syntax │  │
│  │                 │    │ - Unique IDs    │    │ - Undefined     │  │
│  │                 │    │ - Valid URLs    │    │   variables     │  │
│  │                 │    │                 │    │                 │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**SchemaValidator** (`packages/validators/src/registry/schema.validator.ts`):
- Parses YAML file
- Validates against `AgentConfigSchema` (Zod)
- Reports field-level errors with line numbers
- Required fields: agent_id, display_name, description, endpoint, type, is_default, confidence_threshold, clarification_required, examples

**InvariantValidator** (`packages/validators/src/registry/invariant.validator.ts`):
- Exactly one agent has `is_default: true`
- Default agent has `confidence_threshold: 0`
- All agent IDs are unique
- Endpoint URLs are valid and not localhost/private IPs
- File sizes within configured limits

**EnvExpansionValidator** (`packages/validators/src/registry/env-expansion.validator.ts`):
- Validates `${ENV_VAR}` syntax
- Warns about undefined environment variables
- Detects circular references

#### Protocol Conformance Validators

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Protocol Validators                                │
│                                                                      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │ JSONRPC         │    │ ToolDiscovery   │    │ ToolExecution   │  │
│  │ Validator       │    │ Validator       │    │ Validator       │  │
│  │                 │    │                 │    │                 │  │
│  │ Validates:      │    │ Validates:      │    │ Validates:      │  │
│  │ - jsonrpc: 2.0  │    │ - tools/list    │    │ - tools/call    │  │
│  │ - id matching   │    │   response      │    │ - Input         │  │
│  │ - result/error  │    │ - Tool names    │    │   validation    │  │
│  │   exclusivity   │    │   unique        │    │ - Response      │  │
│  │ - Error codes   │    │ - Schema valid  │    │   format        │  │
│  │                 │    │                 │    │                 │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘  │
│                                                                      │
│  ┌─────────────────┐                                                │
│  │ SessionValidator│                                                │
│  │                 │                                                │
│  │ Validates:      │                                                │
│  │ - Session ID    │                                                │
│  │   generation    │                                                │
│  │ - Persistence   │                                                │
│  │ - Isolation     │                                                │
│  │                 │                                                │
│  └─────────────────┘                                                │
└─────────────────────────────────────────────────────────────────────┘
```

**JSONRPCValidator** (`packages/validators/src/protocol/jsonrpc.validator.ts`):
- Sends test requests and validates responses
- Checks `jsonrpc: "2.0"` in all responses
- Validates `id` field matches request
- Ensures `result` XOR `error` (not both, not neither)
- Validates error object structure (code, message, optional data)
- Checks error codes are in valid ranges

**ToolDiscoveryValidator** (`packages/validators/src/protocol/tool-discovery.validator.ts`):
- Calls `tools/list` method
- Validates response is an array
- Each tool has required fields (name, description, inputSchema)
- Tool names are unique
- Tool names follow conventions (lowercase, hyphens)
- Input schemas are valid JSON Schema

**ToolExecutionValidator** (`packages/validators/src/protocol/tool-execution.validator.ts`):
- Calls each discovered tool with valid inputs
- Validates input schema enforcement
- Checks response contains valid content array
- Tests error handling for unknown tools
- Validates timeout behavior

**SessionValidator** (`packages/validators/src/protocol/session.validator.ts`):
- Creates session and validates ID format
- Verifies session persists across requests
- Tests session cleanup on termination
- Validates concurrent session isolation

#### Routing Contract Validators

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Routing Validators                                 │
│                                                                      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │ RequestContract │    │ ResponseContract│    │ Compatibility   │  │
│  │ Validator       │    │ Validator       │    │ Validator       │  │
│  │                 │    │                 │    │                 │  │
│  │ Validates       │    │ Validates       │    │ End-to-end      │  │
│  │ orchestrator →  │    │ agent →         │    │ contract test   │  │
│  │ agent request   │    │ orchestrator    │    │ with various    │  │
│  │ format          │    │ response        │    │ inputs          │  │
│  │                 │    │ format          │    │                 │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**RequestContractValidator** (`packages/validators/src/routing/request-contract.validator.ts`):
- Validates the standard request schema sent by orchestrators
- Required fields: session_id (UUID), request_id (UUID), employee_id, raw_input
- Optional fields: display_name, intent_summary, entities, turn_history, workflow_state
- Field type validation (UUIDs, string lengths, array structures)

**ResponseContractValidator** (`packages/validators/src/routing/response-contract.validator.ts`):
- Validates the standard response schema agents must return
- Required fields: content (non-empty string), workflow_complete (boolean)
- Optional fields: workflow_state, isError, errorMessage

**CompatibilityValidator** (`packages/validators/src/routing/compatibility.validator.ts`):
- Sends test requests to the agent
- Validates responses match expected contract
- Tests with various input scenarios (empty, long, special chars, Unicode)
- Verifies error handling consistency

#### Security Validators

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Security Validators                                │
│                                                                      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │ SSRFValidator   │    │ AuthValidator   │    │ InputSanitiz-   │  │
│  │                 │    │                 │    │ ationValidator  │  │
│  │ Checks:         │    │ Checks:         │    │                 │  │
│  │ - Endpoint URL  │    │ - API key       │    │ Checks:         │  │
│  │   validation    │    │   required      │    │ - Prompt        │  │
│  │ - Private IP    │    │ - Invalid key   │    │   injection     │  │
│  │   rejection     │    │   rejected      │    │ - XSS           │  │
│  │ - Redirect      │    │ - 401 on        │    │ - SQL injection │  │
│  │   handling      │    │   unauthorized  │    │                 │  │
│  │                 │    │                 │    │                 │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**SSRFValidator** (`packages/validators/src/security/ssrf.validator.ts`):
- Validates endpoint URLs reject localhost and private IPs
- Tests DNS rebinding detection
- Validates redirect following behavior

**AuthValidator** (`packages/validators/src/security/auth.validator.ts`):
- Checks if API key is required (configurable)
- Validates invalid keys are rejected with 401
- Tests auth bypass attempts

**InputSanitizationValidator** (`packages/validators/src/security/input-sanitization.validator.ts`):
- Sends prompt injection patterns
- Validates XSS prevention
- Tests SQL injection pattern handling

#### Performance Validators

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Performance Validators                             │
│                                                                      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │ LatencyValidator│    │ Concurrency     │    │ RateLimit       │  │
│  │                 │    │ Validator       │    │ Validator       │  │
│  │                 │    │                 │    │                 │  │
│  │ Measures:       │    │ Tests:          │    │ Tests:          │  │
│  │ - p50 latency   │    │ - Concurrent    │    │ - 429 response  │  │
│  │ - p90 latency   │    │   requests      │    │ - Retry-After   │  │
│  │ - p99 latency   │    │ - No race       │    │   header        │  │
│  │ - Timeout       │    │   conditions    │    │ - Reset         │  │
│  │   behavior      │    │ - Resource      │    │   behavior      │  │
│  │                 │    │   cleanup       │    │                 │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**LatencyValidator** (`packages/validators/src/performance/latency.validator.ts`):
- Measures response times for various operations
- Calculates p50, p90, p99 percentiles
- Validates against configurable thresholds
- Tests timeout behavior

**ConcurrencyValidator** (`packages/validators/src/performance/concurrency.validator.ts`):
- Sends multiple simultaneous requests
- Validates no race conditions
- Checks data integrity under load
- Verifies resource cleanup

**RateLimitValidator** (`packages/validators/src/performance/rate-limit.validator.ts`):
- Sends requests exceeding rate limit
- Validates 429 response
- Checks Retry-After header presence
- Tests rate limit reset behavior

### Reporters

Location: `packages/reporters/src/`

```
reporters/src/
├── console.reporter.ts     Colored terminal output
├── json.reporter.ts        Machine-readable JSON
├── markdown.reporter.ts    GitHub-flavored markdown
└── html.reporter.ts        Interactive HTML dashboard
```

```typescript
type ReportFormat = 'console' | 'json' | 'markdown' | 'html';

function formatReport(report: TestReport, format: ReportFormat): Promise<string>;
```

| Reporter | Output | Use Case |
|----------|--------|----------|
| `console` | Colored terminal output | Interactive CLI usage |
| `json` | Machine-readable JSON | CI/CD pipelines, programmatic use |
| `markdown` | GitHub-flavored markdown | PR comments, documentation |
| `html` | Interactive dashboard | Human review, sharing results |

### Observability

Location: `packages/observability/src/`

#### Logger (`logger.ts`)

Pino-based structured logger with PII redaction. Sensitive keys (`password`, `token`, `secret`, `key`, `authorization`, `api_key`, `employee_id`, `session_id`) are automatically replaced with `[REDACTED]`.

```typescript
import { logger, createLogger } from '@reaatech/mcp-contract-observability';

// Default logger
logger.info('Connected to server', { endpoint: 'https://agent.example.com' });

// Child logger with request context
const child = logger.child({ request_id: 'abc-123' });
child.warn('Slow response', { durationMs: 2500 });
```

#### Metrics (`metrics.ts`)

In-memory singleton collector with counters and duration histograms. Buckets: 10, 50, 100, 250, 500, 1000, 2500, 5000, 10000 ms.

```typescript
import { metrics, MetricNames } from '@reaatech/mcp-contract-observability';

metrics.inc(MetricNames.TESTS_TOTAL, 1);
metrics.recordDuration(MetricNames.VALIDATOR_DURATION, 42, { validator: 'jsonrpc' });

// Summary
const summary = metrics.getSummary();
// { uptime: 12, counters: { ... }, histograms: { ... } }
```

| Metric Constant | Type | Labels |
|-----------------|------|--------|
| `MetricNames.TESTS_TOTAL` | Counter | `validator`, `category` |
| `MetricNames.TESTS_PASSED` | Counter | `validator`, `category` |
| `MetricNames.TESTS_FAILED` | Counter | `validator`, `category` |
| `MetricNames.TESTS_WARNING` | Counter | `validator`, `category` |
| `MetricNames.VALIDATOR_DURATION` | Histogram | `validator`, `category` |
| `MetricNames.RUN_DURATION` | Histogram | — |
| `MetricNames.ERRORS_TOTAL` | Counter | `validator`, `category` |

#### Tracing (`tracing.ts`)

In-memory span tracing with W3C trace context propagation.

```typescript
import { startSpan, endSpan, withSpan, toTraceParent } from '@reaatech/mcp-contract-observability';

// Manual span
const span = startSpan('jsonrpc.check', { endpoint: 'https://...' });
// ... do work ...
endSpan(span, 'ok');

// Auto-span wrapper
await withSpan('full.suite.run', async () => {
  // all work inside is measured
});

// W3C propagation
const header = toTraceParent(span.context); // "00-<traceId>-<spanId>-01"
```

## Configuration

### CLI Usage

```
mcp-contract-kit test <endpoint> [OPTIONS]
mcp-contract-kit validate-yaml <path> [OPTIONS]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--suite <name>` | `all` | Test suite: registry, protocol, routing, security, performance (repeatable) |
| `--format <format>` | `console` | Output format: console, json, markdown, html |
| `--output <path>` | stdout | Write report to file |
| `--verbose` | `false` | Show detailed output |
| `--fail-on <level>` | `critical` | Exit error threshold: critical, warning |
| `--timeout <ms>` | `30000` | Request timeout in milliseconds |
| `--retries <n>` | `3` | Retry count for transient failures |
| `--strict` | `false` | (validate-yaml) Fail on warnings too |
| `--help` | — | Show help message |
| `--version` | — | Show version |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Pino logging level (debug, info, warn, error) |
| `MCP_TIMEOUT_MS` | `30000` | Request timeout |
| `MCP_RETRIES` | `3` | Retry count for transient failures |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | OpenTelemetry collector endpoint (optional) |

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All tests passed (or only info-level findings) |
| `1` | Critical failures found |
| `2` | Warning failures found (with `--fail-on warning` or `--strict`) |
| `3` | Test execution error (network, timeout, crash) |

## Error Handling

| Error Type | Detection | Recovery |
|------------|-----------|----------|
| Network timeout | AbortController fires after `--timeout` ms | Retry with exponential backoff (100 ms → 2 s), then fail |
| Invalid JSON-RPC response | JSON parse error or missing `jsonrpc` field | Report as critical protocol failure |
| Connection refused | TCP error from `fetch()` | Report server unreachable |
| Content-type mismatch | SSE payload when JSON expected (or vice versa) | Auto-detected and deserialized |
| YAML parse error | YAML parser exception | Report with line number |
| Schema validation error | Zod parse error | Report field-level errors with path |

## References

- **AGENTS.md** — Agent development guide and conformance checklist
- **README.md** — Quick start and overview
- **skills/** — Skill definitions for each test category
- **packages/** — Monorepo package source code
- **MCP Specification** — https://modelcontextprotocol.io/
