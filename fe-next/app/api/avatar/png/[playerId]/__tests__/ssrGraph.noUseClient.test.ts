/**
 * /api/avatar/png renders AvatarRendererSsr inside a route handler — the
 * react-server layer. A 'use client' module anywhere in that static import
 * graph arrives there as a client reference instead of the real export. The
 * avatar contexts are 'use client' (they must be — avatarSsrContextBoundary
 * .test.tsx), and while the SSR renderer reached them, `.Provider` was
 * undefined and EVERY PNG 404'd ("render error: Element type is invalid"),
 * so the home top bar showed an empty disc for every player (2026-09-19).
 *
 * vitest has no react-server layer, so a render test passes either way. This
 * walks the real static import graph instead.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const ENTRY = path.join(ROOT, 'components', 'avatar', 'AvatarRendererSsr.tsx');

function resolve(spec: string, from: string): string | null {
  if (!spec.startsWith('.') && !spec.startsWith('@/')) return null; // node_modules
  const base = spec.startsWith('@/') ? path.join(ROOT, spec.slice(2)) : path.resolve(path.dirname(from), spec);
  for (const c of [base, `${base}.tsx`, `${base}.ts`, path.join(base, 'index.tsx'), path.join(base, 'index.ts')]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

/** Every file reachable through value `import … from` / `export … from`. */
function graph(entry: string): string[] {
  const seen = new Set([entry]);
  const queue = [entry];
  while (queue.length) {
    const file = queue.shift()!;
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/^\s*(?:import|export)\s+(?!type\b)[\s\S]*?\s*from\s*['"]([^'"]+)['"]/gm)) {
      const r = resolve(m[1], file);
      if (r && !seen.has(r)) {
        seen.add(r);
        queue.push(r);
      }
    }
  }
  return [...seen];
}

const isClientModule = (f: string) =>
  /^\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*['"]use client['"]/.test(readFileSync(f, 'utf8'));

describe('AvatarRendererSsr import graph (react-server safe)', () => {
  it('actually walks the part library', () => {
    const files = graph(ENTRY).map((f) => path.relative(ROOT, f));
    expect(files).toContain(path.join('components', 'avatar', 'avatarRenderValues.ts'));
    expect(files.filter((f) => f.includes(`${path.sep}parts${path.sep}`)).length).toBeGreaterThan(10);
  });

  it("contains no 'use client' module", () => {
    expect(graph(ENTRY).filter(isClientModule).map((f) => path.relative(ROOT, f))).toEqual([]);
  });

  it('the guard can see a client module (the contexts)', () => {
    // Without this, a regex that never matches would pass the test above forever.
    expect(isClientModule(path.join(ROOT, 'components', 'avatar', 'AvatarUidContext.tsx'))).toBe(true);
  });
});
