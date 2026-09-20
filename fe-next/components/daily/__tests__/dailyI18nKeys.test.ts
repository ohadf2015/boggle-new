/**
 * Every literal `t('some.key')` in the daily surface must resolve in ALL six locales.
 *
 * This bug class cost this gauntlet four rounds: a string added at `dailyStreak.foo` while the
 * component calls `t('foo')` renders the literal key on screen, and grep, the served-bundle check,
 * and the component's own tests all pass — component tests usually mock `t` as an identity function,
 * so `t('anything')` returns something truthy and the assertion succeeds.
 *
 * Only resolving the dotted path against the real dictionaries catches it. Dynamic keys
 * (template literals, variables) are skipped — they cannot be checked statically.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
const ROOTS = ['components/daily', 'components/growth', 'components/streaks'];
const T_CALL = /\bt\(\s*['"]([A-Za-z0-9_][A-Za-z0-9_.\-]*)['"]/g;

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      walk(full, out);
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function loadDictionary(locale: string): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require(`../../../translations/${locale}.js`);
  const root = (mod.default ?? mod) as Record<string, unknown>;
  return ((root[locale] as Record<string, unknown>) ?? root);
}

function resolve(dict: Record<string, unknown>, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>((acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined), dict);
}

const dictionaries = Object.fromEntries(LOCALES.map((l) => [l, loadDictionary(l)]));

const usages = ROOTS.flatMap((root) => walk(root)).flatMap((file) => {
  const src = readFileSync(file, 'utf8');
  return [...src.matchAll(T_CALL)].map((m) => ({ file, key: m[1] }));
});

describe('daily surface translation keys resolve in every locale', () => {
  it('finds t() call sites to check (guards against the regex silently matching nothing)', () => {
    expect(usages.length).toBeGreaterThan(20);
  });

  for (const locale of LOCALES) {
    it(`resolves every literal t() key in ${locale}`, () => {
      const missing = usages
        .filter(({ key }) => typeof resolve(dictionaries[locale], key) !== 'string')
        .map(({ file, key }) => `${key}  (called in ${file})`);
      const unique = [...new Set(missing)].sort();
      expect(unique, `Unresolved in ${locale}.js — these render as the raw key on screen:\n${unique.join('\n')}`).toEqual([]);
    });
  }
});
