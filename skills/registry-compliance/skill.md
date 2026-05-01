# Skill: Registry Compliance

## Description

Validates agent registry YAML files against the expected schema and invariants.

## Package: @reaatech/mcp-contract-validators

## What It Checks

- **Schema Validation**: All required fields present, correct types
- **Invariant Enforcement**: Exactly one default agent, unique IDs, valid endpoints
- **Environment Variables**: Proper `${ENV_VAR}` syntax, no circular references

## Test Validators

- `schema-validator` — YAML schema validation against AgentConfigSchema
- `invariant-validator` — Invariant enforcement (one default, unique IDs, SSRF protection)
- `env-expansion-validator` — Environment variable syntax validation

## Usage

```bash
# Validate a single YAML file
mcp-contract-kit validate-yaml agents.yaml --strict

# Run only registry suite against endpoint
mcp-contract-kit test http://localhost:8080 --suite registry
```

## Failure Remediation

| Issue | Fix |
|-------|-----|
| Missing required fields | Add all required fields: agent_id, display_name, description, endpoint, type, is_default, confidence_threshold, clarification_required, examples |
| Multiple default agents | Set exactly one agent as `is_default: true` |
| Invalid endpoint URL | Use a valid HTTPS URL (not localhost for production) |
| Duplicate agent IDs | Ensure all agent_id values are unique |

## Related Packages

- `@reaatech/mcp-contract-core` — Shared types and utilities
- `@reaatech/mcp-contract-client` — MCP client for agent connectivity
- `@reaatech/mcp-contract-cli` — CLI tool (`mcp-contract-kit`)
