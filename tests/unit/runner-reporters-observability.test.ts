import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearSpans,
  createLogger,
  endSpan,
  fromTraceParent,
  getSpans,
  metrics,
  startSpan,
  toTraceParent,
  withSpan,
} from '../../src/observability/index.js';
import {
  formatConsoleReport,
  formatJsonReport,
  formatMarkdownReport,
  generateHtmlReport,
} from '../../src/reporters/index.js';
import { generateReport, runTests, validateRegistry } from '../../src/runner.js';
import { resolve } from 'node:path';
import { TestReport, Severity, TestCategory } from '../../src/types/domain.js';

const validYaml = resolve(process.cwd(), 'tests/fixtures/registry-valid.yaml');
const envYaml = resolve(process.cwd(), 'tests/fixtures/registry-env.yaml');

function createFailedReport(): TestReport {
  return {
    id: 'test-report-failed',
    endpoint: 'http://localhost:3000',
    startedAt: '2024-01-01T00:00:00Z',
    completedAt: '2024-01-01T00:00:01Z',
    durationMs: 1000,
    timestamp: '2024-01-01T00:00:01Z',
    results: [
      {
        validator: 'test-validator',
        category: TestCategory.PROTOCOL,
        passed: false,
        severity: Severity.CRITICAL,
        message: 'Critical validation failed',
        remediation: 'Fix the issue',
        details: { error: 'test error' },
        durationMs: 500,
        timestamp: '2024-01-01T00:00:01Z',
      },
      {
        validator: 'warning-validator',
        category: TestCategory.SECURITY,
        passed: false,
        severity: Severity.WARNING,
        message: 'Warning message',
        details: {},
        durationMs: 200,
        timestamp: '2024-01-01T00:00:01Z',
      },
    ],
    summary: {
      total: 2,
      passed: 0,
      failed: 1,
      warnings: 1,
      critical: 1,
    },
    failures: {
      critical: 1,
      warning: 1,
      info: 0,
    },
    passed: false,
    error: 'Connection refused',
    version: '1.0.0',
  };
}

function createWarningReport(): TestReport {
  return {
    id: 'test-report-warning',
    endpoint: 'http://localhost:3000',
    startedAt: '2024-01-01T00:00:00Z',
    completedAt: '2024-01-01T00:00:01Z',
    durationMs: 1000,
    timestamp: '2024-01-01T00:00:01Z',
    results: [
      {
        validator: 'warning-validator',
        category: TestCategory.PERFORMANCE,
        passed: false,
        severity: Severity.WARNING,
        message: 'Performance warning',
        details: {},
        durationMs: 500,
        timestamp: '2024-01-01T00:00:01Z',
      },
    ],
    summary: {
      total: 1,
      passed: 0,
      failed: 0,
      warnings: 1,
      critical: 0,
    },
    failures: {
      critical: 0,
      warning: 1,
      info: 0,
    },
    passed: true,
    version: '1.0.0',
  };
}

function createErrorReport(): TestReport {
  return {
    id: 'test-report-error',
    endpoint: 'http://localhost:3000',
    startedAt: '2024-01-01T00:00:00Z',
    completedAt: '2024-01-01T00:00:01Z',
    durationMs: 1000,
    timestamp: '2024-01-01T00:00:01Z',
    results: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      critical: 0,
    },
    failures: {
      critical: 0,
      warning: 0,
      info: 0,
    },
    passed: false,
    error: 'Network error: connection refused',
    version: '1.0.0',
  };
}

function createEmptyResultsReport(): TestReport {
  return {
    id: 'test-report-empty',
    endpoint: 'http://localhost:3000',
    startedAt: '2024-01-01T00:00:00Z',
    completedAt: '2024-01-01T00:00:01Z',
    durationMs: 1000,
    timestamp: '2024-01-01T00:00:01Z',
    results: [
      {
        validator: 'info-validator',
        category: TestCategory.PROTOCOL,
        passed: true,
        severity: Severity.INFO,
        message: 'All checks passed',
        details: {},
        durationMs: 500,
        timestamp: '2024-01-01T00:00:01Z',
      },
    ],
    summary: {
      total: 1,
      passed: 1,
      failed: 0,
      warnings: 0,
      critical: 0,
    },
    failures: {
      critical: 0,
      warning: 0,
      info: 1,
    },
    passed: true,
    version: '1.0.0',
  };
}

