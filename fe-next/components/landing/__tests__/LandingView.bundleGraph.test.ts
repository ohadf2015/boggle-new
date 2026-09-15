/**
 * First-paint JS budget guard for the homepage.
 *
 * Live www.lexiclash.live/en ships `/_next/static/chunks/65990-*.js` (477 KiB
 * raw) as a <script> on the landing HTML. That chunk is the avatar SVG part
 * library (AvatarRenderer + parts/*). Lighthouse 13.4.1 mobile attributes the
 * interactivity loss vs wordle.at to main-thread script eval; 65990 is the
 * largest first-party chunk after Sentry.
 *
 * next/dynamic({ ssr: false }) is NOT enough: webpack still emits the async
 * chunk as a script on the route. Anything the landing module graph can reach
 * via a static import OR a literal `import('...')` is therefore first-paint JS.
 * This walk follows both. Landing must not reach AvatarRenderer, avatar/parts,
 * AvatarBuilderModal, or even Avatar.tsx (Avatar.tsx itself import()s the
 * renderer).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..', '..');

function staticImportsOf(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  const specs: string[] = [];
  for (const m of src.matchAll(/^\s*import\s+(?!type\b)([\s\S]*?)\s*from\s*['"]([^'"]+)['"]/gm)) {
    const clause = m[1];
    if (/^\{[\s\S]*\}$/.test(clause.trim())) {
      const named = clause.replace(/^\{|\}$/g, '').split(',');
      if (named.every((n) => !n.trim() || /^type\s/.test(n.trim()))) continue;
    }
    specs.push(m[2]);
  }
  return specs;
}

function dynamicImportsOf(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  return [...src.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
}

function resolve(spec: string, fromFile: string): string | null {
  if (!spec.startsWith('.') && !spec.startsWith('@/')) return null;
  const base = spec.startsWith('@/')
    ? path.join(ROOT, spec.slice(2))
    : path.resolve(path.dirname(fromFile), spec);
  for (const cand of [base, `${base}.tsx`, `${base}.ts`, path.join(base, 'index.tsx'), path.join(base, 'index.ts')]) {
    if (existsSync(cand) && !cand.endsWith(path.sep)) {
      try {
        readFileSync(cand);
        return cand;
      } catch {
        /* directory */
      }
    }
  }
  return null;
}

function landingGraph(entry: string): Map<string, string[]> {
  const seen = new Map<string, string[]>([[entry, [entry]]]);
  const queue = [entry];
  while (queue.length) {
    const file = queue.shift()!;
    const trail = seen.get(file)!;
    const specs = [...staticImportsOf(file), ...dynamicImportsOf(file)];
    for (const spec of specs) {
      const next = resolve(spec, file);
      if (!next || seen.has(next)) continue;
      seen.set(next, [...trail, next]);
      queue.push(next);
    }
  }
  return seen;
}

function rel(file: string): string {
  return path.relative(ROOT, file);
}

describe('Landing first-paint JS graph', () => {
  const entry = path.join(ROOT, 'components', 'landing', 'LandingView.tsx');

  it('does not reach the avatar SVG part library or its renderer', () => {
    const graph = landingGraph(entry);
    const offenders = [...graph.keys()].filter((f) => {
      const r = rel(f);
      return (
        r.includes(path.join('components', 'avatar', 'parts')) ||
        r.endsWith(path.join('components', 'avatar', 'AvatarRenderer.tsx')) ||
        r.endsWith(path.join('components', 'avatar', 'AvatarBuilderModal.tsx')) ||
        r.endsWith(path.join('components', 'Avatar.tsx'))
      );
    });

    const trails = offenders
      .slice(0, 4)
      .map((f) => graph.get(f)!.map(rel).join('\n  → '))
      .join('\n\n');

    expect(
      offenders.map(rel),
      `Landing first-paint graph still pulls avatar SVG parts (chunk 65990).\n${trails}`,
    ).toEqual([]);
  });
});
