import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    passWithNoTests: true,
    include: ['tests/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json-summary'],
    },
  },
});
