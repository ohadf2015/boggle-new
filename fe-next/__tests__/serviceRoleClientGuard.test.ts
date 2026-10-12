// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';

const ROOT = join(__dirname, '..');
const SERVICE_ROLE_MODULES = ['utils/supabase/admin.ts', 'lib/admin/server.ts'];
const SOURCE_DIRS = ['app', 'components', 'contexts', 'hooks', 'lib', 'utils', 'shared'];
const SKIP_DIRS = new Set(['node_modules', '__tests__', 'api', '.next']);

const EXTS = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '/index.ts', '/index.tsx', '/index.js'];
const IMPORT_RE = /(?:^|[\n;])\s*(import|export)\s+(type\s+)?([^'";]*?\sfrom\s+)?['"]([^'"\n]+)['"]|\bimport\(\s*['"]([^'"\n]+)['"]\s*\)/g;

function sourceFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { if (!SKIP_DIRS.has(name)) sourceFiles(full, out); }
    else if (/\.(tsx?|jsx?)$/.test(name) && !/\.(test|spec)\./.test(name)) out.push(full);
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

const edges = new Map<string, string[]>();
function edgesOf(file: string): string[] {
  let e = edges.get(file);
  if (e) return e;
  e = [];
  edges.set(file, e);
  if (!/\.(tsx?|jsx?|mjs)$/.test(file)) return e;
  for (const m of readFileSync(file, 'utf8').matchAll(IMPORT_RE)) {
    const [, , typeKw, clause, staticSpec, dynamicSpec] = m;
    if (typeKw || (clause && typeOnlyClause(clause))) continue;
    const r = resolveSpec(file, staticSpec ?? dynamicSpec);
    if (r) e.push(r);
  }
  return e;
}

const isClientEntry = (file: string) => /^\s*(['"])use client\1/.test(readFileSync(file, 'utf8'));
const forbidden = new Set(SERVICE_ROLE_MODULES.map((m) => join(ROOT, m)));

function chainToServiceRole(entry: string): string[] | null {
  const prev = new Map<string, string | null>([[entry, null]]);
  const queue = [entry];
  while (queue.length) {
    const f = queue.shift()!;
    if (forbidden.has(f)) {
      const chain: string[] = [];
      for (let c: string | null | undefined = f; c; c = prev.get(c)) chain.unshift(relative(ROOT, c));
      return chain;
    }
    for (const n of edgesOf(f)) if (!prev.has(n)) { prev.set(n, f); queue.push(n); }
  }
  return null;
}

describe('service-role Supabase client stays out of client bundles', () => {
  it('no "use client" module reaches the service-role factory', () => {
    const entries = SOURCE_DIRS.flatMap((d) => sourceFiles(join(ROOT, d))).filter(isClientEntry);
    expect(entries.length).toBeGreaterThan(100);
    const offenders = entries.map(chainToServiceRole).filter((c): c is string[] => !!c).map((c) => c.join(' -> '));
    expect(offenders).toEqual([]);
  });

  it('the public anon client lives apart from the service-role factory', () => {
    const anon = readFileSync(join(ROOT, 'utils/supabase/anon.ts'), 'utf8');
    expect(anon).not.toMatch(/SERVICE_ROLE/);
    expect(readFileSync(join(ROOT, 'lib/supabaseServer.ts'), 'utf8')).not.toMatch(/supabase\/admin/);
  });
});
