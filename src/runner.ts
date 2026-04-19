/**
 * Test runner orchestrator.
 */

import { formatReport, ReportFormat } from './reporters/index.js';
import { createMCPClient } from './mcp-client/index.js';
import { MetricNames, metrics } from './observability/index.js';
import {
  MCPClient,
  Severity,
  TestCategory,
  TestReport,
  TestResult,
  TestSuite,
  ValidationContext,
  Validator,
  generateUUID,
} from './types/domain.js';
import { now } from './utils/index.js';
import { getVersion } from './version.js';
import {
  getPerformanceValidators,
  getProtocolValidators,
  getRegistryValidators,
  getRoutingValidators,
  getSecurityValidators,
} from './validators/index.js';

export interface RunOptions {
  endpoint: string;
  suites?: Array<TestCategory | TestSuite>;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  yamlPath?: string;
  verbose?: boolean;
  failOn?: Severity;
}

interface ExecutionResult {
  results: TestResult[];
  connectionError?: Error;
}

function normalizeSuite(value: TestCategory | TestSuite): TestCategory {
  switch (value) {
    case TestSuite.REGISTRY:
    case TestCategory.REGISTRY:
      return TestCategory.REGISTRY;
    case TestSuite.PROTOCOL:
    case TestCategory.PROTOCOL:
      return TestCategory.PROTOCOL;
    case TestSuite.ROUTING:
    case TestCategory.ROUTING:
      return TestCategory.ROUTING;
    case TestSuite.SECURITY:
    case TestCategory.SECURITY:
      return TestCategory.SECURITY;
    case TestSuite.PERFORMANCE:
    case TestCategory.PERFORMANCE:
      return TestCategory.PERFORMANCE;
    case TestSuite.ALL:
      throw new Error('Use expandSuites() to handle TestSuite.ALL');
  }
}

function expandSuites(suites?: Array<TestCategory | TestSuite>): TestCategory[] {
  if (!suites || suites.length === 0 || suites.includes(TestSuite.ALL)) {
    return Object.values(TestCategory);
  }

  return [...new Set(suites.map(normalizeSuite))];
}

function getValidatorsForSuites(suites: TestCategory[]): Validator[] {
  return suites.flatMap((suite) => {
    switch (suite) {
      case TestCategory.REGISTRY:
        return getRegistryValidators();
      case TestCategory.PROTOCOL:
        return getProtocolValidators();
      case TestCategory.ROUTING:
        return getRoutingValidators();
      case TestCategory.SECURITY:
        return getSecurityValidators();
      case TestCategory.PERFORMANCE:
        return getPerformanceValidators();
    }
  });
}

function createNullClient(): MCPClient {
  return {
    async connect() {
      return undefined;
    },
    async sendRequest() {
      throw new Error('Registry validation does not use an MCP client');
    },
    async callTool() {
      throw new Error('Registry validation does not use an MCP client');
    },
    async listTools() {
      throw new Error('Registry validation does not use an MCP client');
    },
    async disconnect() {
      return undefined;
    },
    async getSessionId() {
      return generateUUID();
    },
  };
}

async function runValidator(validator: Validator, context: ValidationContext): Promise<TestResult> {
  try {
    await validator.setup?.(context);
    const result = await validator.validate(context);
    await validator.teardown?.(context);
    metrics.recordDuration(MetricNames.VALIDATOR_DURATION, result.durationMs, {
      validator: validator.name,
      category: validator.category,
    });
    metrics.inc(result.passed ? MetricNames.TESTS_PASSED : MetricNames.TESTS_FAILED, 1, {
      validator: validator.name,
      category: validator.category,
    });
    return result;
  } catch (error) {
    metrics.inc(MetricNames.ERRORS_TOTAL, 1, {
      validator: validator.name,
      category: validator.category,
    });
    return {
      validator: validator.name,
      category: validator.category,
      passed: false,
      severity: Severity.CRITICAL,
      message: `Validator execution failed: ${(error as Error).message}`,
      durationMs: 0,
      timestamp: now(),
    };
  }
}

