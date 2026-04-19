# mcp-contract-kit — Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                  │
│  │     CLI     │    │   Library   │    │  CI/CD      │                  │
│  │   (npx)     │    │  (import)   │    │  Pipeline   │                  │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                  │
│         │                   │                   │                         │
│         └───────────────────┼───────────────────┘                         │
│                             │                                               │
└─────────────────────────────┼─────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Test Runner                                    │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Runner Orchestrator                            │   │
│  │                                                                   │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │   │
│  │  │   Config    │───▶│  Scheduler  │───▶│  Executor   │           │   │
│  │  │  Resolver   │    │ (Parallel)  │    │ (Sequential)│           │   │
│  │  └─────────────┘    └─────────────┘    └─────────────┘           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Validator Pipeline                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  Registry   │  │  Protocol   │  │   Routing   │  │  Security   │    │
│  │  Validators │  │  Validators │  │  Validators │  │  Validators │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                 │                │                │           │
│         └─────────────────┼────────────────┼────────────────┘           │
│                           ▼                                              │
│                  ┌─────────────────┐                                    │
│                  │  Performance    │                                    │
│                  │  Validators     │                                    │
│                  └─────────────────┘                                    │
└─────────────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           MCP Client                                     │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Transport Abstraction                          │   │
│  │                                                                   │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │   │
│  │  │ Streamable  │    │     SSE     │    │   Stdio     │           │   │
│  │  │   HTTP      │    │  (Legacy)   │    │  (Local)    │           │   │
│  │  └─────────────┘    └─────────────┘    └─────────────┘           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Target MCP Server                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Agent A   │  │   Agent B   │  │  Orchestra- │  │  Any MCP    │    │
│  │             │  │             │  │   tor Core  │  │   Server    │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Reporters                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Console   │  │    JSON     │  │     HTML    │  │  Markdown   │    │
│  │  (Colored)  │  │ (Machine)   │  │  (Dashboard)│  │  (Summary)  │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Design Principles

### 1. Non-Destructive Testing
- Validators never modify the target server
- All tests are read-only operations
- No side effects on the MCP server state
- Safe to run against production endpoints

### 2. Idempotent Execution
- Running the same test twice produces identical results
- No state carried between test runs
- Deterministic output for CI/CD reliability
- Retry-safe operations

### 3. Fast Feedback
- Individual validators complete in <1 second
- Parallel execution where possible
- Early termination on critical failures (configurable)
- Progressive reporting (stream results as they complete)

### 4. Clear Failures
- Every test failure includes remediation guidance
- Severity levels (critical, warning, info) for prioritization
- Line numbers and context for YAML validation errors
- Actionable error messages, not just "test failed"

### 5. Extensible Architecture
- Pluggable validator system
- Custom validators can be added without modifying core
- Reporter interface for custom output formats
- Configuration-driven test selection

---

## Component Deep Dive

### Test Runner

The runner orchestrates all validators and aggregates results:

```typescript
interface TestRunner {
  // Run specific suites
  run(options: RunOptions): Promise<TestReport>;
  
  // Run single validator
  validate(validator: Validator): Promise<TestResult>;
  
  // Aggregate results
  aggregate(results: TestResult[]): TestReport;
}
```

**Execution Strategy:**
1. **Configuration Phase** — Resolve suites, filters, and options
2. **Setup Phase** — Establish MCP connection, validate connectivity
3. **Execution Phase** — Run validators (parallel where safe, sequential where required)
4. **Aggregation Phase** — Collect results, calculate summary statistics
5. **Reporting Phase** — Format and output results

**Design Decision:** Validators run in parallel by default for speed, but can be
forced to run sequentially if they have dependencies or shared state requirements.

### Validator System

Each validator implements a common interface:

```typescript
interface Validator {
  // Unique identifier
  name: string;
  
  // Category (registry, protocol, routing, security, performance)
  category: TestCategory;
  
  // Severity level for failures
  severity: Severity;
  
  // Main validation logic
  validate(client: MCPClient, context: TestContext): Promise<TestResult>;
  
  // Optional: setup before validation
  setup?(context: TestContext): Promise<void>;
  
  // Optional: cleanup after validation
  teardown?(context: TestContext): Promise<void>;
}
```

