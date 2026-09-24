/**
 * Bundle guard for the 2026-09 art library (components/avatar/art).
 *
 * The existing guards (components/__tests__/Avatar.bundleGraph.test.ts,
 * LandingView.bundleGraph.test.ts) watch `components/avatar/parts`, which the
 * redraw deleted — they would now pass vacuously. This re-asserts the same
 * rule against the new location: first-paint surfaces reach the art only
 * lazily, and the pure avatar libs never pull it in. Also caps the art's
 * minified weight well under the old ~464 kB parts module.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const ART = path.join('components', 'avatar', 'art');

function staticImportsOf(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  const specs: string[] = [];
  for (const m of src.matchAll(/^\s*(?:import|export)\s+(?!type\b)([\s\S]*?)\s*from\s*['"]([^'"]+)['"]/gm)) {
    const clause = m[1].trim();
    if (/^\{[\s\S]*\}$/.test(clause)) {
      const named = clause.replace(/^\{|\}$/g, '').split(',');
      if (named.every(n => !n.trim() || /^type\s/.test(n.trim()))) continue;
    }
    specs.push(m[2]);
  }
  return specs;
}

function resolve(spec: string, from: string): string | null {
  if (!spec.startsWith('.') && !spec.startsWith('@/')) return null;
  const base = spec.startsWith('@/') ? path.join(ROOT, spec.slice(2)) : path.resolve(path.dirname(from), spec);
  for (const c of [`${base}.tsx`, `${base}.ts`, path.join(base, 'index.tsx'), path.join(base, 'index.ts'), base]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

function reaches(entry: string, needle: string): string[] | null {
  const seen = new Map<string, string[]>([[entry, [entry]]]);
  const queue = [entry];
  while (queue.length) {
    const file = queue.shift()!;
    for (const spec of staticImportsOf(file)) {
      const next = resolve(spec, file);
      if (!next || seen.has(next)) continue;
      const trail = [...seen.get(file)!, next];
      if (next.includes(needle)) return trail.map(f => path.relative(ROOT, f));
      seen.set(next, trail);
      queue.push(next);
    }
  }
  return null;
}

describe('avatar art bundle graph', () => {
  it.each([
    'components/Avatar.tsx',
    'components/AvatarLite.tsx',
    'lib/avatar/rarity.ts',
    'lib/avatar/unlocks.ts',
    'lib/avatar/legacyMap.ts',
    'shared/types/customAvatar.ts',
  ])('%s does not statically reach the art library', entry => {
    expect(reaches(path.join(ROOT, entry), ART)).toBeNull();
  });

  it('positive control: the renderer and the catalog DO reach it (the walk is not vacuous)', () => {
    expect(reaches(path.join(ROOT, 'components/avatar/AvatarRenderer.tsx'), ART)).not.toBeNull();
    expect(reaches(path.join(ROOT, 'lib/avatar/catalog.ts'), ART)).not.toBeNull();
  });

  it('the whole compositor minifies far below the old 464 kB parts module', () => {
    const esbuild = path.join(ROOT, 'node_modules', '.bin', 'esbuild');
    const out = execFileSync(esbuild, [
      path.join(ROOT, ART, 'AvatarArt.tsx'), '--bundle', '--minify', '--format=esm', '--jsx=automatic',
      `--tsconfig=${path.join(ROOT, 'tsconfig.json')}`, '--external:react', '--external:zod', '--log-level=error',
    ], { cwd: ROOT, maxBuffer: 16 * 1024 * 1024 });
    expect(out.length).toBeGreaterThan(20_000);
    expect(out.length).toBeLessThan(200_000);
  });
});
