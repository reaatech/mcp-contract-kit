/**
 * Reporters barrel exports
 */

import type { TestReport } from '@reaatech/mcp-contract-core';
import { formatConsoleReport } from './console.reporter.js';
import { generateHtmlReport } from './html.reporter.js';
import { formatJsonReport } from './json.reporter.js';
import { formatMarkdownReport } from './markdown.reporter.js';

export { formatConsoleReport, printConsoleReport } from './console.reporter.js';
export { formatJsonReport } from './json.reporter.js';
export { formatMarkdownReport } from './markdown.reporter.js';
export { generateHtmlReport } from './html.reporter.js';

export type ReportFormat = 'console' | 'json' | 'markdown' | 'html';

export async function formatReport(report: TestReport, format: ReportFormat): Promise<string> {
  switch (format) {
    case 'json':
      return formatJsonReport(report);
    case 'markdown':
      return formatMarkdownReport(report);
    case 'html':
      return generateHtmlReport(report);
    default:
      return formatConsoleReport(report);
  }
}
