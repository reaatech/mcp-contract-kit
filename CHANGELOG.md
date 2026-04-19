# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-17

### Added

- **Registry Compliance Validators**
  - Schema validation for agent YAML files
  - Invariant enforcement (unique IDs, default agent rules, SSRF protection)
  - Environment variable expansion validation

- **Protocol Conformance Validators**
  - JSON-RPC 2.0 compliance validation
  - Tool discovery validation (`tools/list`)
  - Tool execution validation (`tools/call`)
  - Session management validation

- **Routing Contract Validators**
  - Request format validation
  - Response format validation
  - End-to-end compatibility testing

- **Security Validators**
  - SSRF protection checks
  - Authentication validation
  - Input sanitization checks

- **Performance Validators**
  - Latency measurement (p50, p90, p99)
  - Concurrency handling validation
  - Rate limiting detection

- **CLI Tool**
  - `test <endpoint>` - Run conformance tests
  - `validate-yaml <path>` - Validate agent YAML files
  - Multiple output formats (console, json, markdown, html)
  - Configurable thresholds and verbosity

- **Library API**
  - `runTests()` - Main test runner
  - `validateRegistry()` - Registry validation
  - `validateProtocol()` - Protocol validation
  - `validateRouting()` - Routing validation
  - `generateReport()` - Report generation

- **Observability**
  - Structured JSON logging (pino)
  - OpenTelemetry tracing
  - Metrics collection

- **CI/CD Integration**
  - GitHub Actions workflows (CI, Release, Conformance)
  - Docker multi-stage build
  - Docker Compose for local development

- **Documentation**
  - README with quick start guide
  - AGENTS.md for agent development
  - ARCHITECTURE.md for system design
  - DEV_PLAN.md for development checklist
  - docs/VALIDATORS.md for validator reference
  - docs/CI_CD.md for CI/CD integration guide

### Features

- **Test Suites**: registry, protocol, routing, security, performance, all
- **Exit Codes**: 0 (pass), 1 (critical), 2 (warning), 3 (execution error)
- **Coverage Gate**: 80% minimum threshold
- **Reporter Formats**: Console (colored), JSON, Markdown, HTML

### Dependencies

- `@modelcontextprotocol/sdk` - MCP protocol
- `zod` - Schema validation
- `yaml` - YAML parsing
- `ajv` - JSON Schema validation
- `pino` / `winston` - Logging
- `@opentelemetry/*` - Observability
- `commander` - CLI framework
- `vitest` - Testing framework

### Configuration

- TypeScript strict mode
- ESLint with typescript-eslint
- Prettier with single quotes and trailing commas
- Husky pre-commit hooks
- lint-staged for staged file linting