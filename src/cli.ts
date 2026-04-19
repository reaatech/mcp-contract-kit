#!/usr/bin/env node
/**
 * CLI entry point for mcp-contract-kit.
 */

import { runTestCommand } from './cli/commands/test.command.js';
import { runValidateYamlCommand } from './cli/commands/validate-yaml.command.js';
import { CLI_VERSION, parseArgs, printHelp } from './cli/config.js';
import { fileURLToPath } from 'node:url';

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const args = parseArgs(argv);

  if (args.help) {
    process.stdout.write(`${printHelp()}\n`);
    return 0;
  }

  if (args.version) {
    process.stdout.write(`mcp-contract-kit v${CLI_VERSION}\n`);
    return 0;
  }

  if (!args.command) {
    process.stderr.write(`${printHelp()}\n`);
    return 1;
  }

  switch (args.command) {
    case 'test':
      return runTestCommand(args);
    case 'validate-yaml':
      return runValidateYamlCommand(args);
  }
}

const isDirectRun =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  main()
    .then((code) => {
      process.exit(code);
    })
    .catch((error) => {
      process.stderr.write(`Error: ${(error as Error).message}\n`);
      process.exit(3);
    });
}
