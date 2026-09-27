/**
 * Bundle the custom Express server with esbuild
 *
 * Produces dist/server.cjs — a single-file CJS bundle that replaces
 * the runtime tsx transpilation (`tsx server.ts`).
 *
 * External packages (resolved from node_modules at runtime):
 * - next (Next.js internals are complex, keep external)
 * - socket.io / ioredis / express / cors / compression (native or complex deps)
 * - @sentry/* (Sentry uses dynamic require)
 * - @supabase/* / @anthropic-ai/* / @google-cloud/* (complex SDKs)
 * - dotenv / node-cron (simple but easier external)
 *
 * Post-build: copies wordValidatorWorker.mjs and backend/*.txt into dist/
 */

import { build } from 'esbuild';
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { builtinModules } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

// All Node.js built-in modules (with and without node: prefix)
const nodeBuiltins = builtinModules.flatMap((m) => [m, `node:${m}`]);

// Packages to keep external (resolved from node_modules at runtime)
const externalPackages = [
  'next',
  'next/*',
  '@next/*',
  '@sentry/*',
  'socket.io',
  'socket.io-client',
  '@socket.io/*',
  'ioredis',
  'express',
  'cors',
  'compression',
  '@supabase/*',
  '@anthropic-ai/*',
  '@google-cloud/*',
  'google-auth-library',
  'google-auth-library/*',
  'dotenv',
  'dotenv/*',
  'node-cron',
  'an-array-of-english-words',
  'an-array-of-spanish-words',
  '@arvidbt/*',
  'bad-words',
  'resend',
  'ws',

  'zod',
  'zod/*',
  'sharp',
  'logrocket',
  // React/browser packages (should never be in server bundle)
  'react',
  'react/*',
  'react-dom',
  'react-dom/*',
  'framer-motion',
  'framer-motion/*',
  'remotion',
  'remotion/*',
  '@remotion/*',
];

// Plugin to externalize pre-compiled backend/dist/ schemas
// These are loaded dynamically at runtime via require()
const externalizeBackendDist = {
  name: 'externalize-backend-dist',
  setup(build) {
    // Match any import from backend/dist/ (compiled CJS schemas)
    build.onResolve({ filter: /[/\\]dist[/\\]backend[/\\]/ }, (args) => {
      return { path: args.path, external: true };
    });
  },
};

console.log('Bundling server.ts → dist/server.cjs ...');

await build({
  entryPoints: [join(root, 'server.ts')],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outfile: join(root, 'dist', 'server.cjs'),
  alias: {
    '@': root,
  },
  external: [...nodeBuiltins, ...externalPackages],
  plugins: [externalizeBackendDist],
  logLevel: 'info',
  minify: false, // Keep readable for debugging
  sourcemap: false,
  // Tree-shake unused exports
  treeShaking: true,
});

console.log('✓ dist/server.cjs built');

// ── Post-build: copy runtime files into dist/ ──────────────────────
const distDir = join(root, 'dist');
mkdirSync(distDir, { recursive: true });

// Copy wordValidatorWorker.mjs if it exists (optional worker thread acceleration)
const workerSrc = join(root, 'backend', 'modules', 'wordValidatorWorker.mjs');
try {
  copyFileSync(workerSrc, join(distDir, 'wordValidatorWorker.mjs'));
  console.log('✓ Copied wordValidatorWorker.mjs to dist/');
} catch {
  console.log('ℹ wordValidatorWorker.mjs not found, pool will use sync fallback');
}

// Copy all backend/*.txt dictionary files directly into dist/
// (esbuild CJS __dirname resolves to dist/ at runtime, and dictionary.ts
// uses path.join(__dirname, 'hebrew_words.txt') etc.)
const backendDir = join(root, 'backend');

const txtFiles = readdirSync(backendDir).filter((f) => f.endsWith('.txt'));
for (const file of txtFiles) {
  copyFileSync(join(backendDir, file), join(distDir, file));
}
console.log(`✓ Copied ${txtFiles.length} dictionary .txt files to dist/`);

// Copy backend/data/dateThemedWords.js
const dataDir = join(distDir, 'backend', 'data');
mkdirSync(dataDir, { recursive: true });
copyFileSync(
  join(backendDir, 'data', 'dateThemedWords.js'),
  join(dataDir, 'dateThemedWords.js')
);
console.log('✓ Copied dateThemedWords.js');

// Copy backend/dist/ (pre-compiled CJS schemas, loaded dynamically)
// The bundle has: require("../dist/backend/utils/schemas")
// From dist/server.cjs, "../dist/" resolves back to dist/ itself
// So we need schemas at dist/backend/utils/schemas.js
const schemasSrc = join(root, 'backend', 'dist');
if (existsSync(schemasSrc)) {
  // Copy the compiled output maintaining its internal structure
  // Original: backend/dist/backend/utils/schemas.js → dist/backend/utils/schemas.js
  // Original: backend/dist/shared/schemas/socketSchemas.js → dist/shared/schemas/socketSchemas.js
  const srcBackend = join(schemasSrc, 'backend');
  const srcShared = join(schemasSrc, 'shared');
  const srcTypes = join(schemasSrc, 'types');
  if (existsSync(srcBackend)) cpSync(srcBackend, join(distDir, 'backend'), { recursive: true, force: true });
  if (existsSync(srcShared)) cpSync(srcShared, join(distDir, 'shared'), { recursive: true, force: true });
  if (existsSync(srcTypes)) cpSync(srcTypes, join(distDir, 'types'), { recursive: true, force: true });
  console.log('✓ Copied compiled schemas into dist/');
} else {
  console.log('⚠ No backend/dist/ found (schemas not pre-compiled)');
}

console.log('\nDone! Start with: node dist/server.cjs');
