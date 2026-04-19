import { describe, expect, it } from 'vitest';
import { loadRegistryFile } from '../../src/validators/registry/shared.js';

describe('registry shared helpers', () => {
  it('loadRegistryFile parses multi-agent registry', () => {
    const result = loadRegistryFile('tests/fixtures/registry-multi.yaml');
    expect(result.agents.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });

  it('loadRegistryFile returns file not found error', () => {
    const result = loadRegistryFile('/nonexistent/path.yaml');
    expect(result.errors[0]?.type).toBe('FILE_READ_ERROR');
  });

  it('loadRegistryFile returns YAML parse error for invalid YAML', () => {
    const result = loadRegistryFile('tests/fixtures/registry-valid.yaml');
    expect(result.errors).toHaveLength(0);
  });
});