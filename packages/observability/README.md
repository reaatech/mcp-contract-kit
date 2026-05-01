# @reaatech/mcp-contract-observability

[![npm version](https://img.shields.io/npm/v/@reaatech/mcp-contract-observability)](https://www.npmjs.com/package/@reaatech/mcp-contract-observability)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Status:** Pre-1.0 — API surface is stable but may receive minor changes before the 1.0 release.

Structured logging (pino), in-memory metrics, and W3C trace context propagation for MCP contract validation.

## Installation

```bash
npm install @reaatech/mcp-contract-observability
```

## Feature Overview

| Feature | Capability |
|---------|------------|
| **Structured logging** | pino-based JSON logger with level filtering, ISO timestamps, and automatic PII redaction |
| **Child loggers** | Per-request loggers that inherit level and add `request_id` binding |
| **In-memory metrics** | Counters and duration histograms with label support, plus a `getSummary()` snapshot |
| **Trace context** | Lightweight span creation with W3C traceparent header serialization/parsing |
| **Span helpers** | `withSpan()` wraps async functions in a span with automatic ok/error status |

## Quick Start

```ts
import {
  logger,
  createLogger,
  metrics,
  MetricNames,
  startSpan,
  endSpan,
  withSpan,
  toTraceParent,
  fromTraceParent,
  getCurrentContext,
  getSpans,
  clearSpans,
} from '@reaatech/mcp-contract-observability';
import type { Span, SpanContext } from '@reaatech/mcp-contract-observability';

// --- Logging ---
logger.info('Test started', { endpoint: 'http://localhost:8080' });
logger.warn('High latency detected', { durationMs: 850 });
logger.error('Connection failed', { error: 'ECONNREFUSED' });

const child = logger.child({ request_id: 'abc-123' });
child.info('Processing request');

// --- Metrics ---
metrics.inc(MetricNames.TESTS_TOTAL);
metrics.inc(MetricNames.TESTS_PASSED);
metrics.recordDuration(MetricNames.VALIDATOR_DURATION, 42);

const summary = metrics.getSummary();
console.log(summary.counters, summary.histograms);

// --- Tracing ---
const span = startSpan('protocol-validation');
endSpan(span, 'ok');

const traceparent = toTraceParent(span.context);

await withSpan('tool-call', async () => {
  // child span context propagated automatically
});
```

## API Reference

### Logging

#### `logger`

Default singleton logger instance created with `createLogger()`. Uses `LOG_LEVEL` env var (defaults to `"info"`).

```ts
import { logger } from '@reaatech/mcp-contract-observability';

logger.info(msg, data?);
logger.warn(msg, data?);
logger.error(msg, data?);
logger.debug(msg, data?);
logger.child(bindings);
```

Sensitive keys (`password`, `token`, `secret`, `key`, `authorization`, `api_key`, `employee_id`, `session_id`) are automatically redacted to `[REDACTED]` in all log output.

#### `createLogger(options?)`

Creates a new pino-backed logger instance. Accepts optional configuration:

```ts
import { createLogger } from '@reaatech/mcp-contract-observability';

const myLogger = createLogger({
  level: 'debug',       // default: LOG_LEVEL env var or 'info'
  requestId: 'req-456', // optional; injected as request_id on every log line
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `level` | `string` | `LOG_LEVEL` env or `"info"` | pino log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`) |
| `requestId` | `string` | — | If set, adds `request_id` binding to every log message |

Returns an object with `info`, `warn`, `error`, `debug`, and `child` methods. Each log method signature is `(msg: string, data?: Record<string, unknown>) => void`. The `child` method returns a new logger that inherits the parent's level.

### Metrics

#### `metrics`

Singleton `MetricsCollector` instance. All counters and histograms are stored in memory and live for the process lifetime.

```ts
import { metrics, MetricNames } from '@reaatech/mcp-contract-observability';
```

#### `MetricNames`

Constants for built-in metric names:

| Constant | Value |
|----------|-------|
| `MetricNames.TESTS_TOTAL` | `"contract_kit_tests_total"` |
| `MetricNames.TESTS_PASSED` | `"contract_kit_tests_passed"` |
| `MetricNames.TESTS_FAILED` | `"contract_kit_tests_failed"` |
| `MetricNames.TESTS_WARNING` | `"contract_kit_tests_warning"` |
| `MetricNames.VALIDATOR_DURATION` | `"contract_kit_validator_duration_ms"` |
| `MetricNames.RUN_DURATION` | `"contract_kit_run_duration_ms"` |
| `MetricNames.ERRORS_TOTAL` | `"contract_kit_errors_total"` |

#### `metrics.inc(name, value?, labels?)`

Increments a counter by the given value (default `1`).

```ts
metrics.inc(MetricNames.TESTS_TOTAL);
metrics.inc(MetricNames.TESTS_PASSED, 1, { suite: 'protocol' });
metrics.inc('custom_counter', 5);
```

#### `metrics.getCounter(name, labels?)`

Returns the current value of a counter.

```ts
const passed = metrics.getCounter(MetricNames.TESTS_PASSED);
```

#### `metrics.recordDuration(name, durationMs, labels?)`

Records a duration value (in milliseconds) into a histogram for the named metric.

```ts
metrics.recordDuration(MetricNames.VALIDATOR_DURATION, 42);
metrics.recordDuration(MetricNames.RUN_DURATION, 1250, { format: 'json' });
```

#### `metrics.getHistogram(name, labels?)`

Returns histogram data with bucket counts, sum, and total count.

```ts
const hist = metrics.getHistogram(MetricNames.VALIDATOR_DURATION);
// { buckets: [{ upperBound: 10, count: 1 }, ...], sum: 42, count: 1 }
```

Built-in bucket boundaries (ms): `[10, 50, 100, 250, 500, 1000, 2500, 5000, 10000]`.

#### `metrics.getSummary()`

Returns a snapshot of all counters, histograms, and process uptime.

```ts
const summary = metrics.getSummary();
// {
//   uptime: 120,            // seconds
//   counters: { ... },
//   histograms: {
//     'contract_kit_validator_duration_ms': {
//       count: 1, sum: 42, min: 42, max: 42, mean: 42
//     }
//   }
// }
```

#### `metrics.reset()`

Clears all counters and histograms and resets the uptime clock.

```ts
metrics.reset();
```

### Tracing

#### `startSpan(name, attributes?)`

Creates a new span, inheriting trace context from the currently active span (if any). Returns the span object and sets it as the active context.

```ts
const span = startSpan('protocol-validation');
const childSpan = startSpan('jsonrpc-check', { version: '2.0' });
```

#### `endSpan(span, status?, errorMessage?)`

Marks a span as complete with a status (`"ok"` | `"error"`, default `"ok"`) and optional error message.

```ts
endSpan(span, 'ok');

try {
  // ...
} catch (err) {
  endSpan(span, 'error', (err as Error).message);
  throw err;
}
```

#### `withSpan(name, fn, attributes?)`

Executes an async function within a span. Returns the function's result. If the function throws, the span is automatically ended with `"error"` status and the error message is recorded before rethrowing.

```ts
const result = await withSpan('tool-call', async () => {
  return await fetch('http://localhost:8080');
});
```

#### `getCurrentContext()`

Returns the currently active `SpanContext` or `null` if no span is active.

```ts
const ctx = getCurrentContext();
if (ctx) {
  console.log(ctx.traceId, ctx.spanId);
}
```

#### `setCurrentContext(context)`

Sets the active span context. Useful for manually propagating trace context across async boundaries or incoming requests.

```ts
setCurrentContext({ traceId: 'abc...', spanId: 'def...' });
setCurrentContext(null); // clear context
```

#### `toTraceParent(context)`

Serializes a `SpanContext` into a W3C traceparent header value (`00-{traceId}-{spanId}-01`).

```ts
const header = toTraceParent(span.context);
// "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
```

#### `fromTraceParent(header)`

Parses a W3C traceparent header string into a `SpanContext`. Returns `null` if the header is invalid.

```ts
const ctx = fromTraceParent('00-abc-def-01');
// { traceId: 'abc', spanId: 'def' }

const invalid = fromTraceParent('not-valid');
// null
```

#### `getSpans()`

Returns all recorded spans (for export or debugging).

```ts
const allSpans = getSpans();
```

#### `clearSpans()`

Clears all recorded spans and resets the active context. Useful between test runs.

```ts
clearSpans();
```

## Usage Patterns

### Structured Context Logging

```ts
logger.info('Validator started', {
  suite: 'protocol',
  validator: 'jsonrpc-version',
  endpoint: 'http://localhost:8080',
});
```

### Error Logging

```ts
try {
  await validate();
} catch (err) {
  logger.error('Validation failed', {
    error: (err as Error).message,
    suite: 'protocol',
  });
}
```

### Per-Request Child Loggers

```ts
function handleRequest(requestId: string) {
  const log = logger.child({ request_id: requestId });
  log.info('Request received');
  // ... all subsequent logs carry request_id ...
}
```

### Metrics with Labels

```ts
metrics.inc(MetricNames.TESTS_FAILED, 1, { suite: 'protocol' });
metrics.inc(MetricNames.TESTS_FAILED, 1, { suite: 'security' });
metrics.recordDuration(MetricNames.VALIDATOR_DURATION, 35, { validator: 'jsonrpc' });
```

### Trace Context Propagation

```ts
const span = startSpan('test-run');

// Propagate via traceparent header
const header = toTraceParent(span.context);
await fetch('http://downstream:8080', {
  headers: { traceparent: header },
});

// After receiving an upstream traceparent
const upstreamCtx = fromTraceParent(req.headers.traceparent);
setCurrentContext(upstreamCtx);
const span = startSpan('handle-request');

endSpan(span, 'ok');
```

### Nested Spans with withSpan

```ts
await withSpan('test-run', async () => {
  await withSpan('protocol-suite', async () => {
    await withSpan('jsonrpc-check', async () => {
      // validation logic
    });
  });
});
```

## Related Packages

- [@reaatech/mcp-contract-core](https://www.npmjs.com/package/@reaatech/mcp-contract-core) — Core types and schemas
- [@reaatech/mcp-contract-client](https://www.npmjs.com/package/@reaatech/mcp-contract-client) — MCP client SDK
- [@reaatech/mcp-contract-validators](https://www.npmjs.com/package/@reaatech/mcp-contract-validators) — Conformance validators
- [@reaatech/mcp-contract-reporters](https://www.npmjs.com/package/@reaatech/mcp-contract-reporters) — Report formatters
- [@reaatech/mcp-contract-cli](https://www.npmjs.com/package/@reaatech/mcp-contract-cli) — CLI tool and public API

## License

MIT