**Validator Categories:**

| Category | Purpose | Execution |
|----------|---------|-----------|
| **Registry** | YAML schema and invariant validation | File-based, no network |
| **Protocol** | MCP JSON-RPC 2.0 spec compliance | Network calls to server |
| **Routing** | Request/response contract compatibility | Network calls with specific payloads |
| **Security** | SSRF, auth, input sanitization | Network calls with edge cases |
| **Performance** | Latency, concurrency, rate limiting | Multiple network calls, timing |

### MCP Client

Abstracts transport details and provides a unified interface:

```typescript
interface MCPClient {
  // Connect to server
  connect(): Promise<void>;
  
  // Send JSON-RPC request
  sendRequest(request: MCPRequest): Promise<MCPResponse>;
  
  // Call a tool
  callTool(name: string, args: Record<string, unknown>): Promise<ToolResult>;
  
  // List available tools
  listTools(): Promise<ToolDefinition[]>;
  
  // Close connection
  disconnect(): Promise<void>;
}
```

**Transport Implementations:**

| Transport | Use Case | Protocol |
|-----------|----------|----------|
| **StreamableHTTP** | Modern MCP servers | HTTP POST to `/mcp` |
| **SSE** | Legacy MCP servers | Server-Sent Events |
| **Stdio** | Local development | Child process stdio |

**Design Decision:** The client handles retry logic, timeout management, and
error normalization so validators can focus on validation logic.

### Reporter System

Formats test results for different consumers:

```typescript
interface Reporter {
  // Generate report from results
  report(results: TestReport): Promise<string>;
  
  // Write to file or stdout
  write(output: string, destination?: string): Promise<void>;
}
```

**Reporter Implementations:**

| Reporter | Output | Use Case |
|----------|--------|----------|
| **Console** | Colored terminal output | Interactive CLI usage |
| **JSON** | Machine-readable JSON | CI/CD pipelines, programmatic use |
| **HTML** | Interactive dashboard | Human review, sharing results |
| **Markdown** | GitHub-flavored markdown | PR comments, documentation |

---

## Validator Deep Dive

### Registry Compliance Validators

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

**SchemaValidator:**
- Parses YAML file
- Validates against `AgentConfigSchema` (Zod)
- Reports field-level errors with line numbers
- Checks required fields: agent_id, display_name, description, endpoint, type, is_default, confidence_threshold, clarification_required, examples

**InvariantValidator:**
- Exactly one agent has `is_default: true`
- Default agent has `confidence_threshold: 0`
- All agent IDs are unique
- Endpoint URLs are valid and not localhost/private IPs (SSRF protection)
- File sizes are within limits

**EnvExpansionValidator:**
- Validates `${ENV_VAR}` syntax
- Warns about undefined variables
- Detects circular references

### Protocol Conformance Validators

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

**JSONRPCValidator:**
- Sends test requests and validates responses
- Checks `jsonrpc: "2.0"` in all responses
- Validates `id` field matches request
- Ensures `result` XOR `error` (not both, not neither)
- Validates error object structure (code, message, optional data)
- Checks error codes are in valid ranges

**ToolDiscoveryValidator:**
- Calls `tools/list` method
- Validates response is an array
- Each tool has required fields (name, description, inputSchema)
- Tool names are unique
- Tool names follow conventions (lowercase, hyphens)
- Input schemas are valid JSON Schema

**ToolExecutionValidator:**
- Calls each discovered tool with valid inputs
- Validates input schema enforcement
- Checks response contains valid content array
- Tests error handling for unknown tools
- Validates timeout behavior

**SessionValidator:**
- Creates session and validates ID format
- Verifies session persists across requests
- Tests session cleanup on termination
- Validates concurrent session isolation

### Routing Contract Validators

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

**RequestContractValidator:**
- Validates the standard request schema sent by orchestrators
- Required fields: session_id (UUID), request_id (UUID), employee_id, raw_input
- Optional fields: display_name, intent_summary, entities, turn_history, workflow_state
- Field type validation (UUIDs, string lengths, array structures)

**ResponseContractValidator:**
- Validates the standard response schema agents must return
- Required fields: content (non-empty string), workflow_complete (boolean)
- Optional fields: workflow_state, isError, errorMessage
- Content must be a non-empty string

