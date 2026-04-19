/**
 * Console reporter - colored terminal output
 */

import { TestReport, Severity } from '../types/domain.js';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function colorize(text: string, color: string): string {
  return `${color}${text}${COLORS.reset}`;
}

function severityIcon(severity: Severity): string {
  switch (severity) {
    case Severity.CRITICAL:
      return '🔴';
    case Severity.WARNING:
      return '🟡';
    case Severity.INFO:
      return '🟢';
    default:
      return '⚪';
  }
}

function severityLabel(severity: Severity): string {
  switch (severity) {
    case Severity.CRITICAL:
      return colorize('CRITICAL', COLORS.red);
    case Severity.WARNING:
      return colorize('WARNING', COLORS.yellow);
    case Severity.INFO:
      return colorize('INFO', COLORS.green);
    default:
      return 'UNKNOWN';
  }
}

export function formatConsoleReport(report: TestReport): string {
  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push(
    colorize('═══════════════════════════════════════════════════════════════', COLORS.cyan),
  );
  lines.push(
    colorize('                    MCP Contract Kit - Test Report             ', COLORS.bold),
  );
  lines.push(
    colorize('═══════════════════════════════════════════════════════════════', COLORS.cyan),
  );
  lines.push('');

  // Endpoint
  if (report.endpoint) {
    lines.push(`  Endpoint: ${report.endpoint}`);
  }

  // Timestamp
  lines.push(`  Timestamp: ${report.timestamp}`);
  lines.push(`  Duration:  ${report.durationMs}ms`);
  lines.push('');

  // Summary
  const { critical, warning, info } = report.failures;
  const total = critical + warning + info;

  lines.push(colorize('  SUMMARY', COLORS.bold));
  lines.push('  ─────────────────────────────────────────────────────────────────');

  if (report.passed) {
    lines.push(`  ${colorize('✓ PASSED', COLORS.green)}  ${total} tests completed`);
  } else {
    lines.push(`  ${colorize('✗ FAILED', COLORS.red)}  ${total} tests completed`);
  }

  lines.push('');
  lines.push(
    `    ${colorize(`${critical}`, critical > 0 ? COLORS.red : COLORS.green)} Critical failures`,
  );
  lines.push(
    `    ${colorize(`${warning}`, warning > 0 ? COLORS.yellow : COLORS.green)} Warning failures`,
  );
  lines.push(`    ${colorize(`${info}`, COLORS.green)} Info/Passed`);
  lines.push('');

  // Connection error
  if (report.error) {
    lines.push(colorize('  CONNECTION ERROR', COLORS.red));
    lines.push('  ─────────────────────────────────────────────────────────────────');
    lines.push(`    ${report.error}`);
    lines.push('');
  }

  // Detailed results
  lines.push(colorize('  RESULTS', COLORS.bold));
  lines.push('  ─────────────────────────────────────────────────────────────────');

  for (const result of report.results) {
    const icon = severityIcon(result.severity);
    const label = severityLabel(result.severity);
    const status = result.passed ? 'PASS' : 'FAIL';
    const statusColor = result.passed ? COLORS.green : COLORS.red;

    lines.push('');
    lines.push(`  ${icon} ${result.validator}`);
    lines.push(`     Status: ${colorize(status, statusColor)}  ${label}`);
    lines.push(`     ${result.message}`);

    if (!result.passed && result.remediation) {
      lines.push(`     ${colorize('→', COLORS.yellow)} ${result.remediation}`);
    }

    if (result.durationMs !== undefined) {
      lines.push(`     Duration: ${result.durationMs}ms`);
    }
  }

  lines.push('');
  lines.push(
    colorize('═══════════════════════════════════════════════════════════════', COLORS.cyan),
  );

  // Exit guidance
  if (report.passed) {
    lines.push(colorize('  All critical checks passed. ✓', COLORS.green));
  } else {
    lines.push(colorize('  Critical issues found. Review and fix before production.', COLORS.red));
  }
  lines.push(
    colorize('═══════════════════════════════════════════════════════════════', COLORS.cyan),
  );
  lines.push('');

  return lines.join('\n');
}

export function printConsoleReport(report: TestReport): void {
  process.stdout.write(`${formatConsoleReport(report)}\n`);
}
