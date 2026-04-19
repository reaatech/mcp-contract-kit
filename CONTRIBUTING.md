# Contributing to mcp-contract-kit

Thank you for your interest in contributing to mcp-contract-kit!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-name/mcp-contract-kit.git`
3. Install dependencies: `npm install`
4. Build: `npm run build`
5. Test: `npm run test`

## Development Workflow

### Prerequisites

- Node.js 22 LTS
- npm 10+

### Setting Up

```bash
# Clone and install
git clone https://github.com/reaatech/mcp-contract-kit.git
cd mcp-contract-kit
npm install

# Build
npm run build

# Run tests
npm run test
```

### Code Style

- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Run `npm run lint` before committing
- Run `npm run format` to auto-format

### Testing

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npx vitest run tests/unit/schemas.test.ts
```

## Adding Validators

### 1. Create the validator file

Create `src/validators/<category>/my-validator.ts`:

```typescript
import { Validator, TestResult, ValidationContext, TestCategory, Severity } from '../../types/domain.js';
import { now } from '../../utils/index.js';

export const myValidator: Validator = {
  name: 'my-validator',
  category: TestCategory.MY_CATEGORY,
  severity: Severity.WARNING,

  async validate(context: ValidationContext): Promise<TestResult> {
    const start = performance.now();
    const errors: string[] = [];

    try {
      // Validation logic here
    } catch (error) {
      errors.push(`Validation failed: ${(error as Error).message}`);
    }

    if (errors.length === 0) {
      return {
        validator: this.name,
        category: this.category,
        passed: true,
        severity: Severity.INFO,
        message: 'Validation passed',
        durationMs: Math.round(performance.now() - start),
        timestamp: now(),
      };
    }

    return {
      validator: this.name,
      category: this.category,
      passed: false,
      severity: this.severity,
      message: `Validation failed with ${errors.length} error(s)`,
      remediation: 'Fix the issues described above.',
      details: { errors },
      durationMs: Math.round(performance.now() - start),
      timestamp: now(),
    };
  },
};
```

### 2. Export from index

Add to `src/validators/<category>/index.ts`:

```typescript
export { myValidator } from './my-validator.js';
```

### 3. Add tests

Create `tests/unit/my-validator.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { myValidator } from '../../src/validators/<category>/my-validator.js';

describe('myValidator', () => {
  it('passes when conditions are met', async () => {
    const context = createMockContext();
    const result = await myValidator.validate(context);
    expect(result.passed).toBe(true);
  });

  it('fails when conditions are not met', async () => {
    // Test implementation
  });
});
```

## Project Structure

```
mcp-contract-kit/
├── src/
│   ├── cli.ts              # CLI entry point
│   ├── index.ts            # Library entry point
│   ├── runner.ts           # Test runner orchestrator
│   ├── types/              # Type definitions and schemas
│   ├── validators/         # Test validators
│   │   ├── registry/       # Registry compliance
│   │   ├── protocol/       # Protocol conformance
│   │   ├── routing/        # Routing contract
│   │   ├── security/       # Security validation
│   │   └── performance/    # Performance validation
│   ├── reporters/          # Output formatters
│   ├── mcp-client/         # MCP test client
│   └── observability/      # Logging, tracing, metrics
├── tests/
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   ├── e2e/                # End-to-end tests
│   └── fixtures/           # Test fixtures
├── skills/                 # Skill definitions
├── docs/                   # Documentation
└── scripts/                # Utility scripts
```

## Commit Messages

Use conventional commits:

- `feat: add new validator`
- `fix: resolve bug in rate-limit validator`
- `docs: update VALIDATORS.md`
- `test: add tests for concurrency validator`
- `refactor: simplify error handling`

## Pull Request Process

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make your changes
3. Add tests for your changes
4. Ensure all tests pass: `npm run test`
5. Ensure coverage is maintained: `npm run test:coverage`
6. Run lint and format: `npm run lint && npm run format`
7. Push and create PR
8. Address review feedback

## Reporting Issues

When reporting issues, include:

- Node.js version
- Operating system
- mcp-contract-kit version
- Steps to reproduce
- Expected vs actual behavior
- Error messages or logs

## License

By contributing, you agree that your contributions will be licensed under the MIT License.