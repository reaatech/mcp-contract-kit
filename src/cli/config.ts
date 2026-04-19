/**
 * CLI parsing and defaults.
 */

import { ReportFormat } from '../reporters/index.js';
import { Severity, TestCategory } from '../types/domain.js';
import { getVersion } from '../version.js';

export interface ParsedCliArgs {
  command?: 'test' | 'validate-yaml';
  target?: string;
  help: boolean;
  version: boolean;
  suites: TestCategory[];
  format: ReportFormat;
  output?: string;
  verbose: boolean;
  failOn: Severity;
  timeout: number;
  retries: number;
  strict: boolean;
}

const SUITE_MAP: Record<string, TestCategory> = {
  registry: TestCategory.REGISTRY,
  protocol: TestCategory.PROTOCOL,
  routing: TestCategory.ROUTING,
  security: TestCategory.SECURITY,
  performance: TestCategory.PERFORMANCE,
};

export const CLI_VERSION = getVersion();

export function printHelp(): string {
  return `
mcp-contract-kit v${CLI_VERSION} — Conformance test suite for MCP servers

USAGE:
  mcp-contract-kit test <endpoint> [OPTIONS]
  mcp-contract-kit validate-yaml <path> [OPTIONS]

COMMANDS:
  test <endpoint>       Run conformance tests against an MCP server endpoint
  validate-yaml <path>  Validate an agent registry YAML file

OPTIONS:
  --suite <name>        Run specific test suite (can be repeated)
                        Suites: registry, protocol, routing, security, performance, all
  --format <format>     Output format: console, json, markdown, html (default: console)
  --output <path>       Write report to file
  --verbose             Show detailed output
  --fail-on <level>     Exit with error on: critical, warning (default: critical)
  --timeout <ms>        Request timeout in milliseconds (default: 30000)
  --retries <n>         Number of retries for transient failures (default: 3)
  --strict              (validate-yaml) Fail on warnings too
  --help                Show this help message
  --version             Show version
`.trim();
}

export function parseSuites(values: string[]): TestCategory[] {
  if (values.length === 0 || values.includes('all')) {
    return Object.values(TestCategory);
  }

  return values.map((value) => {
    const suite = SUITE_MAP[value.toLowerCase()];
    if (!suite) {
      throw new Error(
        `Unknown suite: ${value}. Available suites: registry, protocol, routing, security, performance, all`,
      );
    }
    return suite;
  });
}

export function parseArgs(args: string[]): ParsedCliArgs {
  const suiteArgs: string[] = [];
  const parsed: ParsedCliArgs = {
    help: false,
    version: false,
    suites: Object.values(TestCategory),
    format: 'console',
    verbose: false,
    failOn: Severity.CRITICAL,
    timeout: 30000,
    retries: 3,
    strict: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? '';

    switch (arg) {
      case '--help':
      case '-h':
        parsed.help = true;
        break;
      case '--version':
      case '-v':
        parsed.version = true;
        break;
      case '--suite':
        suiteArgs.push(args[++index] ?? '');
        break;
      case '--format':
        parsed.format = (args[++index] ?? 'console') as ReportFormat;
        break;
      case '--output':
        parsed.output = args[++index];
        break;
      case '--verbose':
        parsed.verbose = true;
        break;
      case '--fail-on':
        parsed.failOn = (args[++index] ?? 'critical') as Severity;
        break;
      case '--timeout':
        parsed.timeout = Number.parseInt(args[++index] ?? '30000', 10);
        break;
      case '--retries':
        parsed.retries = Number.parseInt(args[++index] ?? '3', 10);
        break;
      case '--strict':
        parsed.strict = true;
        break;
      default:
        if (!parsed.command) {
          if (arg === 'test' || arg === 'validate-yaml') {
            parsed.command = arg;
          }
        } else if (!parsed.target && !arg.startsWith('-')) {
          parsed.target = arg;
        }
        break;
    }
  }

  parsed.suites = parseSuites(suiteArgs);
  return parsed;
}
