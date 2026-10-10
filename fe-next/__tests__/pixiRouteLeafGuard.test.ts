import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';

/**
 * GUARD: no `[locale]` route ships Pixi in its first-load JS.
 * Walks the STATIC import graph (what webpack puts in a route's entry chunks)
 * from every page/layout segment file; `import()` / `next/dynamic` boundaries
 * are not followed, so a Pixi module is only reachable behind one of those.
 */

const ROOT = join(__dirname, '..');
const LOCALE_APP = join(ROOT, 'app', '[locale]');
const SEGMENT_FILE = /^(page|layout|template|loading|error|not-found|default)\.(tsx|ts|jsx|js)$/;
const PIXI = /^(pixi\.js|@pixi\/)/;
// Admin-only preview (`notFound()` for everyone else).
const ALLOWED_ROUTES = ['blast/v2'];

const EXTS = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '/index.ts', '/index.tsx', '/index.js'];
const IMPORT_RE = /(?:^|[\n;])\s*(import|export)\s+(type\s+)?([^'";]*?\sfrom\s+)?['"]([^'"\n]+)['"]/g;

function segmentFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) segmentFiles(full, out);
    else if (SEGMENT_FILE.test(name)) out.push(full);
  }
  return out;
}

function resolveSpec(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = join(ROOT, spec.slice(2));
  else if (spec.startsWith('.')) base = resolve(dirname(from), spec);
  else return null;
  for (const b of [base, base.replace(/\.js$/, '')]) {
    for (const e of EXTS) {
      const p = b + e;
      if (existsSync(p) && statSync(p).isFile()) return p;
    }
  }
  return null;
}

const typeOnlyClause = (clause: string) => {
  const braces = clause.match(/^\s*\{([^}]*)\}\s*from\s*$/);
  return !!braces && braces[1].split(',').map((s) => s.trim()).filter(Boolean).every((s) => s.startsWith('type '));
};

const edges = new Map<string, { local: string[]; pixi: boolean }>();
function edgesOf(file: string) {
  let e = edges.get(file);
  if (e) return e;
  e = { local: [], pixi: false };
  edges.set(file, e);
  if (!/\.(tsx?|jsx?|mjs)$/.test(file)) return e;
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(IMPORT_RE)) {
    const [, , typeKw, clause, spec] = m;
    if (typeKw || (clause && typeOnlyClause(clause))) continue;
    if (PIXI.test(spec)) { e.pixi = true; continue; }
    const r = resolveSpec(file, spec);
    if (r) e.local.push(r);
  }
  return e;
}

function pixiChain(entry: string): string[] | null {
  const prev = new Map<string, string | null>([[entry, null]]);
  const queue = [entry];
  while (queue.length) {
    const f = queue.shift()!;
    const e = edgesOf(f);
    if (e.pixi) {
      const chain: string[] = [];
      for (let c: string | null | undefined = f; c; c = prev.get(c)) chain.unshift(relative(ROOT, c));
      return chain;
    }
    for (const n of e.local) if (!prev.has(n)) { prev.set(n, f); queue.push(n); }
  }
  return null;
}

describe('pixi route-leaf guard', () => {
  it('no [locale] route statically reaches pixi.js', () => {
    const offenders: string[] = [];
    for (const entry of segmentFiles(LOCALE_APP)) {
      const route = relative(LOCALE_APP, dirname(entry)).split('/').filter((s) => !/^\(.*\)$/.test(s)).join('/');
      if (ALLOWED_ROUTES.some((r) => route === r || route.startsWith(`${r}/`))) continue;
      const chain = pixiChain(entry);
      if (chain) offenders.push(chain.join(' -> '));
    }
    expect(offenders).toEqual([]);
  });

  it('detects a static chain (self-check on the parser)', () => {
    expect(PIXI.test('pixi.js')).toBe(true);
    expect(typeOnlyClause('{ type Application, type Container } from ')).toBe(true);
    expect(typeOnlyClause('{ type Application, Container } from ')).toBe(false);
  });
});
