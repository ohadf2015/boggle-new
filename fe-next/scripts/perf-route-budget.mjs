#!/usr/bin/env node
/**
 * Per-route client JS report, straight from an existing `.next` build.
 * No rebuild, no bundle-analyzer dependency: Next 16 drops an
 * `app/**\/*_client-reference-manifest.js` per route entry, each listing every
 * client module the route pulls in and the chunk files those modules live in.
 * Summing the on-disk size of that chunk set is the route's client JS weight.
 *
 * Usage:
 *   node scripts/perf-route-budget.mjs                    # top 30 heaviest routes
 *   node scripts/perf-route-budget.mjs --all              # every route
 *   node scripts/perf-route-budget.mjs --json             # machine-readable
 *   node scripts/perf-route-budget.mjs --route /[locale]/daily/word-wheel/page
 */
import { readFileSync, statSync, existsSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

// Honour NEXT_BUILD_DIR like next.config.mjs does — a concurrent `next build` in
// this shared repo wipes `.next` mid-read, so perf builds go to their own dir.
const NEXT_DIR = path.resolve(import.meta.dirname, '..', process.env.NEXT_BUILD_DIR || '.next');
const APP_DIR = path.join(NEXT_DIR, 'server', 'app');
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const showAll = args.includes('--all');
const routeFilter = args.includes('--route') ? args[args.indexOf('--route') + 1] : null;

if (!existsSync(APP_DIR)) {
  console.error(`No build at ${NEXT_DIR}. Run \`npm run build\` first.`);
  process.exit(1);
}

/** gzip is what ships over the wire; raw is what the CPU parses. Both matter. */
const sizeCache = new Map();
function chunkSize(rel) {
  const cached = sizeCache.get(rel);
  if (cached) return cached;
  let out = { raw: 0, gz: 0 };
  try {
    const file = path.join(NEXT_DIR, rel);
    const buf = readFileSync(file);
    out = { raw: statSync(file).size, gz: gzipSync(buf, { level: 6 }).length };
  } catch {
    /* referenced but absent (e.g. a CSS entry) — count as 0 */
  }
  sizeCache.set(rel, out);
  return out;
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith('_client-reference-manifest.js')) yield full;
  }
}

/** The manifest is a JS assignment; pull the JSON payload back out of it. */
function parseManifest(file) {
  const src = readFileSync(file, 'utf8');
  const start = src.indexOf('=', src.indexOf('__RSC_MANIFEST[')) + 1;
  const json = src.slice(start).replace(/;\s*$/, '');
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const rows = [];
for (const file of walk(APP_DIR)) {
  const manifest = parseManifest(file);
  if (!manifest) continue;
  const route =
    '/' +
    path
      .relative(APP_DIR, file)
      .replace(/_client-reference-manifest\.js$/, '')
      .replace(/\/$/, '');
  const chunks = new Set();
  for (const mod of Object.values(manifest.clientModules ?? {})) {
    for (const c of mod.chunks ?? []) {
      // Older shapes interleave [id, path]; keep only real chunk paths.
      if (typeof c === 'string' && c.endsWith('.js')) chunks.add(c);
    }
  }
  for (const css of Object.values(manifest.entryCSSFiles ?? {}).flat()) {
    if (typeof css === 'string') chunks.add(css);
  }
  if (chunks.size === 0) continue;
  rows.push({ route, chunkSet: chunks, raw: 0, gz: 0, chunks: chunks.size });
}

if (rows.length === 0) {
  console.error('Parsed 0 routes — manifest shape changed. Inspect .next/server/app/**/*_client-reference-manifest.js');
  process.exit(1);
}

for (const r of rows) {
  let raw = 0;
  let gz = 0;
  for (const c of r.chunkSet) {
    const s = chunkSize(c);
    raw += s.raw;
    gz += s.gz;
  }
  r.raw = raw;
  r.gz = gz;
  r.chunks = r.chunkSet.size;
}

/**
 * Chunks nearly every route loads — the baseline no page can dodge. Exact-100%
 * is too brittle (a couple of bare routes skip the shell), so 95% is the cut.
 */
const freq = new Map();
for (const r of rows) for (const c of r.chunkSet) freq.set(c, (freq.get(c) ?? 0) + 1);
const SHARED_AT = rows.length * 0.95;
const shared = [...freq].filter(([, n]) => n >= SHARED_AT).map(([c]) => c);
const sharedGz = shared.reduce((a, c) => a + chunkSize(c).gz, 0);

const kb = (n) => `${(n / 1024).toFixed(0)}kB`;

if (routeFilter) {
  const row = rows.find((r) => r.route === routeFilter || r.route === `${routeFilter}/page`);
  if (!row) {
    console.error(`Unknown route ${routeFilter}. ${rows.length} routes parsed; try --all to list.`);
    process.exit(1);
  }
  const detail = [...row.chunkSet]
    .map((c) => ({ file: c, ...chunkSize(c), shared: freq.get(c) === rows.length }))
    .sort((a, b) => b.gz - a.gz);
  if (asJson) {
    console.log(JSON.stringify({ route: row.route, gz: row.gz, raw: row.raw, chunks: detail }, null, 2));
  } else {
    console.log(`\n${row.route} — ${kb(row.gz)} gz / ${kb(row.raw)} raw across ${row.chunks} chunks\n`);
    for (const c of detail) {
      console.log(`  ${kb(c.gz).padStart(7)} gz ${kb(c.raw).padStart(8)} raw ${c.shared ? '[shared]' : '        '} ${c.file}`);
    }
  }
  process.exit(0);
}

rows.sort((a, b) => b.gz - a.gz);
const shown = showAll ? rows : rows.slice(0, 30);

if (asJson) {
  console.log(
    JSON.stringify(
      { sharedGz, sharedChunks: shared.length, routes: rows.map(({ chunkSet, ...r }) => r) },
      null,
      2,
    ),
  );
  process.exit(0);
}

console.log(`\nClient JS by route — ${rows.length} routes, build ${readFileSync(path.join(NEXT_DIR, 'BUILD_ID'), 'utf8').trim()}`);
console.log(`Loaded by every route: ${kb(sharedGz)} gz across ${shared.length} chunks\n`);
console.log('     gz      raw  chunks  route');
for (const r of shown) {
  console.log(`${kb(r.gz).padStart(7)} ${kb(r.raw).padStart(8)} ${String(r.chunks).padStart(7)}  ${r.route}`);
}
if (!showAll && rows.length > shown.length) console.log(`\n… ${rows.length - shown.length} more (--all)`);
