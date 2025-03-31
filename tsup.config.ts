import { defineConfig } from 'tsup';

const entry = ['./src/index.ts', './src/dom-event.ts'];

export default defineConfig([
  {
    entry,
    format: 'cjs',

    esbuildOptions(options) {
      options.platform = 'node';
      options.logLevel = 'silent';
    },
  },
  {
    entry,
    format: 'esm',
    dts: {
      entry,
    },
    esbuildOptions(options) {
      options.platform = 'browser';
      options.logLevel = 'silent';
    },
  },
]);
