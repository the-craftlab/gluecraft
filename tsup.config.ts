import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',      // CLI entry point → dist/cli.js
    index: 'src/index.ts'  // GitHub Action entry point → dist/index.js
  },
  format: ['esm'],        // Use ESM for Node v20+
  target: 'node20',
  clean: true,
  shims: true,           // Add Node.js shims for __dirname, etc.
  // Bundle all npm packages, but Node.js built-ins are automatically external
  noExternal: [/(.*)/],
  // Ensure both files are built
  splitting: false,
  treeshake: false,
});

