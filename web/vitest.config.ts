import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    environmentMatchGlobs: [
      ['**/*.integration.test.ts', 'node'],
    ],
  },
});