# mcp-contract-kit

[![npm version](https://img.shields.io/npm/v/mcp-contract-kit)](https://www.npmjs.com/package/mcp-contract-kit)
[![Build Status](https://github.com/reaatech/mcp-contract-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/reaatech/mcp-contract-kit/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/reaatech/mcp-contract-kit/branch/main/graph/badge.svg)](https://codecov.io/gh/reaatech/mcp-contract-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Conformance test suite for MCP servers.** A library and CLI tool that any MCP
server author can point at their endpoint to verify registry compliance, protocol
conformance, and routing correctness.

## Features

- **5 Test Suites**: Registry, protocol, routing, security, and performance validation
- **4 Output Formats**: Console (colored), JSON, HTML (interactive dashboard), Markdown
- **Library API**: Use as a Node.js module in your CI/CD pipeline or test suite
- **Extensible**: Add custom validators for domain-specific checks
- **SSRF Protection**: Validates endpoints against localhost/private IP injection
- **Observability**: Structured logging, OpenTelemetry tracing, metrics collection

## Supported MCP Servers

This tool validates any MCP server implementing the [Model Context Protocol](https://modelcontextprotocol.io/)
specification. Tested against:

- [mcp-server-starter-ts](https://github.com/reaatech/mcp-server-starter-ts)
- Custom MCP servers implementing JSON-RPC 2.0 with `tools/list` and `tools/call`

## Quick Start

```bash
# Install
npm install -g mcp-contract-kit

# Run all tests against your MCP server
mcp-contract-kit test http://localhost:8080

# Run specific test suite
mcp-contract-kit test http://localhost:8080 --suite protocol

# Generate HTML report
mcp-contract-kit test http://localhost:8080 --format html --output report.html

# Validate agent registry YAML
mcp-contract-kit validate-yaml agents.yaml --strict
```

## Test Suites

| Suite | What It Checks | When to Use |
|-------|----------------|-------------|
| `registry` | Agent YAML configuration compliance | Before deploying to orchestrator |
| `protocol` | MCP JSON-RPC 2.0 spec compliance | Always — core MCP validation |
| `routing` | Request/response contract compatibility | When integrating with orchestrator |
| `security` | SSRF, auth, input sanitization | Before production deployment |
| `performance` | Latency, concurrency, rate limiting | Before scaling to production |
| `all` | All suites combined | Full conformance validation |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All tests passed (only info-level findings) |
| `1` | Critical failures found |
| `2` | Warning failures found (with `--fail-on warning`) |
| `3` | Test execution error |

## CLI Examples

```bash
# Run all suites with verbose output
mcp-contract-kit test http://localhost:8080 --verbose

# Run multiple specific suites
mcp-contract-kit test http://localhost:8080 --suite protocol --suite security

# Generate JSON report for CI/CD
mcp-contract-kit test http://localhost:8080 --format json --output conformance-report.json

# Fail on warnings (not just critical)
mcp-contract-kit test http://localhost:8080 --fail-on warning

# Increase timeout for slow servers
mcp-contract-kit test http://localhost:8080 --timeout 60000

# Validate YAML with strict mode (fail on warnings)
mcp-contract-kit validate-yaml agents.yaml --strict

# Show help
mcp-contract-kit --help
```

## Library API

```typescript
import {
  runTests,
  validateRegistry,
  generateReport,
  TestSuite,
  Severity,
} from 'mcp-contract-kit';

// Run all tests
const report = await runTests({
  endpoint: 'http://localhost:8080',
  suites: [TestSuite.PROTOCOL, TestSuite.ROUTING],
  timeout: 30000,
  failOn: Severity.CRITICAL,
});

// Check results
if (report.failures.critical > 0) {
  console.error('Critical conformance issues found');
  console.error(report.results.map(r => r.message).join('\n'));
  process.exit(1);
}

// Generate HTML report
const html = await generateReport(report, 'html');
fs.writeFileSync('conformance-report.html', html);

// Validate agent YAML
const yamlReport = await validateRegistry({
  yamlPath: './agents/my-agent.yaml',
  strict: true,
});

if (!yamlReport.passed) {
  console.error('YAML validation failed');
  process.exit(1);
}
```

### Using the MCP Client

```typescript
import { createMCPClient } from 'mcp-contract-kit';

const client = createMCPClient({
  endpoint: 'http://localhost:8080',
  timeout: 30000,
  retries: 3,
});

await client.connect();
const tools = await client.listTools();
const result = await client.callTool('handle_message', { ... });
await client.disconnect();
```

## CI/CD Integration

### GitHub Actions

```yaml
name: MCP Conformance

on: [push, pull_request]

jobs:
  conformance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install contract-kit
        run: npm ci && npm link

      - name: Start MCP server
        run: npm start &
        background: true

      - name: Wait for server
        run: sleep 5

      - name: Run conformance tests
        run: |
          mcp-contract-kit test http://localhost:8080 \
            --format json \
            --output conformance-report.json

      - name: Upload report
        uses: actions/upload-artifact@v4
        if: always()
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

## Documentation

- **[AGENTS.md](./AGENTS.md)** — Agent development guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — System design deep dive
- **[DEV_PLAN.md](./DEV_PLAN.md)** — Development checklist
- **[docs/VALIDATORS.md](./docs/VALIDATORS.md)** — Validator reference
- **[docs/CI_CD.md](./docs/CI_CD.md)** — CI/CD integration guide

## License

MIT