/**
 * Core domain types for mcp-contract-kit
 */

export { generateUUID } from '../utils/index.js';

/** Severity levels for test results */
export enum Severity {
  /** Critical failures that must be fixed before production */
  CRITICAL = 'critical',
  /** Warnings that should be addressed */
  WARNING = 'warning',
  /** Informational suggestions */
  INFO = 'info',
}

/** Test categories corresponding to validator suites */
export enum TestCategory {
  /** Agent registry YAML validation */
  REGISTRY = 'registry',
  /** MCP JSON-RPC 2.0 protocol compliance */
  PROTOCOL = 'protocol',
  /** Request/response contract validation */
  ROUTING = 'routing',
  /** Security posture checks */
  SECURITY = 'security',
  /** Performance baseline validation */
  PERFORMANCE = 'performance',
}

/** Test suite identifiers */
export enum TestSuite {
  REGISTRY = 'registry',
  PROTOCOL = 'protocol',
  ROUTING = 'routing',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  ALL = 'all',
}

/** Individual test result */
export interface TestResult {
  /** Unique validator identifier */
  validator: string;
  /** Test category */
  category: TestCategory;
  /** Whether the test passed */
  passed: boolean;
  /** Severity level of the result */
  severity: Severity;
  /** Human-readable message */
  message: string;
  /** How to fix the issue (if failed) */
  remediation?: string;
  /** Additional context or details */
  details?: Record<string, unknown>;
  /** Execution duration in milliseconds */
  durationMs: number;
  /** Timestamp when the test was executed */
  timestamp: string;
}

/** Aggregated test report */
export interface TestReport {
  /** Unique report identifier */
  id: string;
  /** Target endpoint being tested */
  endpoint: string;
  /** When the test run started */
  startedAt: string;
  /** When the test run completed */
  completedAt: string;
  /** Total duration in milliseconds */
  durationMs: number;
  /** Timestamp of the report */
  timestamp: string;
  /** All individual test results */
  results: TestResult[];
  /** Summary statistics */
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    critical: number;
  };
  /** Failures by severity */
  failures: {
    critical: number;
    warning: number;
    info: number;
  };
  /** Whether the overall test passed */
  passed: boolean;
  /** Connection error if any */
  error?: string;
  /** Version of the contract-kit */
  version: string;
}

/** Validator interface for implementing test validators */
export interface Validator {
  /** Unique validator name */
  name: string;
  /** Category this validator belongs to */
  category: TestCategory;
  /** Default severity for failures */
  severity: Severity;
  /** Main validation logic */
  validate(context: ValidationContext): Promise<TestResult>;
  /** Optional setup before validation */
  setup?(context: ValidationContext): Promise<void>;
  /** Optional cleanup after validation */
  teardown?(context: ValidationContext): Promise<void>;
}

/** Context passed to validators */
export interface ValidationContext {
  /** MCP client for making requests */
  client: MCPClient;
  /** Target endpoint URL */
  endpoint: string;
  /** Test configuration options */
  options: TestOptions;
  /** Request ID for tracing */
  requestId: string;
  /** Optional precomputed artifacts shared across validators */
  artifacts?: Record<string, unknown>;
}

/** MCP client interface for test execution */
export interface MCPClient {
  /** Connect to the MCP server */
  connect(): Promise<void>;
  /** Send a JSON-RPC request */
  sendRequest<T = unknown>(request: MCPRequest): Promise<MCPResponse<T>>;
  /** Call a specific tool */
  callTool(name: string, args: Record<string, unknown>): Promise<ToolResult>;
  /** List available tools */
  listTools(): Promise<ToolDefinition[]>;
  /** Close the connection */
  disconnect(): Promise<void>;
  /** Get or create session ID */
  getSessionId(): Promise<string>;
}

/** JSON-RPC 2.0 request */
export interface MCPRequest {
  jsonrpc: '2.0';
  method: string;
  id: string | number;
  params?: Record<string, unknown>;
}

/** JSON-RPC 2.0 response */
export interface MCPResponse<T = unknown> {
  jsonrpc: '2.0';
  id: string | number;
  result?: T;
  error?: MCPError;
}

/** JSON-RPC 2.0 error */
export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

/** MCP tool definition */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/** Result from calling a tool */
export interface ToolResult {
  content: Array<{
    type: string;
    text?: string;
    data?: unknown;
  }>;
  isError?: boolean;
}

/** Test execution options */
export interface TestOptions {
  /** Request timeout in milliseconds */
  timeout: number;
  /** Number of retries for transient failures */
  retries: number;
  /** Fail on this severity level or higher */
  failOn: Severity;
  /** Verbose output */
  verbose: boolean;
  /** Specific suites to run */
  suites: TestSuite[];
  /** Path to agent YAML for registry validation */
  yamlPath?: string;
}

/** Validation error with location info */
export interface ValidationError {
  field: string;
  message: string;
  line?: number;
  severity: Severity;
  type: string;
}
