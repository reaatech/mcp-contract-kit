/**
 * CLI main function and argument parsing.
 */

import { runTestCommand } from './commands/test.command.js';
import { runValidateYamlCommand } from './commands/validate-yaml.command.js';
import { CLI_VERSION, parseArgs, printHelp } from './config.js';

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
