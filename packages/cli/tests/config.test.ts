import { describe, expect, it } from 'vitest';
import { parseArgs } from '../src/config.js';

describe('parseArgs auth headers', () => {
  it('leaves headers undefined when no auth flags are passed', () => {
    const args = parseArgs(['test', 'http://localhost:3003/mcp']);
    expect(args.headers).toBeUndefined();
  });

  it('maps --bearer to an Authorization header', () => {
    const args = parseArgs(['test', 'http://localhost:3003/mcp', '--bearer', 'sk_test_123']);
    expect(args.headers).toEqual({ Authorization: 'Bearer sk_test_123' });
  });

  it('parses --header "Name: Value" and trims surrounding whitespace', () => {
    const args = parseArgs(['test', 'http://localhost:3003/mcp', '--header', 'X-Tenant:  acme ']);
    expect(args.headers).toEqual({ 'X-Tenant': 'acme' });
  });

  it('accepts repeated --header flags and combines them with --bearer', () => {
    const args = parseArgs([
      'test',
      'http://localhost:3003/mcp',
      '--bearer',
      'tok',
      '--header',
      'X-One: 1',
      '--header',
      'X-Two: 2',
    ]);
    expect(args.headers).toEqual({
      Authorization: 'Bearer tok',
      'X-One': '1',
      'X-Two': '2',
    });
  });

  it('preserves colons in the header value', () => {
    const args = parseArgs([
      'test',
      'http://localhost:3003/mcp',
      '--header',
      'X-Url: https://a.b/c',
    ]);
    expect(args.headers).toEqual({ 'X-Url': 'https://a.b/c' });
  });

  it('throws on a malformed --header missing a colon', () => {
    expect(() => parseArgs(['test', 'http://x/mcp', '--header', 'nope'])).toThrow(
      /Expected "Name: Value"/,
    );
  });
});