describe('runner, reporters, and observability', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('formats reports in every supported output', async () => {
    const report = await validateRegistry({ yamlPath: validYaml });

    expect(formatConsoleReport(report)).toContain('MCP Contract Kit');
    expect(formatJsonReport(report)).toContain('"results"');
    expect(formatMarkdownReport(report)).toContain('# MCP Contract Kit - Test Report');
    expect(await generateHtmlReport(report)).toContain('<html');
    expect(await generateReport(report, 'json')).toContain('"version"');
  });

  it('formats console report with connection error', () => {
    const report = createErrorReport();
    const output = formatConsoleReport(report);
    expect(output).toContain('CONNECTION ERROR');
    expect(output).toContain('Network error');
  });

  it('formats console report with failed results', () => {
    const report = createFailedReport();
    const output = formatConsoleReport(report);
    expect(output).toContain('✗ FAILED');
    expect(output).toContain('Critical validation failed');
    expect(output).toContain('Fix the issue');
    expect(output).toContain('🔴');
    expect(output).toContain('🟡');
  });

  it('formats console report with passed status', () => {
    const report = createEmptyResultsReport();
    const output = formatConsoleReport(report);
    expect(output).toContain('✓ PASSED');
  });

  it('formats markdown report with connection error', () => {
    const report = createErrorReport();
    const output = formatMarkdownReport(report);
    expect(output).toContain('### Connection Error');
    expect(output).toContain('Network error');
  });

  it('formats markdown report with failures', () => {
    const report = createFailedReport();
    const output = formatMarkdownReport(report);
    expect(output).toContain('## Failures');
    expect(output).toContain('Critical validation failed');
    expect(output).toContain('### test-validator');
  });

  it('formats markdown report with remediation', () => {
    const report = createFailedReport();
    const output = formatMarkdownReport(report);
    expect(output).toContain('**Remediation:**');
  });

  it('generates html report with failed status', async () => {
    const report = createFailedReport();
    const output = await generateHtmlReport(report);
    expect(output).toContain('FAILED');
    expect(output).toContain('#dc3545');
    expect(output).toContain('Critical');
  });

  it('generates html report with warning status', async () => {
    const report = createWarningReport();
    const output = await generateHtmlReport(report);
    expect(output).toContain('WARNINGS');
    expect(output).toContain('#fd7e14');
  });

  it('marks warning-only registry validation as failed in strict mode', async () => {
    const report = await validateRegistry({ yamlPath: envYaml, strict: true });

    expect(report.passed).toBe(false);
    expect(report.failures.warning).toBe(1);
    expect(report.summary.warnings).toBe(1);
  });

  it('marks connection errors as failed test runs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')));

    const report = await runTests({
      endpoint: 'https://agents.example.com',
      suites: [TestCategory.PROTOCOL],
    });

    expect(report.passed).toBe(false);
    expect(report.error).toContain('connection refused');
  });

  it('generates html report with passed status', async () => {
    const report = createEmptyResultsReport();
    const output = await generateHtmlReport(report);
    expect(output).toContain('PASSED');
    expect(output).toContain('#28a745');
  });

  it('html reporter escapes special characters in validator names', async () => {
    const report: TestReport = {
      ...createEmptyResultsReport(),
      results: [
        {
          validator: 'Test <script>alert("xss")</script>',
          category: TestCategory.PROTOCOL,
          passed: true,
          severity: Severity.INFO,
          message: 'Message with <unsafe> & "quotes"',
          details: {},
          durationMs: 100,
          timestamp: '2024-01-01T00:00:00Z',
        },
      ],
    };
    const output = await generateHtmlReport(report);
    expect(output).toContain('&lt;script&gt;');
    expect(output).toContain('&amp;');
    expect(output).toContain('&quot;quotes&quot;');
    expect(output).not.toContain('alert("xss")');
  });

  it('generates report with different formats via formatReport', async () => {
    const report = await validateRegistry({ yamlPath: validYaml });
    const jsonOutput = await generateReport(report, 'json');
    expect(jsonOutput).toContain('"results"');

    const markdownOutput = await generateReport(report, 'markdown');
    expect(markdownOutput).toContain('# MCP Contract Kit');

    const htmlOutput = await generateReport(report, 'html');
    expect(htmlOutput).toContain('<html');

    const consoleOutput = await generateReport(report, 'console');
    expect(consoleOutput).toContain('MCP Contract Kit');
  });

  it('records spans and metrics', async () => {
    clearSpans();
    metrics.reset();
    const span = startSpan('validator', { suite: 'protocol' });
    endSpan(span, 'ok');
    await withSpan('wrapped', async () => undefined);
    metrics.recordDuration('latency', 42, { suite: 'protocol' });
    metrics.inc('counter', 2, { suite: 'protocol' });

    const traceParent = toTraceParent(span.context);
    expect(fromTraceParent(traceParent)).toMatchObject({
      traceId: span.context.traceId,
      spanId: span.context.spanId,
    });
    expect(getSpans()).toHaveLength(2);
    expect(metrics.getCounter('counter', { suite: 'protocol' })).toBe(2);
    expect(metrics.getHistogram('latency', { suite: 'protocol' }).count).toBe(1);
    expect(metrics.getSummary().counters).toBeDefined();
  });

  it('creates loggers that redact sensitive fields', () => {
    const logger = createLogger({ requestId: 'request-1' });
    expect(typeof logger.info).toBe('function');
    logger.info('test', { password: 'secret', safe: 'value' });
  });
});
