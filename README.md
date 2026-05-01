# mcp-contract-kit

[![CI](https://github.com/reaatech/mcp-contract-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/reaatech/mcp-contract-kit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)

> Conformance test suite for MCP servers. Validate registry compliance, protocol conformance, and routing correctness.

This monorepo provides a CLI tool, validators, MCP client SDK, and reporting infrastructure for testing Model Context Protocol (MCP) server implementations against the MCP specification.

## Features

- Protocol conformance — JSON-RPC 2.0 compliance, tool discovery, tool execution, session management
- Registry validation — YAML schema validation, invariant checks, environment variable expansion
- Routing contracts — Request/response format validation, compatibility testing
- Security posture — SSRF protection, authentication checks, input sanitization
- Performance baseline — Latency measurement, concurrency testing, rate limit detection
- Multiple reporters — Console, JSON, Markdown, and HTML output formats
- Programmatic API — integrate into CI/CD pipelines
- MCP client SDK — connect to and test any MCP server

## Installation

### Using the packages

```bash
# CLI tool (includes all validators)
pnpm add @reaatech/mcp-contract-cli

# Individual packages
pnpm add @reaatech/mcp-contract-core
pnpm add @reaatech/mcp-contract-client
pnpm add @reaatech/mcp-contract-validators
pnpm add @reaatech/mcp-contract-reporters
pnpm add @reaatech/mcp-contract-observability
```

### Contributing

```bash
git clone https://github.com/reaatech/mcp-contract-kit.git
cd mcp-contract-kit
pnpm install
pnpm build
pnpm test
pnpm lint
```

## Quick Start

Test an MCP server:

```bash
mcp-contract-kit test http://localhost:8080 --suite all --format console
```

Or use the programmatic API:

```typescript
import { runTests, generateReport } from "@reaatech/mcp-contract-cli";

const report = await runTests({ endpoint: "http://localhost:8080" });
console.log(report.passed ? "PASSED" : "FAILED");
```

## Packages

| Package | Description |
|---------|-------------|
| [`@reaatech/mcp-contract-core`](./packages/core) | Core domain types, JSON-RPC 2.0 schemas, and utilities |
| [`@reaatech/mcp-contract-client`](./packages/client) | MCP client SDK for connecting to MCP servers |
| [`@reaatech/mcp-contract-validators`](./packages/validators) | Conformance validators (protocol, registry, routing, security, performance) |
| [`@reaatech/mcp-contract-reporters`](./packages/reporters) | Report formatters (console, JSON, markdown, HTML) |
| [`@reaatech/mcp-contract-observability`](./packages/observability) | Structured logging, metrics, and tracing |
| [`@reaatech/mcp-contract-cli`](./packages/cli) | CLI tool and public API |

## Documentation

- `ARCHITECTURE.md` — System design and package relationships
- `AGENTS.md` — Coding conventions and development guidelines
- `CONTRIBUTING.md` — Contribution workflow and release process
- `docs/` — Additional documentation

## License

MIT
