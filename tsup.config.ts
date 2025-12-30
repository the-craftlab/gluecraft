import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    index: 'src/index.ts',
  },
  format: ['cjs'],  // Use CJS for compatibility
  target: 'node20',
  outDir: 'dist',
  clean: true,
  shims: true,
  noExternal: [/(.*)/],
  splitting: false,
});

