import { defineConfig } from 'vitest/config';
import path from 'path';
import fs from 'fs';
import type { Plugin } from 'vite';

/**
 * Vite plugin that converts CJS patterns to ESM for Vitest compatibility.
 *
 * The codebase mixes CJS (require/module.exports) with ESM (import/export).
 * Vitest transforms files via Vite as ESM, but require()-loaded files bypass
 * Vite transforms. This plugin converts:
 *
 * 1. Top-level `const x = require('./foo')` → `import x from './foo'`
 * 2. Top-level `const { a, b } = require('./foo')` → `import { a, b } from './foo'`
 * 3. Inline `require('./foo').bar` → dynamic patterns with __require shim
 * 4. `module.exports = { ... }` → stripped (ESM exports already exist)
 */
function cjsToEsmPlugin(): Plugin {
  const tsExtensions = ['.ts', '.tsx', '.js', '.jsx'];

  function resolveSpecifier(specifier: string, dir: string): string {
    // If already has extension, return as-is
    if (/\.\w+$/.test(specifier) && !specifier.endsWith('/')) return specifier;
    // Only resolve relative paths
    if (!specifier.startsWith('.')) return specifier;

    const resolved = path.resolve(dir, specifier);
    for (const ext of tsExtensions) {
      if (fs.existsSync(resolved + ext)) return specifier + ext;
      const indexPath = path.join(resolved, 'index' + ext);
      if (fs.existsSync(indexPath)) return specifier + '/index' + ext;
    }
    return specifier;
  }

  return {
    name: 'cjs-to-esm',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('/backend/') || id.includes('node_modules')) return null;
      if (!code.includes('require(') && !code.includes('module.exports')) return null;

      const dir = path.dirname(id);
      let result = code;
      let importBlock = '';
      let importCounter = 0;

      // 1. Convert top-level: const varName = require('specifier');
      //    For relative paths: import * as varName (namespace, matches CJS module.exports)
      //    For node builtins/packages: import varName (default, matches CJS module.exports)
      result = result.replace(
        /^(const|let|var)\s+(\w+)\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)\s*;?/gm,
        (_match, _decl, varName, specifier) => {
          const isRelative = specifier.startsWith('.');
          const resolved = resolveSpecifier(specifier, dir);
          if (isRelative) {
            importBlock += `import * as ${varName} from '${resolved}';\n`;
          } else {
            importBlock += `import ${varName} from '${resolved}';\n`;
          }
          return `/* converted to import: ${varName} */`;
        }
      );

      // 2. Convert top-level: const { a, b } = require('specifier');
      //    → import { a, b } from 'specifier';
      result = result.replace(
        /^(const|let|var)\s+(\{[^}]+\})\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)(?:\s*as\s*\{[^}]*\})?\s*;?/gm,
        (_match, _decl, destructure, specifier) => {
          const resolved = resolveSpecifier(specifier, dir);
          // Convert CJS aliases { orig: alias } to ESM { orig as alias }
          const esmDestructure = destructure.replace(/(\w+)\s*:\s*(\w+)/g, '$1 as $2');
          importBlock += `import ${esmDestructure} from '${resolved}';\n`;
          return `/* converted to import: ${destructure} */`;
        }
      );

      // 3. Convert inline require().property patterns (e.g., in object spreads)
      //    ...require('./foo') → (await import('./foo'))
      //    require('./foo').bar → imports at top
      result = result.replace(
        /require\(\s*['"](\.[^'"]+)['"]\s*\)\.(\w+)/g,
        (_match, specifier, prop) => {
          const resolved = resolveSpecifier(specifier, dir);
          const tmpVar = `__req_${importCounter++}`;
          importBlock += `import { ${prop} as ${tmpVar} } from '${resolved}';\n`;
          return tmpVar;
        }
      );

      // 4. Convert spread require: ...require('./foo')
      result = result.replace(
        /\.\.\.require\(\s*['"](\.[^'"]+)['"]\s*\)/g,
        (_match, specifier) => {
          const resolved = resolveSpecifier(specifier, dir);
          const tmpVar = `__req_spread_${importCounter++}`;
          importBlock += `import * as ${tmpVar} from '${resolved}';\n`;
          return `...${tmpVar}`;
        }
      );

      // 5. Handle remaining require() calls for relative paths (lazy/conditional requires)
      //    These stay as require() but get extension resolution
      result = result.replace(
        /require\(\s*['"](\.[^'"]+)['"]\s*\)/g,
        (match, specifier) => {
          const resolved = resolveSpecifier(specifier, dir);
          if (resolved !== specifier) {
            return match.replace(specifier, resolved);
          }
          return match;
        }
      );

      // 6. Handle module.exports blocks
      if (result.includes('module.exports')) {
        // Check if file has ESM exports already — if so, strip CJS exports (they're duplicates)
        const hasEsmExports = /^export\s/m.test(code) || /^export\s/m.test(result);
        if (hasEsmExports) {
          result = result.replace(/module\.exports\s*=\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\};?/gs, '/* CJS exports stripped */');
          result = result.replace(/module\.exports\s*=\s*require\([^)]+\);?/g, '/* CJS re-export stripped */');
          result = result.replace(/module\.exports\.(\w+)\s*=\s*[^;]+;?/g, '/* CJS named export stripped */');
          // Convert module.exports = varName to export default (tests may use default import)
          // But only if no export default already exists
          const hasDefaultExport = /^export\s+default\s/m.test(code) || /^export\s+default\s/m.test(result);
          if (hasDefaultExport) {
            result = result.replace(/module\.exports\s*=\s*\w+;?/g, '/* CJS export stripped (default exists) */');
          } else {
            result = result.replace(/module\.exports\s*=\s*(\w+);?/g, 'export default $1;');
          }
        } else {
          // Pure CJS file: convert module.exports = { a, b } to named exports
          result = result.replace(
            /module\.exports\s*=\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\};?/gs,
            (_match, body) => {
              const names = body.split(',').map((s: string) => s.trim()).filter((s: string) => s && !s.includes(':'));
              const aliased = body.split(',').map((s: string) => s.trim()).filter((s: string) => s.includes(':'));
              let exportStmt = '';
              if (names.length) exportStmt += `export { ${names.join(', ')} };\n`;
              for (const a of aliased) {
                const [key, val] = a.split(':').map((s: string) => s.trim());
                if (key && val) exportStmt += `export { ${val} as ${key} };\n`;
              }
              return exportStmt || '/* CJS exports converted */';
            }
          );
          result = result.replace(/module\.exports\s*=\s*(\w+);?/g, 'export default $1;');
        }
      }

      if (importBlock || result !== code) {
        return { code: importBlock + result, map: null };
      }
      return null;
    },
  };
}

