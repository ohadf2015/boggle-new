import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, basename, dirname, resolve } from 'path';

/**
 * Celebratory education UI must not sit in any page's first-load bundle.
 *
 * This guard has been wrong twice, the same way each time: it checked what the
 * author already knew about instead of deriving its input from the tree.
 *   - v1 named three files, so a fourth consumer (`AdventureEffectsLayer.tsx`)
 *     was invisible.
 *   - v2 scanned for `import … from` only, so `export { X } from` in
 *     `components/education/index.ts` and `components/education/duels/index.ts`
 *     was invisible — and a barrel re-export is exactly as static as an import.
 *     Three pages pulled these components in without rendering them.
 *
 * So the final test walks the real static import graph. `next/dynamic` is the
 * only way a lazy-only component may be reached.
 */

const ROOT = join(__dirname, '..', '..', '..');

/** Event-only components that must always be reached through `next/dynamic`. */
const LAZY_ONLY = ['LevelUpCelebration', 'DuelChallengeModal'];

const SCANNED_TREES = ['app', 'components'];

/** Pages the barrels used to drag these components into. */
const PAGES_UNDER_GUARD = [
  'app/[locale]/student/profile/PageClient.tsx',
  'app/[locale]/education/duels/PageClient.tsx',
  'app/[locale]/education/duels/[duelId]/PageClient.tsx',
  'app/[locale]/student/lessons/[id]/PageClient.tsx',
];

/**
 * Comments are not code. Without this, a comment explaining why a class or an
 * import was changed counts as a violation of the very rule it documents.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      out.push(...sourceFiles(full));
      continue;
    }
    if (!/\.tsx?$/.test(entry) || entry.includes('.test.')) continue;
    out.push(full);
  }
  return out;
}

/**
 * Static VALUE dependencies: `import … from` AND `export … from`. A barrel
 * re-export is as static as an import and pulls the module into the same chunk.
 * `import type` / `export type` are excluded — they are erased at compile time
 * and cost no bytes, which is why importing `LevelUpPayload` as a type is fine.
 */
const STATIC_DEP = /^[ \t]*(?:import|export)\s+(?!type\b)[^;]*?\bfrom\s+['"]([^'"]+)['"]/gm;

function staticSpecifiers(source: string): string[] {
  return [...stripComments(source).matchAll(STATIC_DEP)].map(m => m[1]);
}

/** Resolve a specifier to a file in this repo, or null if external. */
function resolveSpecifier(specifier: string, fromFile: string): string | null {
  let base: string;
  if (specifier.startsWith('@/')) base = join(ROOT, specifier.slice(2));
  else if (specifier.startsWith('.')) base = resolve(dirname(fromFile), specifier);
  else return null;

  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Every file reachable from `entry` through static value imports/re-exports. */
function staticGraph(entry: string): Set<string> {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    let source: string;
    try {
      source = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const specifier of staticSpecifiers(source)) {
      const resolved = resolveSpecifier(specifier, file);
      if (resolved && !seen.has(resolved)) queue.push(resolved);
    }
  }
  return seen;
}

function isLazyOnlyModule(file: string): string | null {
  const name = basename(file).replace(/\.tsx?$/, '');
  return LAZY_ONLY.includes(name) && file.includes('/components/education/') ? name : null;
}

describe('event-only education UI is always loaded lazily', () => {
  it('is never reached by a static import or a barrel re-export, from any page', () => {
    const violations: string[] = [];
    for (const page of PAGES_UNDER_GUARD) {
      const entry = join(ROOT, page);
      expect(existsSync(entry), `${page} should exist`).toBe(true);
      for (const file of staticGraph(entry)) {
        const component = isLazyOnlyModule(file);
        if (component) violations.push(`${page} statically reaches ${component}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('has no static value import or re-export of a lazy-only component anywhere in app/ or components/', () => {
    const sites: string[] = [];
    for (const tree of SCANNED_TREES) {
      for (const file of sourceFiles(join(ROOT, tree))) {
        if (isLazyOnlyModule(file)) continue; // the module itself
        for (const specifier of staticSpecifiers(readFileSync(file, 'utf8'))) {
          const resolved = resolveSpecifier(specifier, file);
          const component = resolved ? isLazyOnlyModule(resolved) : null;
          if (component) sites.push(`${relative(ROOT, file)} -> ${component} ('${specifier}')`);
        }
      }
    }
    expect(sites).toEqual([]);
  });

  it('every consumer reaches it through next/dynamic with ssr disabled', () => {
    const consumers: string[] = [];
    for (const tree of SCANNED_TREES) {
      for (const file of sourceFiles(join(ROOT, tree))) {
        const source = readFileSync(file, 'utf8');
        for (const component of LAZY_ONLY) {
          // Skip the component's own module, in EITHER tree: there is a separate,
          // unrelated `components/animations/LevelUpCelebration.tsx` that renders
          // its own default export, and it is already dynamic at its call site.
          if (basename(file).replace(/\.tsx?$/, '') === component) continue;
          if (!new RegExp(String.raw`<${component}[\s/>]`).test(source)) continue;
          consumers.push(relative(ROOT, file));
          expect(source, `${relative(ROOT, file)} renders ${component}`).toMatch(
            new RegExp(String.raw`const ${component} = dynamic\(`)
          );
          expect(source, `${relative(ROOT, file)} renders ${component}`).toMatch(/ssr:\s*false/);
        }
      }
    }
    // Guard against the scan silently matching nothing and passing.
    expect(consumers.length).toBeGreaterThanOrEqual(4);
  });
});

describe('student lesson page — first-load bundle', () => {
  const source = readFileSync(join(ROOT, 'app/[locale]/student/lessons/[id]/PageClient.tsx'), 'utf8');

  it('does not import the education barrel', () => {
    expect(source).not.toMatch(/from\s+'@\/components\/education'/);
  });

  it('imports the at-rest education UI directly from its module', () => {
    expect(source).toMatch(/from\s+'@\/components\/education\/PracticeSessionProvider'/);
    expect(source).toMatch(/from\s+'@\/components\/education\/XpProgressBar'/);
    expect(source).toMatch(/from\s+'@\/components\/education\/StreakBonusIndicator'/);
  });
});
