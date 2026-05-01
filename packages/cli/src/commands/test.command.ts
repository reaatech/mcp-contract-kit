/**
 * CLI test command.
 */

import { writeFile } from 'node:fs/promises';
import { formatReport } from '@reaatech/mcp-contract-reporters';
import { printConsoleReport } from '@reaatech/mcp-contract-reporters';
import type { ParsedCliArgs } from '../config.js';
import { runTests } from '../runner.js';

export async function runTestCommand(options: ParsedCliArgs): Promise<number> {
  if (!options.target) {
    throw new Error('Missing endpoint argument');
  }

  const report = await runTests({
    endpoint: options.target,
    suites: options.suites,
    timeout: options.timeout,
    retries: options.retries,
    verbose: options.verbose,
    failOn: options.failOn,
  });

  if (options.output) {
    const output = await formatReport(report, options.format);
    await writeFile(options.output, output, 'utf-8');
  } else if (options.format === 'console') {
    printConsoleReport(report);
  } else {
    process.stdout.write(`${await formatReport(report, options.format)}\n`);
  }

  if (report.error) {
    return 3;
  }
  if (!report.passed) {
    return 1;
  }
  if (options.failOn === 'warning' && report.failures.warning > 0) {
    return 2;
  }
  return 0;
}
