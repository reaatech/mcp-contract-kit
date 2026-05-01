#!/usr/bin/env node
/**
 * CLI entry point for mcp-contract-kit.
 */

import { main } from './main.js';

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((error) => {
    process.stderr.write(`Error: ${(error as Error).message}\n`);
    process.exit(3);
  });
