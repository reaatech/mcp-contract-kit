# Skill: Routing Correctness

## Description

Validates request/response contract compatibility between orchestrators and MCP agents.

## Package: @reaatech/mcp-contract-validators

## What It Checks

- **Request Contract**: Validates orchestrator → agent request format
- **Response Contract**: Validates agent → orchestrator response format
- **Compatibility**: End-to-end contract testing with various inputs

## Test Validators

- `request-contract-validator` — Request format validation
- `response-contract-validator` — Response format validation
- `compatibility-validator` — End-to-end compatibility testing

## Usage

```bash
# Run routing suite
mcp-contract-kit test http://localhost:8080 --suite routing
```

## Standard Request Format

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

## Standard Response Format

```json
{
  "content": "string (non-empty)",
  "workflow_complete": "boolean",
  "workflow_state": "object (optional)"
}
```

## Related Packages

- `@reaatech/mcp-contract-core` — Shared types and utilities
- `@reaatech/mcp-contract-client` — MCP client for agent connectivity
- `@reaatech/mcp-contract-cli` — CLI tool (`mcp-contract-kit`)
