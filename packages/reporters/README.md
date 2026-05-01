# @reaatech/mcp-contract-reporters

[![npm version](https://img.shields.io/npm/v/@reaatech/mcp-contract-reporters?color=blue)](https://www.npmjs.com/package/@reaatech/mcp-contract-reporters)
[![npm downloads](https://img.shields.io/npm/dm/@reaatech/mcp-contract-reporters)](https://www.npmjs.com/package/@reaatech/mcp-contract-reporters)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue)](https://www.typescriptlang.org/)

> **Status:** Pre-1.0 — API surface may change before the 1.0 release. Pin your
> dependency to a minor version for stability.

Report formatters for MCP contract validation — console, JSON, Markdown, and
HTML output. Consumes `TestReport` objects produced by `@reaatech/mcp-contract-core`
and renders them in human- or machine-friendly formats.

## Installation

```bash
npm install @reaatech/mcp-contract-reporters
```

The package ships dual CJS/ESM builds with TypeScript declarations included.

## Feature Overview

| Format     | Function                  | Use Case                           |
|------------|---------------------------|-------------------------------------|
| Console    | `printConsoleReport`      | Local CLI / terminal output         |
| JSON       | `formatJsonReport`        | CI/CD pipelines, programmatic use   |
| Markdown   | `formatMarkdownReport`    | GitHub issue comments, README docs  |
| HTML       | `generateHtmlReport`      | Browser dashboard, email reports    |
| Dispatcher | `formatReport`            | Route to any format by string enum  |

All reporters receive a `TestReport` and return a formatted string (HTML and
Markdown reporters also return strings).

## Quick Start

```ts
import { runTests, TestSuite } from '@reaatech/mcp-contract-core';
import {
  formatReport,
  printConsoleReport,
  formatJsonReport,
  formatMarkdownReport,
  generateHtmlReport,
} from '@reaatech/mcp-contract-reporters';

// Produce a report by running conformance tests
const report = await runTests({
  endpoint: 'http://localhost:8080',
  suites: [TestSuite.PROTOCOL, TestSuite.ROUTING],
  timeout: 30000,
});

// Print a colored console report
printConsoleReport(report);

// Get a machine-readable JSON string
const json = formatJsonReport(report);
await fs.writeFile('report.json', json);

// Get GitHub-flavored Markdown
const md = formatMarkdownReport(report);
await fs.writeFile('report.md', md);

// Generate an interactive HTML dashboard
const html = await generateHtmlReport(report);
await fs.writeFile('report.html', html);

// Or use the dispatcher with a format string
const output = await formatReport(report, 'markdown');
```

## Report Formats

### Console

`formatConsoleReport(report)` and `printConsoleReport(report)` render a colored
terminal report using ANSI escape codes.

- Green / red / yellow severity indicators
- Emoji icons per result (`🔴` `🟡` `🟢`)
- Summary block with pass/fail counts
- Remediation hints printed inline for failing tests
- `printConsoleReport` writes directly to `process.stdout`, `formatConsoleReport`
  returns the string

### JSON

`formatJsonReport(report)` produces a pretty-printed JSON string (`JSON.stringify`
with 2-space indent). The output is the raw `TestReport` object — ideal for
downstream tooling, CI parsing, or archival.

### Markdown

`formatMarkdownReport(report)` generates a GitHub-flavored Markdown document:

- Summary table (endpoint, timestamp, duration, status, counts)
- Results table with validator name, pass/fail badge, severity, and message
- Dedicated *Failures* section with per-failure remediation blocks
- Footer with link back to the repository

### HTML

`generateHtmlReport(report)` returns a self-contained HTML document with embedded
CSS and JavaScript:

- Summary cards (total, passed, critical, warnings, info)
- Expandable test rows — click any test to reveal its message and remediation
- Colour-coded severity badges
- Print-friendly styles
- No external dependencies; single `async` function returning `Promise<string>`

## API Reference

### `formatReport(report, format)`

Dispatch formatter by enum string. Returns `Promise<string>` (all formats are
resolved synchronously except `html`, but the API is unified under `async`).

```ts
function formatReport(report: TestReport, format: ReportFormat): Promise<string>
```

### `formatConsoleReport(report)` / `printConsoleReport(report)`

Colored console output. `formatConsoleReport` returns the string; `printConsoleReport`
writes it to stdout and returns `void`.

```ts
function formatConsoleReport(report: TestReport): string
function printConsoleReport(report: TestReport): void
```

### `formatJsonReport(report)`

Pretty-printed JSON — the raw `TestReport` object serialized with 2-space indentation.

```ts
function formatJsonReport(report: TestReport): string
```

### `formatMarkdownReport(report)`

GitHub-flavored Markdown with summary tables, result tables, and detailed failure
breakdowns.

```ts
function formatMarkdownReport(report: TestReport): string
```

### `generateHtmlReport(report)`

Self-contained interactive HTML dashboard. Returns a `Promise<string>` with the
full document.

```ts
function generateHtmlReport(report: TestReport): Promise<string>
```

### `ReportFormat`

String literal union type for use with `formatReport`.

```ts
type ReportFormat = 'console' | 'json' | 'markdown' | 'html'
```

### `TestReport` (imported from `@reaatech/mcp-contract-core`)

The input type shared by all reporters:

```ts
interface TestReport {
  id: string
  endpoint: string
  startedAt: string
  completedAt: string
  durationMs: number
  timestamp: string
  results: TestResult[]
  summary: { total: number; passed: number; failed: number; warnings: number; critical: number }
  failures: { critical: number; warning: number; info: number }
  passed: boolean
  error?: string
  version: string
}

interface TestResult {
  validator: string
  category: TestCategory
  passed: boolean
  severity: Severity
  message: string
  remediation?: string
  details?: Record<string, unknown>
  durationMs: number
  timestamp: string
}
```

## Related Packages

| Package                                                        | Description                      |
|----------------------------------------------------------------|----------------------------------|
| [`@reaatech/mcp-contract-core`](../core)                       | Domain types, enums, interfaces |
| [`@reaatech/mcp-contract-validators`](../validators)           | Test validator implementations  |
| [`@reaatech/mcp-contract-skills`](../skills)                   | Skill definitions & contracts   |
| [`@reaatech/mcp-contract-cli`](../cli)                         | CLI entry point                 |

## License

MIT © [Rick Somers](https://reaatech.com)
