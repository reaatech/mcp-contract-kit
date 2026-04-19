# mcp-contract-kit — Agent Development Guide

## What this is

This document defines how to use `mcp-contract-kit` to validate AI agents built
with the MCP (Model Context Protocol) pattern. It covers both using the contract-kit
as a testing tool and building agents that pass conformance validation.

**Target audience:** Engineers building MCP-compliant AI agents who need to
validate their implementations against the MCP specification and multi-agent
orchestration contracts.

---

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Your Agent    │────▶│  contract-kit    │────▶│   Validators    │
│   (MCP Server)  │     │  (Test Runner)   │     │   (Checks)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │    Reporter      │
                       │  (Pass/Fail +    │
                       │  Remediation)    │
                       └──────────────────┘
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **Test Runner** | `src/runner.ts` | Orchestrates all validators |
| **Validators** | `src/validators/` | Individual conformance checks |
| **MCP Client** | `src/mcp-client/` | Connects to your agent for testing |
| **Reporters** | `src/reporters/` | Formats test results |
| **CLI** | `src/cli.ts` | Command-line interface |

---

## Using contract-kit to Validate Your Agent

### Quick Start

```bash
# Install
npm install -g mcp-contract-kit

# Run all tests against your agent
mcp-contract-kit test http://localhost:8080

# Run specific test suite
mcp-contract-kit test http://localhost:8080 --suite protocol

# Generate HTML report
mcp-contract-kit test http://localhost:8080 --format html --output report.html
```

### Test Suites

| Suite | What It Checks | When to Use |
|-------|----------------|-------------|
| `registry` | Agent YAML configuration compliance | Before deploying to orchestrator |
| `protocol` | MCP JSON-RPC 2.0 spec compliance | Always — core MCP validation |
| `routing` | Request/response contract compatibility | When integrating with orchestrator |
| `security` | SSRF, auth, input sanitization | Before production deployment |
| `performance` | Latency, concurrency, rate limiting | Before scaling to production |
| `all` | All suites combined | Full conformance validation |

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All tests passed (only info-level findings) |
| `1` | Critical failures found |
| `2` | Warning failures found (with `--fail-on warning`) |
| `3` | Test execution error (network, timeout) |

---

## Programmatic API

Use contract-kit as a library in your CI/CD pipeline or test suite:

```typescript
import {
  runTests,
  validateRegistry,
  validateProtocol,
  validateRouting,
  generateReport,
  TestSuite,
} from 'mcp-contract-kit';

// Run all tests
const report = await runTests({
  endpoint: 'http://localhost:8080',
  suites: [TestSuite.PROTOCOL, TestSuite.ROUTING],
  timeout: 30000,
});

// Check results
if (report.failures.critical > 0) {
  console.error('Critical conformance issues found');
  process.exit(1);
}

// Generate report
const html = await generateReport(report, 'html');
fs.writeFileSync('conformance-report.html', html);
```

### Validating Agent YAML

```typescript
import { validateRegistry } from 'mcp-contract-kit';

const result = await validateRegistry({
  yamlPath: './agents/my-agent.yaml',
  strict: true, // Fail on warnings too
});

if (!result.valid) {
  console.error('Registry validation failed:');
  result.errors.forEach(err => console.error(`  - ${err.message}`));
}
```

---

## Skill System

Skills represent the atomic capabilities that contract-kit validates. Each skill
corresponds to a test category.

### Available Skills

| Skill ID | File | Description |
|----------|------|-------------|
| `registry-compliance` | `skills/registry-compliance/skill.md` | YAML schema and invariant validation |
| `protocol-conformance` | `skills/protocol-conformance/skill.md` | MCP JSON-RPC 2.0 compliance |
| `routing-correctness` | `skills/routing-correctness/skill.md` | Request/response contract validation |
| `security-validation` | `skills/security-validation/skill.md` | Security posture checks |
| `performance-baseline` | `skills/performance-baseline/skill.md` | Latency and concurrency validation |

---

## Agent Requirements for Conformance

### Protocol Requirements

Your MCP server MUST:

1. **Implement JSON-RPC 2.0** — All responses must include `jsonrpc: "2.0"`
2. **Support `tools/list`** — Return array of available tools
3. **Support `tools/call`** — Execute tools with validated inputs
4. **Return valid responses** — Include `result` or `error`, never both
5. **Handle unknown tools** — Return proper error for undefined tool names
6. **Validate inputs** — Reject invalid inputs with descriptive errors

### Contract Requirements

If integrating with an orchestrator (like agent-mesh), your agent MUST:

1. **Accept the standard request format:**
   ```json
   {
     "session_id": "uuid",
     "request_id": "uuid",
     "employee_id": "string",
     "raw_input": "string",
     "display_name": "string (optional)",
     "intent_summary": "string (optional)",
     "entities": "object (optional)",
     "turn_history": "array (optional)",
     "workflow_state": "object (optional)"
   }
   ```

2. **Return the standard response format:**
   ```json
   {
     "content": "string (non-empty)",
     "workflow_complete": "boolean",
     "workflow_state": "object (optional)"
   }
   ```

