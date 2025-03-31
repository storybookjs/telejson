import { defineConfig } from 'vitest/config';

process.env.TZ = 'UTC';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['test/**/*.test.ts', 'test/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**', 'dist/**', '**/*.d.ts', '**/*.test.ts', '**/*.config.ts'],
    },
    environmentMatchGlobs: [
      ['test/browser/**/*.test.js', 'happy-dom'],
      ['test/node/**/*.test.js', 'node'],
    ],
  },
});
