import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/modules/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      thresholds: {
        lines: 65,
        functions: 85,
        branches: 50,
        statements: 65,
      },
    },
    setupFiles: ['./src/test/setup.ts'],
  },
});
