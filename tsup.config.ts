import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/cli.ts',   // CLI entry point → dist/cli.js
    'src/index.ts'  // GitHub Action entry point → dist/index.js
  ],
  format: ['esm'],        // Use ESM for Node v20+
  target: 'node20',
  clean: true,
  shims: true,           // Add Node.js shims for __dirname, etc.
  noExternal: [/(.*)/],  // Bundle all dependencies
});

