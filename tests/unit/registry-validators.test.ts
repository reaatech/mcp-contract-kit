import { resolve } from 'node:path';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  validateAgentYAML,
  schemaValidator,
  validateInvariants,
  invariantValidator,
  validateEnvExpansion,
  envExpansionValidator,
} from '../../src/validators/registry/index.js';
import { Severity, TestCategory, TestSuite } from '../../src/types/domain.js';
import { MockClient } from '../helpers/mock-client.js';

const fixtures = (name: string): string => resolve(process.cwd(), 'tests/fixtures', name);

function createContext(yamlPath?: string): {
  client: MockClient;
  endpoint: string;
  requestId: string;
  options: {
    yamlPath?: string;
    timeout: number;
    retries: number;
    failOn: Severity;
    verbose: boolean;
    suites: TestSuite[];
  };
  artifacts: Record<string, unknown>;
} {
  return {
    client: new MockClient(),
    endpoint: '',
    requestId: 'request-id',
    options: {
      yamlPath,
      timeout: 1000,
      retries: 0,
      failOn: Severity.CRITICAL,
      verbose: false,
      suites: [TestSuite.REGISTRY],
    },
    artifacts: {},
  };
}

describe('registry validators', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('validates a well-formed registry yaml file', () => {
    const result = validateAgentYAML(fixtures('registry-valid.yaml'));
    expect(result.valid).toBe(true);
    expect(result.agents).toHaveLength(1);
  });

  it('loads multi-agent registries and reports invariant failures', () => {
    const schemaResult = validateAgentYAML(fixtures('registry-invalid.yaml'));
    expect(schemaResult.valid).toBe(true);

    const invariantResult = validateInvariants(schemaResult.agents ?? []);
    expect(invariantResult.valid).toBe(false);
    expect(invariantResult.errors.map((error) => error.type)).toContain('MULTIPLE_DEFAULTS');
    expect(invariantResult.errors.map((error) => error.type)).toContain('DUPLICATE_AGENT_IDS');
  });

  it('shares parsed agents between schema and invariant validators', async () => {
    const context = createContext(fixtures('registry-multi.yaml'));
    const schema = await schemaValidator.validate(context);
    const invariant = await invariantValidator.validate(context);

    expect(schema.passed).toBe(true);
    expect(invariant.passed).toBe(true);
    expect(
      (context.artifacts as Record<string, unknown> | undefined)?.registryAgents,
    ).toBeDefined();
  });

  it('detects undefined environment variables and circular references', () => {
    vi.stubEnv('SELF_REF', '${SELF_REF}');
    const result = validateEnvExpansion(`endpoint: \${SELF_REF}\nauth: \${MISSING_ENV}`);

    expect(result.valid).toBe(false);
    expect(result.errors[0]?.type).toBe('CIRCULAR_ENV_REF');
    expect(result.warnings[0]?.type).toBe('ENV_VAR_UNDEFINED');
  });

  it('runs the env expansion validator against yaml content', async () => {
    vi.stubEnv('DEPLOYMENT_TIER', 'prod');
    const context = createContext(fixtures('registry-env.yaml'));
    const result = await envExpansionValidator.validate(context);

    expect(result.passed).toBe(true);
    expect(result.category).toBe(TestCategory.REGISTRY);
  });

  it('invariant validator handles missing yaml path', async () => {
    const context = createContext(undefined);
    const result = await invariantValidator.validate(context);

    expect(result.passed).toBe(false);
    expect(result.message).toContain('No valid agent configurations');
  });

  it('invariant validator handles empty agents array', async () => {
    const context = createContext(undefined);
    context.artifacts = { registryAgents: [] };

    const result = await invariantValidator.validate(context);
    expect(result.passed).toBe(false);
  });

  it('detects no default agent', () => {
    const agents = [
      {
        agent_id: 'agent-1',
        display_name: 'Agent 1',
        description: 'Test agent',
        endpoint: 'https://example.com/agent1',
        type: 'mcp' as const,
        is_default: false,
        confidence_threshold: 0.8,
        clarification_required: false,
        examples: [],
      },
    ];

    const result = validateInvariants(agents);
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.type)).toContain('NO_DEFAULT_AGENT');
  });

  it('detects default agent with non-zero threshold', () => {
    const agents = [
      {
        agent_id: 'agent-1',
        display_name: 'Agent 1',
        description: 'Test agent',
        endpoint: 'https://example.com/agent1',
        type: 'mcp' as const,
        is_default: true,
        confidence_threshold: 0.5,
        clarification_required: false,
        examples: [],
      },
    ];

    const result = validateInvariants(agents);
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.type)).toContain('INVALID_DEFAULT_THRESHOLD');
  });

  it('detects invalid endpoint URL', () => {
    const agents = [
      {
        agent_id: 'agent-1',
        display_name: 'Agent 1',
        description: 'Test agent',
        endpoint: 'not-a-valid-url',
        type: 'mcp' as const,
        is_default: true,
        confidence_threshold: 0,
        clarification_required: false,
        examples: [],
      },
    ];

    const result = validateInvariants(agents);
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.type)).toContain('INVALID_ENDPOINT_URL');
  });

  it('detects localhost endpoint', () => {
    const agents = [
      {
        agent_id: 'agent-1',
        display_name: 'Agent 1',
        description: 'Test agent',
        endpoint: 'http://localhost:8080',
        type: 'mcp' as const,
        is_default: true,
        confidence_threshold: 0,
        clarification_required: false,
        examples: [],
      },
    ];

    const result = validateInvariants(agents);
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.type)).toContain('SSRF_VULNERABILITY');
  });

  it('detects private IP endpoint', () => {
    const agents = [
      {
        agent_id: 'agent-1',
        display_name: 'Agent 1',
        description: 'Test agent',
        endpoint: 'http://192.168.1.1:8080',
        type: 'mcp' as const,
        is_default: true,
        confidence_threshold: 0,
        clarification_required: false,
        examples: [],
      },
    ];

    const result = validateInvariants(agents);
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.type)).toContain('SSRF_VULNERABILITY');
  });

  it('detects endpoint URL exceeding 2048 characters', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2050);
    const agents = [
      {
        agent_id: 'agent-1',
        display_name: 'Agent 1',
        description: 'Test agent',
        endpoint: longUrl,
        type: 'mcp' as const,
        is_default: true,
        confidence_threshold: 0,
        clarification_required: false,
        examples: [],
      },
    ];

    const result = validateInvariants(agents);
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.type)).toContain('ENDPOINT_TOO_LONG');
  });

  it('validates env expansion with incomplete variable reference', () => {
    const result = validateEnvExpansion('endpoint: ${INCOMPLETE');

    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.type)).toContain('INCOMPLETE_ENV_VAR');
  });

  it('validates env expansion with invalid variable name', () => {
    const result = validateEnvExpansion('endpoint: ${invalid-name}');

    expect(result.errors.map((e) => e.type)).toContain('INVALID_ENV_VAR_NAME');
  });

  it('validates env expansion without any env vars', () => {
    const result = validateEnvExpansion('endpoint: https://example.com');

    expect(result.valid).toBe(true);
    expect(result.variables).toHaveLength(0);
  });

  it('env expansion validator handles file read error', async () => {
    const context = createContext('/nonexistent/path.yaml');
    const result = await envExpansionValidator.validate(context);

    expect(result.passed).toBe(false);
    expect(result.message).toContain('Failed to read file');
  });

  it('env expansion validator skips when no yaml path provided', async () => {
    const context = createContext(undefined);
    const result = await envExpansionValidator.validate(context);

    expect(result.passed).toBe(true);
    expect(result.message).toContain('skipping');
  });

  it('detects circular environment variable reference', () => {
    vi.stubEnv('VAR_A', '${VAR_B}');
    vi.stubEnv('VAR_B', '${VAR_A}');

    const result = validateEnvExpansion('endpoint: ${VAR_A}');

    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.type)).toContain('CIRCULAR_ENV_REF');
  });
});
