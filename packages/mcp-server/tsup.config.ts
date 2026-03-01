import { defineConfig } from 'tsup'

export default defineConfig([
  // Main entry (CLI with shebang)
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    target: 'node18',
    outDir: 'dist',
    clean: true,
    sourcemap: true,
    dts: true,
    banner: {
      js: '#!/usr/bin/env node',
    },
    external: ['ws', 'express', '@modelcontextprotocol/sdk'],
  },
  // Library exports (no shebang)
  {
    entry: ['src/exports.ts'],
    format: ['esm'],
    target: 'node18',
    outDir: 'dist',
    sourcemap: true,
    dts: true,
    external: ['ws', 'express', '@modelcontextprotocol/sdk'],
  },
])
