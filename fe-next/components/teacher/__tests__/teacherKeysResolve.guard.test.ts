import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { es } from '@/translations/es';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const DIRS = ['components/teacher', 'app/[locale]/teacher'];
const LOCALES: Record<string, unknown> = { en, he, es, sv, ja, ru };
const CALL = /\bt\(\s*(['"])([a-zA-Z]\w*\.[\w.]+)\1/g;
const PENDING_I18N = new Set<string>();

const lookup = (tree: unknown, key: string) =>
  key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), tree);

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === '__tests__' ? [] : sources(full);
    return /\.tsx?$/.test(name) && !/\.test\./.test(name) ? [full] : [];
  });
}

describe('teacher translation keys resolve in every locale, single or double quoted', () => {
  const calls = DIRS.flatMap((d) => sources(path.join(ROOT, d))).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(CALL)].map((m) => ({ key: m[2], file: path.relative(ROOT, file) })),
  );

  it('scans a plausible number of calls', () => {
    expect(calls.length).toBeGreaterThan(1000);
  });

  it('finds no key missing from any locale', () => {
    const missing = calls
      .filter(({ key }) => !PENDING_I18N.has(key))
      .flatMap(({ key, file }) =>
        Object.entries(LOCALES)
          .filter(([, tree]) => typeof lookup(tree, key) !== 'string')
          .map(([locale]) => `${locale}: ${key} (${file})`),
      );
    expect([...new Set(missing)]).toEqual([]);
  });
});
