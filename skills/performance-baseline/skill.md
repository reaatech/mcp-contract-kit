# Skill: Performance Baseline

## Description

Validates performance characteristics of MCP servers including latency, concurrency, and rate limiting.

## Package: @reaatech/mcp-contract-validators

## What It Checks

- **Latency**: Measures p50, p90, p99 response times
- **Concurrency**: Tests handling of simultaneous requests
- **Rate Limiting**: Validates rate limit behavior and 429 responses

## Test Validators

- `latency-validator` — Response time measurement
- `concurrency-validator` — Concurrent request handling
- `rate-limit-validator` — Rate limiting behavior

## Usage

```bash
# Run performance suite
mcp-contract-kit test http://localhost:8080 --suite performance
```

## Default Thresholds

| Metric | Threshold |
|--------|-----------|
| p50 latency | 1000ms |
| p90 latency | 3000ms |
| p99 latency | 5000ms |

## Failure Remediation

| Issue | Fix |
|-------|-----|
| High latency | Optimize tool execution, add caching, increase resources |
| Concurrency failures | Fix race conditions, improve resource management |
| No rate limiting | Implement rate limiting middleware with 429 responses |

## Related Packages

- `@reaatech/mcp-contract-core` — Shared types and utilities
- `@reaatech/mcp-contract-client` — MCP client for agent connectivity
- `@reaatech/mcp-contract-cli` — CLI tool (`mcp-contract-kit`)
