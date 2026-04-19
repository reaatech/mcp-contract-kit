import { describe, expect, it } from 'vitest';
import * as root from '../../src/index.js';
import * as validators from '../../src/validators/index.js';
import * as reporters from '../../src/reporters/index.js';
import * as client from '../../src/mcp-client/index.js';

describe('barrel exports', () => {
  it('exports public APIs', () => {
    expect(root.runTests).toBeTypeOf('function');
    expect(root.validateProtocol).toBeTypeOf('function');
    expect(root.validateRouting).toBeTypeOf('function');
    expect(validators.getRegistryValidators).toBeTypeOf('function');
    expect(reporters.formatReport).toBeTypeOf('function');
    expect(client.createMCPClient).toBeTypeOf('function');
  });
});
