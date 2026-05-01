# Skill: Security Validation

## Description

Validates security posture of MCP servers including SSRF protection, authentication, and input sanitization.

## Package: @reaatech/mcp-contract-validators

## What It Checks

- **SSRF Protection**: Endpoint URL validation, private IP rejection
- **Authentication**: API key requirements, invalid key rejection
- **Input Sanitization**: Prompt injection patterns, XSS prevention

## Test Validators

- `ssrf-validator` — SSRF protection validation
- `auth-validator` — Authentication validation
- `input-sanitization-validator` — Input sanitization validation

## Usage

```bash
# Run security suite
mcp-contract-kit test http://localhost:8080 --suite security
```

## Failure Remediation

| Issue | Fix |
|-------|-----|
| SSRF vulnerability | Reject localhost and private IP endpoints |
| No authentication | Implement API key or bearer token validation |
| Prompt injection | Sanitize inputs and validate against known attack patterns |
| XSS in responses | Escape user-provided content in responses |

## Related Packages

- `@reaatech/mcp-contract-core` — Shared types and utilities
- `@reaatech/mcp-contract-client` — MCP client for agent connectivity
- `@reaatech/mcp-contract-cli` — CLI tool (`mcp-contract-kit`)
