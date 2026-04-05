import { defineConfig } from 'vitest/config';
import path from 'path';
import fs from 'fs';

/**
 * Vite plugin that resolves extensionless require()/import paths to .ts files.
 * Needed because backend source uses `require('./foo')` which Node can't resolve to .ts.
 */
function resolveTypescriptRequires() {
  return {
    name: 'resolve-ts-requires',
    enforce: 'pre' as const,
    resolveId(source: string, importer: string | undefined) {
      if (!importer || source.startsWith('\0') || /node_modules/.test(importer)) return null;
      // Only handle relative paths without extensions
      if (!source.startsWith('.') || path.extname(source)) return null;

      const dir = path.dirname(importer);
      // Try .ts, .tsx, then /index.ts
      for (const ext of ['.ts', '.tsx', '.js', '/index.ts', '/index.js']) {
        const candidate = path.resolve(dir, source + ext);
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [resolveTypescriptRequires()],
  resolve: {
    alias: {
      '@backend': path.resolve(__dirname, './backend'),
      '@': path.resolve(__dirname, './'),
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.backend.setup.ts'],
    include: [
      'backend/**/*.test.{ts,js}',
      'backend/**/*.spec.{ts,js}',
    ],
    exclude: [
      'node_modules',
      'dist',
    ],
    testTimeout: 15000,
    pool: 'threads',
    maxWorkers: 8,
    teardownTimeout: 3000,
    hookTimeout: 10000,
    fileParallelism: true,
    clearMocks: true,
    restoreMocks: false,
  },
});