function createContext(
  options: RunOptions,
  suites: TestCategory[],
  client: MCPClient,
): ValidationContext {
  return {
    client,
    endpoint: options.endpoint,
    requestId: generateUUID(),
    options: {
      yamlPath: options.yamlPath,
      timeout: options.timeout ?? 30000,
      retries: options.retries ?? 3,
      failOn: options.failOn ?? Severity.CRITICAL,
      verbose: options.verbose ?? false,
      suites: suites as unknown as TestSuite[],
    },
    artifacts: {},
  };
}

function aggregateResults(
  endpoint: string,
  startedAt: string,
  completedAt: string,
  results: TestResult[],
  connectionError?: Error,
): TestReport {
  const warningResults = results.filter((result) => result.severity === Severity.WARNING);
  const criticalFailures = results.filter(
    (result) => !result.passed && result.severity === Severity.CRITICAL,
  );
  const warningFailures = warningResults.filter((result) => !result.passed);
  const passedResults = results.filter((result) => result.passed);

  return {
    id: generateUUID(),
    endpoint,
    startedAt,
    completedAt,
    durationMs: Math.max(0, new Date(completedAt).getTime() - new Date(startedAt).getTime()),
    timestamp: completedAt,
    results,
    summary: {
      total: results.length,
      passed: passedResults.length,
      failed: results.filter((result) => !result.passed).length,
      warnings: warningResults.length,
      critical: criticalFailures.length,
    },
    failures: {
      critical: criticalFailures.length,
      warning: warningResults.length,
      info: results.filter((result) => result.severity === Severity.INFO).length,
    },
    passed: criticalFailures.length === 0 && connectionError === undefined,
    error: connectionError?.message,
    version: getVersion(),
  };
}

async function executeValidators(
  validators: Validator[],
  context: ValidationContext,
  connectClient: boolean,
): Promise<ExecutionResult> {
  const results: TestResult[] = [];
  let connectionError: Error | undefined;

  try {
    if (connectClient) {
      await context.client.connect();
    }

    for (const validator of validators) {
      results.push(await runValidator(validator, context));
    }
  } catch (error) {
    connectionError = error as Error;
  } finally {
    await context.client.disconnect().catch(() => undefined);
  }

  return { results, connectionError };
}

export async function runTests(options: RunOptions): Promise<TestReport> {
  const startedAt = now();
  const suites = expandSuites(options.suites);
  const validators = getValidatorsForSuites(suites);
  const client = createMCPClient({
    endpoint: options.endpoint,
    timeout: options.timeout ?? 30000,
    retries: options.retries ?? 3,
    headers: options.headers,
  });
  const context = createContext(options, suites, client);
  const execution = await executeValidators(validators, context, true);
  const completedAt = now();

  const report = aggregateResults(
    options.endpoint,
    startedAt,
    completedAt,
    execution.results,
    execution.connectionError,
  );
  metrics.recordDuration(MetricNames.RUN_DURATION, report.durationMs);
  metrics.inc(MetricNames.TESTS_TOTAL, report.results.length);
  return report;
}

export async function validateRegistry(options: {
  yamlPath: string;
  strict?: boolean;
}): Promise<TestReport> {
  const startedAt = now();
  const validators = getRegistryValidators();
  const context = createContext(
    {
      endpoint: '',
      yamlPath: options.yamlPath,
      failOn: options.strict ? Severity.WARNING : Severity.CRITICAL,
    },
    [TestCategory.REGISTRY],
    createNullClient(),
  );
  const execution = await executeValidators(validators, context, false);
  const completedAt = now();
  const report = aggregateResults(
    '',
    startedAt,
    completedAt,
    execution.results,
    execution.connectionError,
  );

  if (options.strict && report.failures.warning > 0) {
    report.passed = false;
  }

  return report;
}

export async function validateProtocol(options: RunOptions): Promise<TestReport> {
  return runTests({
    ...options,
    suites: [TestCategory.PROTOCOL],
  });
}

export async function validateRouting(options: RunOptions): Promise<TestReport> {
  return runTests({
    ...options,
    suites: [TestCategory.ROUTING],
  });
}

export async function generateReport(report: TestReport, format: ReportFormat): Promise<string> {
  return formatReport(report, format);
}
