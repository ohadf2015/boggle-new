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
      if (!source.startsWith('.')) return null;

      const dir = path.dirname(importer);
      const ext = path.extname(source);

      // Handle .js imports → resolve to .ts if it exists (prevents dual module instances)
      if (ext === '.js') {
        const tsCandidate = path.resolve(dir, source.replace(/\.js$/, '.ts'));
        if (fs.existsSync(tsCandidate)) {
          return tsCandidate;
        }
        return null;
      }

      // Handle extensionless imports
      if (ext) return null;

      // Try .ts, .tsx, then /index.ts
      for (const suffix of ['.ts', '.tsx', '.js', '/index.ts', '/index.js']) {
        const candidate = path.resolve(dir, source + suffix);
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