**CompatibilityValidator:**
- Sends test requests to the agent
- Validates responses match expected contract
- Tests with various input scenarios (empty, long, special chars, Unicode)
- Verifies error handling consistency

### Security Validators

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

**SSRFValidator:**
- Validates endpoint URLs reject localhost and private IPs
- Tests DNS rebinding detection
- Validates redirect following behavior

**AuthValidator:**
- Checks if API key is required (configurable)
- Validates invalid keys are rejected with 401
- Tests auth bypass attempts

**InputSanitizationValidator:**
- Sends prompt injection patterns
- Validates XSS prevention
- Tests SQL injection pattern handling

### Performance Validators

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

**LatencyValidator:**
- Measures response times for various operations
- Calculates p50, p90, p99 percentiles
- Validates against configurable thresholds
- Tests timeout behavior

**ConcurrencyValidator:**
- Sends multiple simultaneous requests
- Validates no race conditions
- Checks data integrity under load
- Verifies resource cleanup

**RateLimitValidator:**
- Sends requests exceeding rate limit
- Validates 429 response
- Checks Retry-After header presence
- Tests rate limit reset behavior

---

## Data Flow

### Test Execution Flow

```
1. User invokes CLI or library API
        │
2. Configuration resolved (suites, filters, options)
        │
3. MCP connection established to target server
        │
4. Connectivity validated (ping/health check)
        │
5. Validators executed:
   - Registry validators (file-based, parallel)
   - Protocol validators (network calls, parallel)
   - Routing validators (specific payloads, sequential)
   - Security validators (edge cases, sequential)
   - Performance validators (timing, sequential)
        │
6. Results aggregated
        │
7. Report generated (console, JSON, HTML, or markdown)
        │
8. Exit code set based on severity threshold
        │
9. Connection closed
```

### Validator Execution Flow

```
For each validator:
  1. Setup (if applicable)
  2. Execute validation logic
  3. Capture result (pass/fail, severity, message, remediation)
  4. Teardown (if applicable)
  5. Report progress (streaming)
```

---

## Error Handling

| Error Type | Detection | Recovery |
|------------|-----------|----------|
| Network timeout | Request exceeds timeout | Retry with backoff, then fail |
| Invalid JSON-RPC response | Parse error | Report as critical protocol failure |
| Connection refused | TCP error | Report server unreachable |
| SSL certificate error | TLS handshake failure | Report security issue |
| YAML parse error | YAML parser exception | Report with line number |
| Schema validation error | Zod parse error | Report field-level errors |

---

## Observability

### Structured Logging

All operations logged with:
- `timestamp` — ISO-8601
- `service` — "mcp-contract-kit"
- `request_id` — Unique test run identifier
- `validator` — Current validator name
- `level` — Log level (debug, info, warn, error)

### Tracing

Each test run generates OpenTelemetry spans:
- Root span for entire test run
- Child span per validator
- Attributes: duration, result, severity

### Metrics

| Metric | Type | Labels |
|--------|------|--------|
| `contract_kit.runs.total` | Counter | `status` |
| `contract_kit.validator.duration_ms` | Histogram | `validator`, `category` |
| `contract_kit.results.total` | Counter | `severity`, `category` |

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_TIMEOUT_MS` | `30000` | Request timeout |
| `MCP_RETRIES` | `3` | Retry count for transient failures |
| `LOG_LEVEL` | `info` | Logging level |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | OTel collector endpoint |

### CLI Flags

| Flag | Description |
|------|-------------|
| `--endpoint` | MCP server URL |
| `--suite` | Test suite to run (can be repeated) |
| `--format` | Output format (console, json, html, markdown) |
| `--output` | Write report to file |
| `--verbose` | Detailed output |
| `--fail-on` | Exit code threshold (critical, warning) |
| `--yaml` | Path to agent YAML for registry validation |
| `--timeout` | Request timeout in milliseconds |

---

## References

- **AGENTS.md** — Agent development guide
- **DEV_PLAN.md** — Development checklist
- **README.md** — Quick start and overview
- **MCP Specification** — https://modelcontextprotocol.io/
- **ask-gm/orchestrator-core/tests/contract** — Contract testing reference
