# AGENTS.md — mcp-contract-kit

> Agent-focused guidance for maintaining and extending this repo.

## What this is

`mcp-contract-kit` validates MCP-compliant AI agents against the MCP specification and
multi-agent orchestration contracts. It provides a CLI, a programmatic API, and a set
of pluggable validators organized by test category.

## Project Structure

```
packages/
  core/          @reaatech/mcp-contract-core      — Domain types, JSON-RPC 2.0 schemas, utilities
  client/        @reaatech/mcp-contract-client    — MCP client SDK (HTTP transport, request builders)
  validators/    @reaatech/mcp-contract-validators — Conformance validators (protocol, registry, routing, security, performance)
  reporters/     @reaatech/mcp-contract-reporters  — Report formatters (console, JSON, markdown, HTML)
  observability/ @reaatech/mcp-contract-observability — Structured logging, metrics, tracing
  cli/           @reaatech/mcp-contract-cli        — CLI binary and public library API
scripts/         — Release and utility scripts
skills/          — Skill definitions for each test category
e2e/             — End-to-end integration tests
```

## Build System

| Tool | Purpose |
|------|---------|
| pnpm | Package manager and workspace orchestration |
| tsup | Per-package bundler (ESM + CJS dual output) |
| Turborepo | Task orchestration across packages |
| Biome | Formatting and linting (no Prettier/ESLint) |
| Vitest | Unit and integration testing |
| TypeScript | Strict mode, `NodeNext` module resolution |

### Common Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm build` | Build all packages (`turbo run build`) |
| `pnpm test` | Run all tests (`turbo run test`) |
| `pnpm lint` | Lint all files with Biome |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm typecheck` | Type-check the entire workspace |
| `pnpm clean` | Remove all `dist/` and `node_modules/` |

## Coding Conventions

1. **TypeScript strict.** All packages use `tsconfig.json` with `strict: true`.
2. **ESM throughout.** Packages are `"type": "module"` with `.js` extensions in relative imports.
3. **Barrel exports.** Each package has a single `src/index.ts` entry point. Re-export via `@reaatech/mcp-contract-*` names.
4. **Validators follow a common interface.** Every validator implements `{ name, category, severity, validate(context) }` from `@reaatech/mcp-contract-core`.
5. **Remediation required.** Failed validations must include a `remediation` string explaining exactly how to fix the issue.
6. **Formatting is automated.** Run `pnpm lint:fix` before committing. Single quotes, trailing commas, 2-space indent.

## Adding a New Package

1. Scaffold the package directory:
   ```bash
   mkdir -p packages/<name>/src
   ```

2. Copy `package.json` from an existing package and update `name`, `description`, and `dependencies`.

3. Create `packages/<name>/src/index.ts` as the barrel entry point.

4. Create `packages/<name>/tsconfig.json` extending the root:
   ```json
   {
     "extends": "../../tsconfig.json",
     "compilerOptions": {
       "outDir": "./dist",
       "rootDir": "./src"
     },
     "include": ["src"]
   }
   ```

5. Add the workspace dependency to any consuming packages (e.g., add to `cli/package.json`).

6. Run `pnpm install` to link the workspace, then `pnpm build` to verify.

---

## Using contract-kit to Validate Your Agent

### Quick Start

```bash
# Add to your project
pnpm add @reaatech/mcp-contract-cli

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
} from '@reaatech/mcp-contract-cli';

const report = await runTests({
  endpoint: 'http://localhost:8080',
  suites: [TestSuite.PROTOCOL, TestSuite.ROUTING],
  timeout: 30000,
});

if (report.failures.critical > 0) {
  console.error('Critical conformance issues found');
  process.exit(1);
}

const html = await generateReport(report, 'html');
```

### Validating Agent YAML

```typescript
import { validateRegistry } from '@reaatech/mcp-contract-cli';

const result = await validateRegistry({
  yamlPath: './agents/my-agent.yaml',
  strict: true,
});

if (!result.passed) {
  console.error('Registry validation failed:');
  result.results.forEach(r => {
    if (!r.passed) console.error(`  - ${r.message}`);
  });
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

If integrating with an orchestrator, your agent MUST:

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

3. **Handle the `handle_message` tool** — This is the standard entry point.

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

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Start MCP server
        run: pnpm install && pnpm build && node packages/cli/dist/cli.js test http://localhost:8080 &

      - name: Wait for server
        run: sleep 5

      - name: Run conformance tests
        run: |
          pnpm add @reaatech/mcp-contract-cli
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

```sh
#!/bin/sh
npx mcp-contract-kit test http://localhost:8080 --fail-on critical || {
  echo "Conformance issues found. Fix before committing."
  exit 1
}
```

---

## Writing Custom Validators

Extend contract-kit with domain-specific validators:

```typescript
import { Severity, TestCategory } from '@reaatech/mcp-contract-core';
import type { Validator, TestResult, ValidationContext } from '@reaatech/mcp-contract-core';

const myCustomValidator: Validator = {
  name: 'my-custom-check',
  category: TestCategory.PROTOCOL,
  severity: Severity.WARNING,

  async validate(context: ValidationContext): Promise<TestResult> {
    const result = await context.client.sendRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      id: 1,
      params: { name: 'my_tool', arguments: {} },
    });

    if (result.error) {
      return {
        validator: 'my-custom-check',
        category: TestCategory.PROTOCOL,
        passed: false,
        severity: Severity.CRITICAL,
        message: `Tool call failed: ${result.error.message}`,
        remediation: 'Ensure the tool is registered and accepts valid arguments.',
        durationMs: 0,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      validator: 'my-custom-check',
      category: TestCategory.PROTOCOL,
      passed: true,
      severity: Severity.INFO,
      message: 'Custom validation passed.',
      durationMs: 0,
      timestamp: new Date().toISOString(),
    };
  },
};
```

Register custom validators alongside built-in ones when calling `runTests`:

```typescript
import { runTests, TestSuite } from '@reaatech/mcp-contract-cli';
import { getProtocolValidators } from '@reaatech/mcp-contract-validators';

const report = await runTests({
  endpoint: 'http://localhost:8080',
  suites: [TestSuite.PROTOCOL],
});
```

---

## Testing Your Agent Locally

### Using Docker

```dockerfile
FROM node:22-alpine
RUN npm install -g pnpm@10
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile && pnpm build
ENTRYPOINT ["node", "packages/cli/dist/cli.js"]
```

```bash
docker build -t mcp-contract-kit .
docker run mcp-contract-kit test http://host.docker.internal:8080
```

### Using docker-compose

```yaml
services:
  agent:
    build: .
    ports:
      - "8080:8080"

  contract-kit:
    build:
      context: ./mcp-contract-kit
    command: test http://agent:8080 --format html --output /reports/report.html
    volumes:
      - ./reports:/reports
    depends_on:
      - agent
```

```bash
docker compose up --exit-code-from contract-kit
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
- **README.md** — Quick start and overview
- **skills/** — Skill definitions for each test category
- **packages/core/** — Domain types and schemas (`@reaatech/mcp-contract-core`)
- **packages/cli/** — CLI and public API (`@reaatech/mcp-contract-cli`)
- **MCP Specification** — https://modelcontextprotocol.io/
