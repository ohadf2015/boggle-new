// Validate a built dist/ against portal requirements before zipping:
//  - index.html asset refs are RELATIVE (no leading "/") — CrazyGames/Poki reject absolute.
//  - file count <= 1500 (CrazyGames Basic Launch cap).
//  - report total size + largest file (Poki 8MB initial-download guidance).
// Exits non-zero on a hard failure so `npm run package` won't ship a bad build.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const errors = [];
const warnings = [];

let files;
try { files = walk(dist); } catch { console.error(`[validate] no dist/ — run build first`); process.exit(1); }

// 1. relative asset paths in index.html
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const absRefs = [...html.matchAll(/(?:src|href)="(\/[^"]*)"/g)].map((m) => m[1]);
if (absRefs.length) errors.push(`absolute asset refs in index.html (portals reject): ${absRefs.join(', ')}`);

// 2. file count
if (files.length > 1500) errors.push(`file count ${files.length} > 1500 (CrazyGames cap)`);

// 3. size report
const sizes = files.map((f) => ({ f: f.slice(dist.length + 1), b: statSync(f).size }));
const total = sizes.reduce((s, x) => s + x.b, 0);
const largest = sizes.sort((a, b) => b.b - a.b)[0];
const mb = (b) => (b / 1024 / 1024).toFixed(2) + 'MB';
if (total > 8 * 1024 * 1024) warnings.push(`total ${mb(total)} > 8MB — check Poki initial-download budget`);

console.log(`[validate] files=${files.length} total=${mb(total)} largest=${largest.f} (${mb(largest.b)})`);
for (const w of warnings) console.log(`[validate] WARN: ${w}`);
if (errors.length) { for (const e of errors) console.error(`[validate] FAIL: ${e}`); process.exit(1); }
console.log('[validate] OK — relative paths, within file-count cap.');