3. **Handle the `handle_message` tool** — This is the standard entry point

### Registry Requirements

If registering with an orchestrator, your agent YAML MUST:

1. **Include all required fields** — agent_id, display_name, description, endpoint, type, is_default, confidence_threshold, clarification_required, examples
2. **Have unique agent_id** — No duplicates in the registry
3. **Set valid endpoint** — Must be a valid URL (not localhost in production)
4. **Default agent has threshold 0** — If `is_default: true`, then `confidence_threshold` must be `0`
5. **Exactly one default agent** — Only one agent can have `is_default: true`

---

## Common Conformance Issues & Remediation

### Critical Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Missing `jsonrpc` field | Response not following JSON-RPC 2.0 | Add `"jsonrpc": "2.0"` to all responses |
| Invalid tool schema | `inputSchema` not valid JSON Schema | Use proper JSON Schema format for tool inputs |
| Missing required fields | Agent YAML missing required properties | Add all required fields from AgentConfigSchema |
| Multiple default agents | More than one agent with `is_default: true` | Set exactly one agent as default |
| SSRF vulnerability | Endpoint URL is localhost or private IP | Use public HTTPS endpoint |

### Warning Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| High latency | Response time exceeds threshold | Optimize tool execution, add caching |
| Missing rate limiting | No 429 responses under load | Implement rate limiting middleware |
| No auth required | API accepts unauthenticated requests | Add API key or bearer token validation |
| Verbose error messages | Stack traces in error responses | Return sanitized error messages |

### Info Suggestions

| Suggestion | Benefit |
|------------|---------|
| Add OpenTelemetry tracing | Better observability in production |
| Implement structured logging | Easier debugging and alerting |
| Add health check endpoint | Better monitoring and load balancing |
| Use Zod for input validation | Type-safe schema validation |

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/conformance.yml
name: MCP Conformance

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  conformance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Start MCP server
        run: npm run build && npm start &
      
      - name: Wait for server
        run: sleep 5
      
      - name: Run conformance tests
        run: |
          npx mcp-contract-kit test http://localhost:8080 \
            --format json \
            --output conformance-report.json
      
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: conformance-report
          path: conformance-report.json
      
      - name: Fail on critical issues
        run: |
          CRITICAL=$(jq '.failures.critical' conformance-report.json)
          if [ "$CRITICAL" -gt "0" ]; then
            echo "Critical conformance issues found"
            exit 1
          fi
```

### Pre-commit Hook

```bash
#!/bin/bash
# .husky/pre-commit

# Run conformance tests before commit
npx mcp-contract-kit test http://localhost:8080 --fail-on critical

if [ $? -ne 0 ]; then
  echo "Conformance issues found. Please fix before committing."
  exit 1
fi
```

---

## Writing Custom Validators

Extend contract-kit with domain-specific validators:

```typescript
import { Validator, TestResult, Severity, TestCategory } from 'mcp-contract-kit';

const myCustomValidator: Validator = {
  name: 'my-custom-check',
  category: TestCategory.PROTOCOL,
  severity: Severity.WARNING,
  
  async validate(client, context) {
    // Your validation logic here
    const result = await client.sendRequest({
      method: 'tools/call',
      params: { name: 'my_tool', arguments: {} },
    });
    
    if (result.error) {
      return {
        passed: false,
        severity: Severity.CRITICAL,
        message: 'Custom validation failed',
        remediation: 'Fix the issue by...',
      };
    }
    
    return {
      passed: true,
      severity: Severity.INFO,
      message: 'Custom validation passed',
    };
  },
};
```

---

## Testing Your Agent Locally

### Using Docker

```bash
# Build and run your agent
docker build -t my-agent .
docker run -p 8080:8080 my-agent

# In another terminal, run conformance tests
npx mcp-contract-kit test http://localhost:8080
```

### Using docker-compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  agent:
    build: .
    ports:
      - "8080:8080"
  
  contract-kit:
    image: mcp-contract-kit:latest
    command: test http://agent:8080 --format html --output /reports/report.html
    volumes:
      - ./reports:/reports
    depends_on:
      - agent
```

```bash
docker-compose up --exit-code-from contract-kit
```

---

## Checklist: Passing Conformance

Before deploying your agent to production:

- [ ] Protocol conformance tests pass (no critical failures)
- [ ] Routing contract tests pass (request/response format correct)
- [ ] Security tests pass (auth, SSRF protection)
- [ ] Agent YAML validates against schema
- [ ] All tools have valid input schemas
- [ ] Error responses follow MCP spec
- [ ] No PII in logs or error messages
- [ ] Health check endpoint implemented
- [ ] Rate limiting configured
- [ ] Latency within acceptable thresholds

---

## References

- **ARCHITECTURE.md** — System design deep dive
- **DEV_PLAN.md** — Development checklist
- **README.md** — Quick start and overview
- **skills/** — Skill definitions for each test category
- **MCP Specification** — https://modelcontextprotocol.io/
- **agent-mesh/AGENTS.md** — Multi-agent orchestration patterns
