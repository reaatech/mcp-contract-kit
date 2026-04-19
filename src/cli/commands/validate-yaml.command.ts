/**
 * CLI validate-yaml command.
 */

import { writeFile } from 'node:fs/promises';
import { formatReport } from '../../reporters/index.js';
import { printConsoleReport } from '../../reporters/console.reporter.js';
import { validateRegistry } from '../../runner.js';
import { ParsedCliArgs } from '../config.js';

export async function runValidateYamlCommand(options: ParsedCliArgs): Promise<number> {
  if (!options.target) {
    throw new Error('Missing YAML path argument');
  }

  const report = await validateRegistry({
    yamlPath: options.target,
    strict: options.strict,
  });

  if (options.output) {
    const output = await formatReport(report, options.format);
    await writeFile(options.output, output, 'utf-8');
  } else if (options.format === 'console') {
    printConsoleReport(report);
  } else {
    process.stdout.write(`${await formatReport(report, options.format)}\n`);
  }

  return report.passed ? 0 : 1;
}
