/**
 * The join screen builds its keys as `${K}.flow.x`, which the education-wide
 * guard (literal t('a.b') only) cannot see. Resolve them here in all six locales.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { es } from '@/translations/es';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';

const DIR = path.resolve(__dirname, '..');
const LOCALES: Record<string, unknown> = { en, he, es, sv, ja, ru };
const K = 'education.student.join';
const TEMPLATE = /`\$\{K\}\.([\w.]+)`/g;
const LITERAL = /'((?:eduStudent|education|eduLiveRoom|eg2Fix|joinView)\.[\w.]+)'/g;

const lookup = (tree: unknown, key: string) =>
  key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), tree);

describe('join screen keys resolve in every locale', () => {
  const keys = new Set<string>();
  for (const name of readdirSync(DIR).filter((n) => /\.tsx?$/.test(n))) {
    const src = readFileSync(path.join(DIR, name), 'utf8');
    for (const m of src.matchAll(TEMPLATE)) keys.add(`${K}.${m[1]}`);
    for (const m of src.matchAll(LITERAL)) if (m[1] !== K) keys.add(m[1]);
  }

  it('scans the join keys', () => {
    expect(keys.size).toBeGreaterThan(30);
  });

  it('finds every key as a string in every locale', () => {
    const missing = [...keys].flatMap((key) =>
      Object.entries(LOCALES)
        .filter(([, tree]) => typeof lookup(tree, key) !== 'string')
        .map(([locale]) => `${locale}: ${key}`),
    );
    expect(missing).toEqual([]);
  });
});
