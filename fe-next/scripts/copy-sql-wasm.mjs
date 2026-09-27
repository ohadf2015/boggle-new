// Copies the sql.js WASM binary into public/sql/ so the browser offline-dictionary
// validator can fetch /sql/sql-wasm.wasm. Without this the asset 404s and emscripten
// aborts, breaking offline word validation (seen in prod on /daily/word-wheel).
// Mirrors the build:dicts pattern (generated, gitignored under public/).
import { mkdirSync, copyFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
const destDir = join(root, 'public', 'sql');
const dest = join(destDir, 'sql-wasm.wasm');

if (!existsSync(src)) {
  // Loud failure — never silently ship without the wasm (recurring-pitfalls Class 4).
  throw new Error(`copy-sql-wasm: source not found at ${src}. Is sql.js installed?`);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);

const bytes = statSync(dest).size;
if (bytes < 1000) throw new Error(`copy-sql-wasm: dest looks truncated (${bytes} bytes)`);
console.log(`copy-sql-wasm: ${bytes} bytes -> public/sql/sql-wasm.wasm`);
