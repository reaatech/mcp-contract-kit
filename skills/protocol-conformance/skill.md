# Skill: Protocol Conformance

## Description

Validates MCP server compliance with the JSON-RPC 2.0 specification and MCP protocol requirements.

## What It Checks

- **JSON-RPC 2.0**: Proper `jsonrpc: "2.0"` field, matching `id`, result/error exclusivity
- **Tool Discovery**: `tools/list` returns valid array with required fields
- **Tool Execution**: `tools/call` works correctly, handles unknown tools
- **Session Management**: Session ID generation and persistence

## Test Validators

- `jsonrpc-validator` — JSON-RPC 2.0 compliance
- `tool-discovery-validator` — Tool listing validation
- `tool-execution-validator` — Tool call validation
- `session-validator` — Session management validation

## Usage

```bash
# Run protocol suite
mcp-contract-kit test http://localhost:8080 --suite protocol
```

## Failure Remediation

| Issue | Fix |
|-------|-----|
| Missing jsonrpc field | Add `"jsonrpc": "2.0"` to all responses |
| Invalid tool schema | Use proper JSON Schema format for tool inputSchema |
| Unknown tool handling | Return proper error for undefined tool names |
| Session issues | Implement consistent session ID generation |
