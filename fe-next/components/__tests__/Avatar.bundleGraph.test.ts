/**
 * Bundle-graph guard for the avatar SVG part library.
 *
 * `components/avatar/parts/*` is ~8300 lines of inline SVG path data that
 * minifies to a single 464kB module (91kB gzipped). `AvatarRenderer` looks the
 * parts up dynamically (`HAIR_PARTS[config.hair]`), so webpack cannot tree-shake
 * it — whatever route reaches it ships every part of every category.
 *
 * `Avatar` is rendered from the global header, so a *static* import chain from
 * `Avatar` to the parts put those 91kB on the shared chunk of all 226 routes,
 * including pages with no avatar at all (`/legal`, `/about`, the SEO landings).
 * Measured on production 2026-08-07: `65990-*.js` was a `<script async>` on
 * `/en/legal`, `/en/about` and `/en/practice/classic`.
 *
 * The renderer must therefore be reached through `next/dynamic` (a lazy
 * `import()`), never a top-level `import`. This walks the real static import
 * graph to assert that.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');

/** Top-level value imports only — `import type` erases, `import()` is lazy. */
function staticImportsOf(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  const specs: string[] = [];
  for (const m of src.matchAll(/^\s*import\s+(?!type\b)([\s\S]*?)\s*from\s*['"]([^'"]+)['"]/gm)) {
    // `import { type A, B }` still pulls B; `import { type A }` alone does not.
    const clause = m[1];
    if (/^\{[\s\S]*\}$/.test(clause.trim())) {
      const named = clause.replace(/^\{|\}$/g, '').split(',');
      if (named.every((n) => !n.trim() || /^type\s/.test(n.trim()))) continue;
    }
    specs.push(m[2]);
  }
  return specs;
}

function resolve(spec: string, fromFile: string): string | null {
  if (!spec.startsWith('.') && !spec.startsWith('@/')) return null; // node_modules
  const base = spec.startsWith('@/')
    ? path.join(ROOT, spec.slice(2))
    : path.resolve(path.dirname(fromFile), spec);
  for (const cand of [base, `${base}.tsx`, `${base}.ts`, path.join(base, 'index.tsx'), path.join(base, 'index.ts')]) {
    if (existsSync(cand) && !cand.endsWith(path.sep)) {
      try {
        if (readFileSync(cand)) return cand;
      } catch {
        /* directory — keep looking */
      }
    }
  }
  return null;
}

/** Every file statically reachable from `entry`, plus the path that got there. */
function staticGraph(entry: string): Map<string, string[]> {
  const seen = new Map<string, string[]>([[entry, [entry]]]);
  const queue = [entry];
  while (queue.length) {
    const file = queue.shift()!;
    const trail = seen.get(file)!;
    for (const spec of staticImportsOf(file)) {
      const next = resolve(spec, file);
      if (!next || seen.has(next)) continue;
      seen.set(next, [...trail, next]);
      queue.push(next);
    }
  }
  return seen;
}

describe('Avatar bundle graph', () => {
  const entry = path.join(ROOT, 'components', 'Avatar.tsx');

  it('does not statically reach the avatar SVG part library', () => {
    const graph = staticGraph(entry);
    const offenders = [...graph.keys()].filter((f) =>
      f.includes(path.join('components', 'avatar', 'parts')),
    );

    const trail = offenders.length
      ? graph
          .get(offenders[0])!
          .map((f) => path.relative(ROOT, f))
          .join('\n  → ')
      : '';

    expect(
      offenders.map((f) => path.relative(ROOT, f)),
      `Avatar statically pulls the SVG part library onto every route's shared chunk.\n  ${trail}`,
    ).toEqual([]);
  });

  it('still reaches AvatarRenderer lazily', () => {
    const src = readFileSync(entry, 'utf8');
    expect(src).toMatch(/import\(\s*['"][^'"]*avatar\/AvatarRenderer['"]\s*\)/);
  });
});
