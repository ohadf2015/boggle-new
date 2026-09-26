/**
 * EntryScreen's own chunk group must hold no async loader.
 *
 * MpPhaseRouter renders EntryScreen through next/dynamic with ssr:true, so the
 * server writes a <link rel="preload"> for every file of its
 * react-loadable-manifest entry. Turbopack dev (Next 16.2.6) names any chunk
 * of that group that carries an async loader (a nested dynamic() / import())
 * differently in the manifest than on disk. The preload then 404s, and
 * utils/chunkBootGuard.ts reads a failed /_next/static/ load as a stale deploy
 * and hard-reloads with ?_lc_chunk. Every cold /multiplayer visit loaded twice
 * and logged two 404s. Measured 2026-09-26: the phantom chunk held exactly the
 * three loaders this walk found (HowToPlay, EntryAvatarBuilder, and the lazy
 * AvatarRenderer inside components/Avatar).
 *
 * The rule: a module that only the entry reaches may not contain import().
 * The entry's lazy islands are declared in entryLazy.tsx, and entryChrome.ts,
 * which the page itself imports, pulls that module into the route's chunk
 * group, where the loaders are already available when EntryScreen loads.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const CODE = /\.(tsx?|jsx?|mjs)$/;

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
}

/** Value imports and re-exports (type-only ones erase), plus bare side-effect imports. */
function importsOf(file: string): string[] {
  const src = stripComments(readFileSync(file, 'utf8'));
  const specs: string[] = [];
  for (const m of src.matchAll(/^\s*(?:import|export)\s+(?!type\b)([^;]*?)\s+from\s*['"]([^'"]+)['"]/gm)) {
    const clause = m[1].trim();
    if (/^\{[\s\S]*\}$/.test(clause)) {
      const named = clause.replace(/^\{|\}$/g, '').split(',');
      if (named.every((n) => !n.trim() || /^type\s/.test(n.trim()))) continue;
    }
    specs.push(m[2]);
  }
  for (const m of src.matchAll(/^\s*import\s*['"]([^'"]+)['"]/gm)) specs.push(m[1]);
  return specs;
}

function resolve(spec: string, fromFile: string): string | null {
  if (!spec.startsWith('.') && !spec.startsWith('@/')) return null; // node_modules
  const base = spec.startsWith('@/')
    ? path.join(ROOT, spec.slice(2))
    : path.resolve(path.dirname(fromFile), spec);
  for (const cand of [base, `${base}.tsx`, `${base}.ts`, `${base}.js`, path.join(base, 'index.tsx'), path.join(base, 'index.ts')]) {
    if (existsSync(cand) && statSync(cand).isFile()) return CODE.test(cand) ? cand : null;
  }
  return null;
}

/** Every module statically reachable from `entry`, with the trail that reached it. */
function staticGraph(entry: string): Map<string, string[]> {
  const seen = new Map<string, string[]>([[entry, [entry]]]);
  const queue = [entry];
  while (queue.length) {
    const file = queue.shift()!;
    for (const spec of importsOf(file)) {
      const next = resolve(spec, file);
      if (!next || seen.has(next)) continue;
      seen.set(next, [...seen.get(file)!, next]);
      queue.push(next);
    }
  }
  return seen;
}

const rel = (file: string) => path.relative(ROOT, file);
const ENTRY = path.join(ROOT, 'components/multiplayer/entry/EntryScreen.tsx');
const PAGE = path.join(ROOT, 'app/[locale]/multiplayer/PageClient.tsx');
const LAZY = path.join(ROOT, 'components/multiplayer/entry/entryLazy.tsx');
const CHROME = path.join(ROOT, 'components/multiplayer/entry/entryChrome.ts');

describe("EntryScreen's chunk group (SSR'd next/dynamic entry)", () => {
  const entryGraph = staticGraph(ENTRY);
  const pageGraph = staticGraph(PAGE);
  const entryOnly = [...entryGraph.keys()].filter((f) => !pageGraph.has(f));

  it('walks a real graph (guards the walker itself)', () => {
    expect(entryGraph.has(path.join(ROOT, 'components/multiplayer/MultiplayerFlow.tsx'))).toBe(true);
    expect(entryGraph.has(path.join(ROOT, 'components/multiplayer/AvatarStack.tsx'))).toBe(true);
    expect(pageGraph.has(CHROME)).toBe(true);
    expect(entryOnly.length).toBeGreaterThan(10);
  });

  it('no module only the entry reaches holds an async import()', () => {
    const offenders = entryOnly.filter((f) =>
      /\bimport\s*\(/.test(stripComments(readFileSync(f, 'utf8'))),
    );
    const trails = offenders.map((f) => entryGraph.get(f)!.map(rel).join(' → '));
    expect(offenders.map(rel), `async loaders inside the entry chunk group:\n  ${trails.join('\n  ')}`).toEqual([]);
  });

  it("the entry's lazy islands are hoisted into the route chunk group by entryChrome", () => {
    expect(existsSync(LAZY)).toBe(true);
    expect(importsOf(CHROME)).toContain('./entryLazy');
    expect(pageGraph.has(LAZY)).toBe(true);
  });

  it('the lazy islands stay client-only and lazy', () => {
    const src = readFileSync(LAZY, 'utf8');
    expect(src.startsWith("'use client';")).toBe(true);
    expect(src).toMatch(/import\(\s*['"]@\/components\/HowToPlay['"]\s*\)/);
    expect(src).toMatch(/import\(\s*['"]\.\/EntryAvatarBuilder['"]\s*\)/);
    expect(src.match(/ssr:\s*false/g)?.length).toBe(2);
  });
});
