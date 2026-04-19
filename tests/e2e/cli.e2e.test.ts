import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { main } from '../../src/cli.js';
import { parseArgs, printHelp, CLI_VERSION } from '../../src/cli/config.js';
import { Severity, TestCategory } from '../../src/types/domain.js';

function installMockFetch(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as {
        id: string | number;
        method: string;
        params?: Record<string, unknown>;
      };

      if (request.method === 'initialize') {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: request.id,
            result: { protocolVersion: '2024-11-05' },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      if (request.method === 'tools/list') {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: request.id,
            result: {
              tools: [
                {
                  name: 'handle_message',
                  description: 'desc',
                  inputSchema: {},
                },
              ],
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      if (request.method === 'tools/call') {
        const params = request.params as { name?: string };
        if (params.name !== 'handle_message') {
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [],
                isError: true,
              },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }

        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: request.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    content: 'Handled by CLI test',
                    workflow_complete: true,
                  }),
                },
              ],
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          error: { code: -32601, message: 'Method not found' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }),
  );
}

function _installMockFetchFailure(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      return new Response(null, { status: 500 });
    }),
  );
}

describe('cli e2e', () => {
  const cleanup: string[] = [];

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    while (cleanup.length > 0) {
      await rm(cleanup.pop() as string, { recursive: true, force: true });
    }
  });

  it('prints help and validates yaml', async () => {
    await expect(main(['--help'])).resolves.toBe(0);

    const outputDir = await mkdtemp(join(tmpdir(), 'mcp-contract-kit-'));
    cleanup.push(outputDir);
    const outputPath = join(outputDir, 'report.json');
    const yamlPath = resolve(process.cwd(), 'tests/fixtures/registry-valid.yaml');

    const code = await main([
      'validate-yaml',
      yamlPath,
      '--format',
      'json',
      '--output',
      outputPath,
    ]);
    expect(code).toBe(0);
    expect(await readFile(outputPath, 'utf-8')).toContain('"passed": true');
  });

  it('runs the test command against a mocked endpoint', async () => {
    installMockFetch();
    const code = await main([
      'test',
      'https://agents.example.com',
      '--suite',
      'protocol',
      '--format',
      'json',
    ]);
    expect(code).toBe(0);
  });

  it('returns warning exit code when --fail-on warning is used', async () => {
    installMockFetch();
    const code = await main([
      'test',
      'https://agents.example.com',
      '--suite',
      'security',
      '--fail-on',
      'warning',
    ]);
    expect(code).toBe(2);
  });

  it('returns execution-error exit code when the endpoint cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED')));

    const code = await main(['test', 'https://agents.example.com', '--suite', 'protocol']);

    expect(code).toBe(3);
  });

  it('returns error code when test command has no endpoint', async () => {
    await expect(main(['test'])).rejects.toThrow('Missing endpoint argument');
  });

  it('returns error code when validate-yaml has no path', async () => {
    await expect(main(['validate-yaml'])).rejects.toThrow('Missing YAML path argument');
  });

  it('returns version and exits', async () => {
    await expect(main(['--version'])).resolves.toBe(0);
  });

  it('prints help when no command is provided', async () => {
    await expect(main([])).resolves.toBe(1);
  });
});

describe('parseArgs', () => {
  it('parses test command with all options', () => {
    const args = parseArgs([
      'test',
      'http://localhost:3000',
      '--suite',
      'protocol',
      '--suite',
      'routing',
      '--format',
      'json',
      '--output',
      'report.json',
      '--verbose',
      '--fail-on',
      'warning',
      '--timeout',
      '5000',
      '--retries',
      '2',
    ]);
    expect(args.command).toBe('test');
    expect(args.target).toBe('http://localhost:3000');
    expect(args.suites).toEqual([TestCategory.PROTOCOL, TestCategory.ROUTING]);
    expect(args.format).toBe('json');
    expect(args.output).toBe('report.json');
    expect(args.verbose).toBe(true);
    expect(args.failOn).toBe(Severity.WARNING);
    expect(args.timeout).toBe(5000);
    expect(args.retries).toBe(2);
  });

  it('parses validate-yaml command with strict mode', () => {
    const args = parseArgs(['validate-yaml', '/path/to/yaml.yaml', '--strict']);
    expect(args.command).toBe('validate-yaml');
    expect(args.target).toBe('/path/to/yaml.yaml');
    expect(args.strict).toBe(true);
  });

  it('defaults all suites when --suite all is specified', () => {
    const args = parseArgs(['test', 'http://localhost:3000', '--suite', 'all']);
    expect(args.suites).toEqual(Object.values(TestCategory));
  });

  it('parses short options', () => {
    const args = parseArgs(['test', 'http://localhost:3000', '-h']);
    expect(args.help).toBe(true);
  });

  it('throws on unknown suite', () => {
    expect(() => parseArgs(['test', 'http://localhost:3000', '--suite', 'unknown'])).toThrow(
      'Unknown suite',
    );
  });

  it('parses timeout and retries with defaults', () => {
    const args = parseArgs(['test', 'http://localhost:3000']);
    expect(args.timeout).toBe(30000);
    expect(args.retries).toBe(3);
    expect(args.failOn).toBe(Severity.CRITICAL);
    expect(args.verbose).toBe(false);
  });
});

describe('printHelp', () => {
  it('returns help text with version', () => {
    const help = printHelp();
    expect(help).toContain('mcp-contract-kit');
    expect(help).toContain(CLI_VERSION);
    expect(help).toContain('test <endpoint>');
    expect(help).toContain('validate-yaml <path>');
  });
});
