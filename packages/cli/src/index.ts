/**
 * mcp-contract-kit — Public library API
 *
 * Conformance test suite for MCP servers.
 */

// CLI internals (exposed for e2e testing)
export { main } from './main.js';
export { parseArgs, printHelp, CLI_VERSION } from './config.js';
export type { ParsedCliArgs } from './config.js';

// Runner
export {
  runTests,
  validateRegistry,
  validateProtocol,
  validateRouting,
  generateReport,
} from './runner.js';
export type { RunOptions } from './runner.js';

// Domain types
export {
  TestSuite,
  Severity,
  TestCategory,
} from '@reaatech/mcp-contract-core';
export type {
  TestResult,
  TestReport,
  Validator,
  ValidationContext,
  ValidationError,
  MCPClient,
  MCPRequest,
  MCPResponse,
  MCPError,
  ToolDefinition,
  ToolResult,
} from '@reaatech/mcp-contract-core';

// Schemas
export {
  AgentConfigSchema,
  MCPRequestSchema,
  MCPResponseSchema,
  ToolDefinitionSchema,
  AgentRequestContractSchema,
  AgentResponseContractSchema,
  type AgentConfig,
  type AgentType,
} from '@reaatech/mcp-contract-core';

// Reporters
export {
  formatConsoleReport,
  printConsoleReport,
  formatJsonReport,
  formatMarkdownReport,
  formatReport,
  type ReportFormat,
} from '@reaatech/mcp-contract-reporters';

// Validators
export * from '@reaatech/mcp-contract-validators';

// MCP Client
export { MCPHttpClient, createMCPClient } from '@reaatech/mcp-contract-client';

// Utilities
export {
  generateUUID,
  generateId,
  now,
  isValidURL,
  isPrivateURL,
} from '@reaatech/mcp-contract-core';

// Observability
export {
  logger,
  createLogger,
  metrics,
  MetricNames,
  startSpan,
  endSpan,
  getCurrentContext,
  setCurrentContext,
  getSpans,
  clearSpans,
  withSpan,
  toTraceParent,
  fromTraceParent,
} from '@reaatech/mcp-contract-observability';
export type { Span, SpanContext } from '@reaatech/mcp-contract-observability';

// HTML Reporter
export { generateHtmlReport } from '@reaatech/mcp-contract-reporters';