/**
 * Vite plugin that resolves .js imports to .ts files when the .js doesn't exist.
 * TypeScript allows `import './foo.js'` to resolve to `foo.ts` at compile time,
 * but Vite needs the actual file. This plugin bridges that gap.
 */
function jsToTsResolvePlugin(): Plugin {
  return {
    name: 'js-to-ts-resolve',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || !source.endsWith('.js')) return null;
      if (!importer.includes('/backend/') || importer.includes('node_modules')) return null;
      if (!source.startsWith('.')) return null;

      const dir = path.dirname(importer);
      const resolved = path.resolve(dir, source);
      if (fs.existsSync(resolved)) return null; // .js exists, use it

      const tsPath = resolved.replace(/\.js$/, '.ts');
      if (fs.existsSync(tsPath)) return tsPath;

      const tsxPath = resolved.replace(/\.js$/, '.tsx');
      if (fs.existsSync(tsxPath)) return tsxPath;

      return null;
    },
  };
}

export default defineConfig({
  plugins: [jsToTsResolvePlugin(), cjsToEsmPlugin()],
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.mjs', '.cjs'],
    alias: {
      '@backend': path.resolve(__dirname, './'),
      '@/shared': path.resolve(__dirname, '../shared'),
      '@': path.resolve(__dirname, '../'),
    },
  },
  test: {
    root: __dirname,
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      '**/__tests__/**/*.test.{ts,js}',
      '**/*.test.{ts,js}',
      '**/*.spec.{ts,js}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.legacy.js',
      '**/*.tmp',
      // These integration tests hang due to unmocked transitive imports in socketTestHelper
      '**/__tests__/integration/gameFlow.test.js',
      '**/__tests__/integration/gameHandlersSplit.test.js',
    ],
    testTimeout: 30000,
    pool: 'forks',
    // Root cause of the chronic backend flakiness (uv_thread_create aborts,
    // pino thread-stream EAGAIN, whole-file crashes): pool defaults to
    // one fork per CPU — 48 on the nightly box against a pids.max=1000
    // cgroup. Cap workers like the frontend config does.
    maxWorkers: 4,
    fileParallelism: true,
    clearMocks: true,
    restoreMocks: false,
    hookTimeout: 30000,
    teardownTimeout: 30000,
  },
});
