/**
 * Utility to convert a JSON test report into another output format.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { formatReport, ReportFormat } from '../src/reporters/index.js';
import { TestReport } from '../src/types/domain.js';

async function main(): Promise<void> {
  const [, , inputPath, formatArg = 'markdown', outputPath] = process.argv;

  if (!inputPath) {
    throw new Error('Usage: tsx scripts/generate-report.ts <input.json> <format> [output]');
  }

  const raw = await readFile(resolve(inputPath), 'utf-8');
  const report = JSON.parse(raw) as TestReport;
  const output = await formatReport(report, formatArg as ReportFormat);

  if (outputPath) {
    await writeFile(resolve(outputPath), output, 'utf-8');
    return;
  }

  process.stdout.write(`${output}\n`);
}

main().catch((error) => {
  process.stderr.write(`Error: ${(error as Error).message}\n`);
  process.exit(1);
});
