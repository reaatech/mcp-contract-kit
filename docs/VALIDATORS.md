# Validators Reference

This document describes all validators in mcp-contract-kit, their input/output schemas, failure modes, and remediation guidance.

## Registry Validators

### Schema Validator

**File:** `src/validators/registry/schema.validator.ts`

**Purpose:** Validates agent registry YAML files against the AgentConfigSchema.

**Input:**
- YAML file path via `context.options.yamlPath`

**Output:**
```typescript
{
  validator: 'schema-validator',
  category: 'registry',
  severity: 'critical' | 'warning' | 'info',
  passed: boolean,
  message: string,
  details?: {
    config: AgentConfigInput,
    agentCount: number,
    warnings: ValidationError[]
  },
  remediation?: string
}
```

**Failure Modes:**
- File not found or unreadable
- YAML parse errors
- Missing required fields (agent_id, display_name, description, endpoint, type)
- Invalid field types
- Description too short (< 20 characters) - WARNING only

**Remediation:**
```
agent_id: <unique-id>
display_name: <human-readable name>
description: <detailed description of at least 20 characters>
endpoint: <https://your-agent-endpoint.com>
type: mcp
is_default: false
confidence_threshold: 0.8
clarification_required: false
examples: []
```

---

### Invariant Validator

**File:** `src/validators/registry/invariant.validator.ts`

**Purpose:** Enforces business rules across the registry.

**Checks:**
1. Exactly one default agent (`is_default: true`)
2. Default agent has `confidence_threshold: 0`
3. All agent IDs are unique
4. All endpoint URLs are valid and publicly accessible
5. Endpoint URLs do not exceed 2048 characters

**Failure Modes:**
- `MULTIPLE_DEFAULTS` - More than one agent with `is_default: true`
- `NO_DEFAULT_AGENT` - No agent has `is_default: true`
- `INVALID_DEFAULT_THRESHOLD` - Default agent has non-zero `confidence_threshold`
- `DUPLICATE_AGENT_IDS` - Duplicate `agent_id` values found
- `INVALID_ENDPOINT_URL` - Endpoint URL is malformed
- `SSRF_VULNERABILITY` - Endpoint is localhost or private IP
- `ENDPOINT_TOO_LONG` - Endpoint exceeds 2048 characters

**Remediation:**
- Ensure exactly one agent has `is_default: true`
- Default agent must have `confidence_threshold: 0`
- Use unique agent_id values
- Use public HTTPS endpoints (no localhost/private IPs in production)
- Keep endpoint URLs under 2048 characters

---

### Environment Variable Expansion Validator

**File:** `src/validators/registry/env-expansion.validator.ts`

**Purpose:** Validates `${ENV_VAR}` syntax in YAML files.

**Checks:**
- Valid `${VAR}` syntax
- Variable names are valid (alphanumeric + underscore, no leading digits)
- No circular references
- All referenced variables are defined

**Failure Modes:**
- `INCOMPLETE_ENV_VAR` - `${INCOMPLETE` missing closing brace
- `INVALID_ENV_VAR_NAME` - Variable name contains invalid characters
- `CIRCULAR_ENV_REF` - A references B which references A
- `ENV_VAR_UNDEFINED` - Reference to undefined variable (WARNING only)

**Remediation:**
- Complete `${VAR}` syntax
- Use valid variable names (a-z, A-Z, 0-9, underscore, no leading digit)
- Avoid circular references
- Define all referenced environment variables

---

## Protocol Validators

### JSON-RPC 2.0 Validator

**File:** `src/validators/protocol/jsonrpc.validator.ts`

**Purpose:** Validates JSON-RPC 2.0 compliance.

**Checks:**
- All responses have `jsonrpc: "2.0"`
- All responses have an `id` matching the request
- Responses have either `result` OR `error`, never both
- Error objects have `code` (integer) and `message` (string)
- Error codes are valid (-32700 to -32000 for reserved)

**Failure Modes:**
- Missing `jsonrpc` field
- Missing `id` field
- Both `result` and `error` present
- Invalid error structure

**Remediation:**
- Always include `"jsonrpc": "2.0"` in responses
- Match response `id` to request `id`
- Include either `result` or `error`, never both
- Follow JSON-RPC error format: `{ code: number, message: string, data?: any }`

---

### Tool Discovery Validator

**File:** `src/validators/protocol/tool-discovery.validator.ts`

**Purpose:** Validates `tools/list` implementation.

**Checks:**
- `tools/list` returns a valid array
- Each tool has `name`, `description`, `inputSchema`
- Tool names are unique
- Tool names follow naming conventions (lowercase, hyphens allowed)
- `inputSchema` is valid JSON Schema

**Failure Modes:**
- `tools/list` not implemented
- Returns non-array
- Missing required tool fields
- Duplicate tool names
- Invalid `inputSchema`

**Remediation:**
- Implement `tools/list` returning `{ tools: [...] }`
- Include `name`, `description`, and `inputSchema` for each tool
- Use unique tool names
- Follow naming conventions (lowercase, hyphens)
- Use valid JSON Schema for `inputSchema`

---

### Tool Execution Validator

**File:** `src/validators/protocol/tool-execution.validator.ts`

**Purpose:** Validates `tools/call` implementation.

