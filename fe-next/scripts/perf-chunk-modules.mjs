#!/usr/bin/env node
/**
 * Break a built webpack chunk down into its individual modules, largest first.
 * Answers "what is actually making this chunk big" without a bundle-analyzer
 * dependency: prod chunks are `push([[id],{ <moduleId>: (e,t,r)=>{...}, ... }])`,
 * so the offsets of the module-id keys give each module's byte span.
 *
 * Module ids are numeric in prod, so each one also gets a content fingerprint
 * (the most distinctive strings it contains) to make it identifiable.
 *
 * Usage:
 *   node scripts/perf-chunk-modules.mjs 67917            # match by chunk id prefix
 *   node scripts/perf-chunk-modules.mjs 67917 --top 25
 */
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const [needle, ...rest] = process.argv.slice(2);
const top = rest.includes('--top') ? Number(rest[rest.indexOf('--top') + 1]) : 20;
// A concurrent `next build` in this shared repo regularly wipes .next mid-read,
// so allow pointing at a snapshot of already-shipped chunks instead.
const CHUNK_DIR = rest.includes('--dir')
  ? path.resolve(rest[rest.indexOf('--dir') + 1])
  : path.resolve(import.meta.dirname, '..', '.next', 'static', 'chunks');

if (!needle) {
  console.error('usage: perf-chunk-modules.mjs <chunk-id-or-filename> [--top N]');
  process.exit(1);
}

const file = readdirSync(CHUNK_DIR).find((f) => f === needle || f.startsWith(`${needle}-`) || f.startsWith(`${needle}.`));
if (!file) {
  console.error(`No chunk matching "${needle}" in ${CHUNK_DIR}`);
  process.exit(1);
}

const src = readFileSync(path.join(CHUNK_DIR, file), 'utf8');

/** Module-id keys look like `,123456:(e,t,r)=>{` or `{123456:e=>{` at the map top level. */
const KEY = /[,{](\d{2,8}):\(?(?:function)?\s*\(?[\w$,\s]*\)?\s*=>/g;
const marks = [];
for (let m; (m = KEY.exec(src)); ) marks.push({ id: m[1], start: m.index, bodyAt: m.index + m[0].length });
if (marks.length === 0) {
  console.error('No module boundaries found — webpack output shape changed.');
  process.exit(1);
}

const mods = marks.map((mk, i) => {
  const end = i + 1 < marks.length ? marks[i + 1].start : src.length;
  return { id: mk.id, size: end - mk.start, body: src.slice(mk.bodyAt, end) };
});

/** Pick the strings that best identify a module: longest distinctive literals. */
function fingerprint(body) {
  const named = body.match(/[A-Za-z@][\w@/.-]{6,45}(?=["'])/g) ?? [];
  const seen = new Map();
  for (const s of named) {
    if (/^[0-9a-f]{8,}$/.test(s)) continue;
    seen.set(s, (seen.get(s) ?? 0) + 1);
  }
  return [...seen]
    .sort((a, b) => b[0].length * b[1] - a[0].length * a[1])
    .slice(0, 4)
    .map(([s]) => s)
    .join(' · ');
}

mods.sort((a, b) => b.size - a.size);
const totalRaw = src.length;
const totalGz = gzipSync(Buffer.from(src), { level: 6 }).length;

console.log(`\n${file}`);
console.log(`${(totalRaw / 1024).toFixed(0)}kB raw / ${(totalGz / 1024).toFixed(0)}kB gz · ${mods.length} modules\n`);
console.log('   raw   share  moduleId  fingerprint');
for (const m of mods.slice(0, top)) {
  const pct = ((m.size / totalRaw) * 100).toFixed(1);
  console.log(
    `${(m.size / 1024).toFixed(0).padStart(5)}kB ${pct.padStart(5)}%  ${m.id.padEnd(8)}  ${fingerprint(m.body).slice(0, 110)}`,
  );
}
const shown = mods.slice(0, top).reduce((a, m) => a + m.size, 0);
console.log(`\ntop ${Math.min(top, mods.length)} = ${((shown / totalRaw) * 100).toFixed(0)}% of the chunk`);
