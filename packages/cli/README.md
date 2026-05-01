# @reaatech/mcp-contract-cli

[![npm version](https://img.shields.io/npm/v/@reaatech/mcp-contract-cli)](https://www.npmjs.com/package/@reaatech/mcp-contract-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/reaatech/mcp-contract-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/reaatech/mcp-contract-kit/actions/workflows/ci.yml)

> **Status:** Pre-1.0

CLI tool and public API for MCP contract conformance testing. Test MCP servers against protocol, registry, routing, security, and performance validators.

## Installation

```bash
npm install -g @reaatech/mcp-contract-cli
# or
pnpm add @reaatech/mcp-contract-cli
```

## Feature Overview

- Five test suites: protocol, registry, routing, security, performance
- Multiple output formats: console, JSON, Markdown, HTML
- Programmatic API for CI/CD integration
- Registry YAML validation with invariant checks
- Customizable severity thresholds and retry policies

## Quick Start

### CLI

```bash
mcp-contract-kit test http://localhost:8080
mcp-contract-kit test http://localhost:8080 --suite protocol --format json --output report.json
mcp-contract-kit validate-yaml ./agents/my-agent.yaml --strict
```

### Programmatic API

```typescript
import { runTests, validateRegistry, generateReport } from "@reaatech/mcp-contract-cli";

const report = await runTests({ endpoint: "http://localhost:8080" });
const html = await generateReport(report, "html");
```

## API Reference

### Runner Functions

- `runTests(options: RunOptions): Promise<TestReport>`
- `validateRegistry(options): Promise<TestReport>`
- `validateProtocol(options: RunOptions): Promise<TestReport>`
- `validateRouting(options: RunOptions): Promise<TestReport>`
- `generateReport(report, format): Promise<string>`

### CLI

- `main(argv?)` — CLI entry point
- `parseArgs(args)` — argument parser
- `printHelp()` — help text

### Re-exports

The CLI package re-exports from all sibling packages for convenience.

## Related Packages

- [`@reaatech/mcp-contract-core`](https://www.npmjs.com/package/@reaatech/mcp-contract-core) — Core domain types, JSON-RPC 2.0 schemas, and utilities
- [`@reaatech/mcp-contract-client`](https://www.npmjs.com/package/@reaatech/mcp-contract-client) — MCP client SDK for connecting to MCP servers
- [`@reaatech/mcp-contract-validators`](https://www.npmjs.com/package/@reaatech/mcp-contract-validators) — Conformance validators
- [`@reaatech/mcp-contract-reporters`](https://www.npmjs.com/package/@reaatech/mcp-contract-reporters) — Report formatters
- [`@reaatech/mcp-contract-observability`](https://www.npmjs.com/package/@reaatech/mcp-contract-observability) — Structured logging, metrics, and tracing

## License

MIT