**Checks:**
- `tools/call` with valid tool name executes successfully
- Invalid tool name returns proper error
- Input validation against declared schema
- Response contains valid content array

**Failure Modes:**
- Unknown tool does not return error
- Invalid input does not return error
- Response missing content

**Remediation:**
- Return error for unknown tools: `{ error: { code: -32601, message: "Method not found" } }`
- Validate inputs against `inputSchema`
- Return properly formatted responses: `{ content: [{ type: "text", text: "..." }] }`

---

### Session Validator

**File:** `src/validators/protocol/session.validator.ts`

**Purpose:** Validates session management.

**Checks:**
- Session ID generation
- Session persistence across requests
- Session cleanup
- Concurrent session isolation

**Failure Modes:**
- Session ID not persisted
- Sessions interfere with each other
- Session data leakage between sessions

**Remediation:**
- Generate unique session IDs per request
- Maintain session state consistently
- Properly isolate concurrent sessions
- Clean up session resources when done

---

## Routing Validators

### Request Contract Validator

**File:** `src/validators/routing/request-contract.validator.ts`

**Purpose:** Validates orchestrator → agent request format.

**Required Fields:**
- `session_id` (UUID)
- `request_id` (UUID)
- `employee_id` (string)
- `raw_input` (string)

**Optional Fields:**
- `display_name` (string)
- `intent_summary` (string)
- `entities` (object)
- `turn_history` (array)
- `workflow_state` (object)

**Failure Modes:**
- Missing required fields
- Invalid UUID format
- Invalid field types

**Remediation:**
```
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "request_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "employee_id": "EMP12345",
  "raw_input": "User's message here"
}
```

---

### Response Contract Validator

**File:** `src/validators/routing/response-contract.validator.ts`

**Purpose:** Validates agent → orchestrator response format.

**Required Fields:**
- `content` (string, non-empty)
- `workflow_complete` (boolean)

**Optional Fields:**
- `workflow_state` (object)
- `isError` (boolean)
- `errorMessage` (string)

**Failure Modes:**
- Missing required fields
- Empty content
- Invalid content type

**Remediation:**
```
{
  "content": "Agent's response text",
  "workflow_complete": true,
  "workflow_state": { ... }
}
```

---

### Compatibility Validator

**File:** `src/validators/routing/compatibility.validator.ts`

**Purpose:** End-to-end request/response compatibility.

**Checks:**
- Send test request to agent
- Validate response matches expected contract
- Test various input scenarios
- Verify error handling consistency

---

## Security Validators

### SSRF Validator

**File:** `src/validators/security/ssrf.validator.ts`

**Purpose:** Protects against Server-Side Request Forgery.

**Checks:**
- Endpoint URL is not localhost
- Endpoint URL is not private IP
- Endpoint URL uses HTTPS (WARNING if not)
- DNS rebinding protection

**Failure Modes:**
- `SSRF_VULNERABILITY` - Endpoint is localhost/private IP
- Non-HTTPS endpoint (WARNING)

**Remediation:**
- Use public HTTPS endpoints for production
- Reject localhost/private URLs in agent metadata
- Implement DNS rebinding protection

---

### Authentication Validator

**File:** `src/validators/security/auth.validator.ts`

**Purpose:** Validates authentication requirements.

**Checks:**
- API key requirement
- Invalid key rejection (401)
- Auth bypass attempts

**Failure Modes:**
- No auth required (WARNING)
- Invalid credentials accepted

**Remediation:**
- Implement API key validation
- Return 401 for invalid/missing credentials
- Log authentication failures

---

### Input Sanitization Validator

**File:** `src/validators/security/input-sanitization.validator.ts`

**Purpose:** Validates input sanitization.

**Checks:**
- Prompt injection patterns
- XSS prevention in responses
- SQL injection patterns (if applicable)

**Failure Modes:**
- Prompt injection detected (WARNING)
- Potential XSS in response (WARNING)

**Remediation:**
- Sanitize user inputs
- Escape output appropriately
- Implement input validation

---

## Performance Validators

### Latency Validator

**File:** `src/validators/performance/latency.validator.ts`

**Purpose:** Measures response times.

**Thresholds:**
- p50: 1000ms
- p90: 3000ms
- p99: 5000ms

**Failure Modes:**
- p50 latency exceeds 1000ms
- p90 latency exceeds 3000ms
- p99 latency exceeds 5000ms

**Remediation:**
- Optimize tool execution
- Add caching
- Increase server resources

---

### Concurrency Validator

**File:** `src/validators/performance/concurrency.validator.ts`

**Purpose:** Tests concurrent request handling.

**Checks:**
- Multiple simultaneous requests
- No race conditions
- No data corruption
- Proper resource cleanup

**Failure Modes:**
- Partial or complete request failures
- Race conditions detected
- Resource exhaustion

**Remediation:**
- Ensure thread-safe operations
- Implement proper locking
- Clean up resources properly

---

### Rate Limit Validator

**File:** `src/validators/performance/rate-limit.validator.ts`

**Purpose:** Tests rate limiting behavior.

**Checks:**
- 429 response when limit exceeded
- Retry-After header presence
- Rate limit reset behavior

**Failure Modes:**
- No 429 response (WARNING - consider implementing rate limiting)

**Remediation:**
- Implement rate limiting middleware
- Return 429 when limit exceeded
- Include Retry-After header