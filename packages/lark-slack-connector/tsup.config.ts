import { defineConfig } from 'tsup';

export default defineConfig([
  // Main library
  {
    entry: {
      index: 'src/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    shims: true,
  },
  // CLI (CJS only for bin)
  {
    entry: {
      'cli/index': 'src/cli/index.ts',
      'cli/desktop': 'src/cli/desktop.ts',
    },
    format: ['cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    shims: true,
  },
]);
