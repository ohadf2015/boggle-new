import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { es } from '@/translations/es';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';

type Tree = { [k: string]: string | Tree };
const flat = (o: Tree, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? flat(v, `${p}${k}.`) : [`${p}${k}`]));
const overview = (l: unknown) => (l as { education: { analytics: { overview: Tree } } }).education.analytics.overview;

describe('class overview translations', () => {
  it('Given the six locales, Then each carries the same overview keys as English', () => {
    const ref = flat(overview(en)).sort();
    expect(ref.length).toBeGreaterThan(20);
    for (const l of [he, es, sv, ja, ru]) expect(flat(overview(l)).sort()).toEqual(ref);
  });
});
