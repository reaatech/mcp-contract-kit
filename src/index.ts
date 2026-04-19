/**
 * mcp-contract-kit — Public library API
 *
 * Conformance test suite for MCP servers.
 */

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
  TestResult,
  TestReport,
  Validator,
  ValidationContext,
  Severity,
  TestCategory,
  ValidationError,
  MCPClient,
  MCPRequest,
  MCPResponse,
  MCPError,
  ToolDefinition,
  ToolResult,
} from './types/domain.js';

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
} from './types/schemas.js';

// Reporters
export {
  formatConsoleReport,
  printConsoleReport,
  formatJsonReport,
  formatMarkdownReport,
  formatReport,
  type ReportFormat,
} from './reporters/index.js';

// Validators
export * from './validators/index.js';

// MCP Client
export { MCPHttpClient, createMCPClient } from './mcp-client/index.js';

// Utilities
export { generateUUID, generateId, now, isValidURL, isPrivateURL } from './utils/index.js';

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
} from './observability/index.js';
export type { Span, SpanContext } from './observability/index.js';

// HTML Reporter
export { generateHtmlReport } from './reporters/index.js';
