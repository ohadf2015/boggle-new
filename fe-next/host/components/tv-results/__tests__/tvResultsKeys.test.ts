import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { en } from '../../../../translations/en';
import { he } from '../../../../translations/he';
import { sv } from '../../../../translations/sv';
import { ja } from '../../../../translations/ja';
import { es } from '../../../../translations/es';
import { ru } from '../../../../translations/ru';

const LOCALES = { en, he, sv, ja, es, ru } as Record<string, unknown>;
const DIR = join(__dirname, '..');
const FILES = readdirSync(DIR).filter((f) => /\.tsx?$/.test(f) && f !== 'ClassroomTvResultsScreen.tsx');

const resolve = (bundle: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), bundle);

describe('every key the results wall prints exists in every locale', () => {
  const keys = new Set<string>(['tvResults.roundOf', 'tvResults.wpm']);
  for (const file of FILES) {
    for (const m of readFileSync(join(DIR, file), 'utf8').matchAll(/['`]((?:tvResults|results)\.[\w.]+)['`]/g)) keys.add(m[1]);
  }
  for (const [lang, bundle] of Object.entries(LOCALES)) {
    it(lang, () => {
      const missing = [...keys].filter((k) => typeof resolve(bundle, k) !== 'string');
      expect(missing).toEqual([]);
    });
  }
});
