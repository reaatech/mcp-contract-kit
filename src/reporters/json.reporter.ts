/**
 * JSON reporter - machine-readable output
 */

import { TestReport } from '../types/domain.js';

export function formatJsonReport(report: TestReport): string {
  return JSON.stringify(report, null, 2);
}
