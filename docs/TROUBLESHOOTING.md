# Troubleshooting Guide

This guide covers common issues encountered when using mcp-contract-kit and how to resolve them.

## Table of Contents

- [Connection Issues](#connection-issues)
- [Timeout Errors](#timeout-errors)
- [YAML Validation Errors](#yaml-validation-errors)
- [Protocol Errors](#protocol-errors)
- [Test Failures](#test-failures)
- [Performance Issues](#performance-issues)

---

## Connection Issues

### "Connection refused" Error

**Symptom:**
```
Error: connect ECONNREFUSED 127.0.0.1:8080
```

**Causes:**
- MCP server is not running
- Server is listening on a different port
- Firewall blocking the connection

**Solutions:**

1. **Verify server is running:**
   ```bash
   # Check if anything is listening on the port
   lsof -i :8080

   # Or for Windows
   netstat -ano | findstr :8080
   ```

2. **Start your MCP server:**
   ```bash
   # Example for mcp-server-starter-ts
   npx mcp-server-starter-ts --port 8080
   ```

3. **Use the correct endpoint:**
   ```bash
   # Verify the URL matches your server
   mcp-contract-kit test http://localhost:8080

   # For Docker containers
   mcp-contract-kit test http://host.docker.internal:8080
   ```

---

### "Connection timed out" Error

**Symptom:**
```
Error: Request timeout after 30000ms
```

**Causes:**
- Server is slow to respond
- Network latency
- Server is overloaded

**Solutions:**

1. **Increase timeout:**
   ```bash
   mcp-contract-kit test http://localhost:8080 --timeout 60000
   ```

2. **Via library API:**
   ```typescript
   const report = await runTests({
     endpoint: 'http://localhost:8080',
     timeout: 60000, // 60 seconds
   });
   ```

3. **Check server performance** - your server may need optimization

---

### "Unable to connect to MCP server" Error

**Symptom:**
```
Error: Failed to connect to MCP server at http://localhost:8080
```

**Causes:**
- Server doesn't implement MCP protocol
- Wrong protocol endpoint
- Server requires authentication

**Solutions:**

1. **Verify MCP implementation:**
   ```bash
   # Test if server responds to JSON-RPC
   curl -X POST http://localhost:8080 \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
   ```

2. **Check if authentication is required:**
   ```bash
   # If auth is needed
   mcp-contract-kit test http://localhost:8080 \
     --header "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Verify server implements MCP correctly** - use protocol suite:
   ```bash
   mcp-contract-kit test http://localhost:8080 --suite protocol
   ```

---

## Timeout Errors

### "Request timeout after 30000ms"

**Default timeout is 30 seconds. For slow servers, increase this.**

**Solutions:**

1. **CLI flag:**
   ```bash
   mcp-contract-kit test http://localhost:8080 --timeout 60000
   ```

2. **Environment variable:**
   ```bash
   export MCP_TIMEOUT_MS=60000
   mcp-contract-kit test http://localhost:8080
   ```

---

### "Test execution error" (Exit code 3)

**Symptom:**
Exit code 3 indicates a test execution error, typically network-related.

**Causes:**
- Network connectivity issues
- Server crashed during tests
- Invalid server responses

**Solutions:**

1. **Check server logs** for crashes or errors

2. **Verify server stability:**
   ```bash
   # Run a single quick test
   curl -X POST http://localhost:8080 \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
   ```

3. **Reduce test load** by running specific suites:
   ```bash
   mcp-contract-kit test http://localhost:8080 --suite protocol
   ```

---

## YAML Validation Errors

### "Missing required field: agent_id"

**Cause:** Your agent YAML is missing the required `agent_id` field.

**Solution:**
```yaml
agents:
  - agent_id: my-unique-agent-id  # Add this
    display_name: My Agent
    description: My MCP agent
    endpoint: https://my-agent.example.com
    type: mcp
    is_default: false
    confidence_threshold: 0.8
    clarification_required: false
    examples:
      - "What is the IT policy?"
```

---

### "Multiple agents are marked as default"

**Cause:** More than one agent has `is_default: true`.

**Solution:** Set exactly one agent as default:
```yaml
agents:
  - agent_id: agent-1
    is_default: true  # Only one agent should have this
    ...
  - agent_id: agent-2
    is_default: false
    ...
```

---

### "Invalid endpoint URL" / "SSRF vulnerability"

**Cause:** Endpoint URL is localhost, private IP, or invalid URL.

**Solutions:**

1. **Use public HTTPS endpoint:**
   ```yaml
   endpoint: https://my-agent.example.com/mcp  # Not http://localhost:8080
   ```

2. **For local development**, this is a WARNING, not critical:
   ```bash
   mcp-contract-kit validate-yaml agents.yaml  # Warnings won't fail
   ```

3. **Production requirement**: Always use public HTTPS endpoints

---

### "Duplicate agent IDs found"

**Cause:** Two or more agents share the same `agent_id`.

**Solution:** Use unique IDs:
```yaml
agents:
  - agent_id: my-agent-1
    ...
  - agent_id: my-agent-2  # Must be unique
    ...
```

---

### "Circular environment variable reference"

**Cause:** `${VAR_A}` references `${VAR_B}` which references `${VAR_A}`.

**Solution:** Break the circular reference:
```yaml
# Bad
VAR_A: ${VAR_B}
VAR_B: ${VAR_A}

# Good
DATABASE_URL: postgresql://...
AGENT_ENDPOINT: ${DATABASE_URL}/agent
```

---

## Protocol Errors

### "Missing jsonrpc field"

**Cause:** Server responses don't include `jsonrpc: "2.0"`.

**Solution:** Update your MCP server to include the jsonrpc version in all responses:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": { ... }
}
```

---

### "tools/list did not return an array"

**Cause:** Server's `tools/list` response doesn't return an array.

**Solution:** Ensure your `tools/list` returns proper format:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "my_tool",
        "description": "My tool",
        "inputSchema": { "type": "object" }
      }
    ]
  }
}
```

---

### "Tool name should start with lowercase letter"

**Cause:** Tool name doesn't follow naming convention.

**Solution:** Use lowercase letters for tool names:
```json
// Bad
{ "name": "MyTool" }

// Good
{ "name": "my_tool" }
```

---

### "Unknown tool should return isError: true"

**Cause:** Calling an unknown tool doesn't return an error response.

**Solution:** When tool not found, return error:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32601,
    "message": "Tool not found"
  }
}
```

---

## Test Failures

### "Expected error response for unknown method"

**Cause:** Server doesn't return proper JSON-RPC errors for unknown methods.

**Solution:** Implement error handling for unrecognized methods:
```typescript
// In your MCP server
if (!supportedMethods.includes(method)) {
  return {
    jsonrpc: "2.0",
    id: request.id,
    error: {
      code: -32601,  // Method not found
      message: `Unknown method: ${method}`
    }
  };
}
```

---

### "Response contains both 'result' and 'error'"

**Cause:** Server returned both result and error in same response.

**Solution:** JSON-RPC requires exactly one of result OR error:
```json
// Correct - either result
{ "jsonrpc": "2.0", "id": 1, "result": {...} }

// Correct - or error
{ "jsonrpc": "2.0", "id": 1, "error": {...} }

// Wrong - both present
{ "jsonrpc": "2.0", "id": 1, "result": {...}, "error": {...} }
```

---

### "Response 'id' does not match request 'id'"

**Cause:** Server returned wrong ID in response.

**Solution:** Echo back the same ID from the request:
```typescript
// Request: { "jsonrpc": "2.0", "method": "tools/list", "id": 42 }
// Response must include "id": 42
```

---

## Performance Issues

### "p50 latency exceeds threshold"

**Cause:** Server response time is too slow.

**Default thresholds:**
| Metric | Threshold |
|--------|-----------|
| p50 | 1000ms |
| p90 | 3000ms |
| p99 | 5000ms |

**Solutions:**

1. **Optimize your MCP server**:
   - Add caching
   - Optimize database queries
   - Reduce unnecessary processing

2. **Profile slow endpoints**:
   ```bash
   mcp-contract-kit test http://localhost:8080 --verbose
   ```

3. **Consider pre-computing responses** for common queries

---

### "All concurrent requests failed"

**Cause:** Server can't handle concurrent requests.

**Solutions:**

1. **Implement connection pooling**

2. **Add request queuing**

3. **Scale horizontally** (multiple instances)

4. **Debug with verbose output**:
   ```bash
   mcp-contract-kit test http://localhost:8080 --suite performance --verbose
   ```

---

### "No 429 response when rate limit exceeded"

**Cause:** Server doesn't implement rate limiting.

**Solution:** Implement 429 responses when limit exceeded:
```typescript
// In your server
if (requestCount > RATE_LIMIT) {
  return {
    jsonrpc: "2.0",
    id: request.id,
    error: {
      code: -32000,
      message: "Rate limit exceeded"
    }
  };
}
```

---

## Getting Help

### Debug Mode

Enable verbose logging:
```bash
mcp-contract-kit test http://localhost:8080 --verbose
```

### Check Version

```bash
mcp-contract-kit --version
```

### Verify Installation

```bash
# Should show version
mcp-contract-kit --version

# Or use npx
npx mcp-contract-kit --version
```

### Report Issues

When reporting issues, include:
- Output of `mcp-contract-kit --version`
- Full error message
- Your MCP server implementation
- Steps to reproduce

---

## Exit Codes Quick Reference

| Code | Meaning | Action |
|------|---------|--------|
| `0` | All passed | Ready to deploy |
| `1` | Critical failures | Fix critical issues |
| `2` | Warnings with `--fail-on warning` | Review warnings |
| `3` | Execution error | Check connectivity, server logs |