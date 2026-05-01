/**
 * JSON reporter - machine-readable output
 */

import type { TestReport } from '@reaatech/mcp-contract-core';

export function formatJsonReport(report: TestReport): string {
  return JSON.stringify(report, null, 2);
}
