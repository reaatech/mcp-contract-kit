/**
 * mcp-contract-kit — Public library API
 *
 * Conformance test suite for MCP servers.
 */

// MCP Client
export { createMCPClient, MCPHttpClient } from '@reaatech/mcp-contract-client';
export type {
  MCPClient,
  MCPError,
  MCPRequest,
  MCPResponse,
  TestReport,
  TestResult,
  ToolDefinition,
  ToolResult,
  ValidationContext,
  ValidationError,
  Validator,
} from '@reaatech/mcp-contract-core';
// Domain types
// Schemas
// Utilities
export {
  type AgentConfig,
  AgentConfigSchema,
  AgentRequestContractSchema,
  AgentResponseContractSchema,
  type AgentType,
  generateId,
  generateUUID,
  isPrivateURL,
  isValidURL,
  MCPRequestSchema,
  MCPResponseSchema,
  now,
  Severity,
  TestCategory,
  TestSuite,
  ToolDefinitionSchema,
} from '@reaatech/mcp-contract-core';
export type { Span, SpanContext } from '@reaatech/mcp-contract-observability';
// Observability
export {
  clearSpans,
  createLogger,
  endSpan,
  fromTraceParent,
  getCurrentContext,
  getSpans,
  logger,
  MetricNames,
  metrics,
  setCurrentContext,
  startSpan,
  toTraceParent,
  withSpan,
} from '@reaatech/mcp-contract-observability';
// Reporters
// HTML Reporter
export {
  formatConsoleReport,
  formatJsonReport,
  formatMarkdownReport,
  formatReport,
  generateHtmlReport,
  printConsoleReport,
  type ReportFormat,
} from '@reaatech/mcp-contract-reporters';

// Validators
export * from '@reaatech/mcp-contract-validators';
export type { ParsedCliArgs } from './config.js';
export { CLI_VERSION, parseArgs, printHelp } from './config.js';
// CLI internals (exposed for e2e testing)
export { main } from './main.js';
export type { RunOptions } from './runner.js';
// Runner
export {
  generateReport,
  runTests,
  validateProtocol,
  validateRegistry,
  validateRouting,
} from './runner.js';
