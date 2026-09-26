/**
 * mpUi.round — resolved through the real imported bundles (never grep: sv.js
 * once carried a duplicate top-level key). Every locale has exactly en's key
 * set, non-empty strings, and the same {placeholders}.
 */
import { en } from '@/translations/en.js';
import { he } from '@/translations/he.js';
import { sv } from '@/translations/sv.js';
import { ja } from '@/translations/ja.js';
import { es } from '@/translations/es.js';
import { ru } from '@/translations/ru.js';
import { roundModeMeta } from '../roundModes';

type Tree = Record<string, unknown>;
const leaves = (o: Tree, prefix = ''): Record<string, unknown> =>
  Object.entries(o).reduce<Record<string, unknown>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(acc, leaves(v as Tree, key));
    else acc[key] = v;
    return acc;
  }, {});
const params = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
const round = (b: unknown) => ((b as Tree).mpUi as Tree).round as Tree;

const EN = leaves(round(en));

describe('mpUi.round translations', () => {
  it('en is populated (not the empty seed)', () => {
    expect(Object.keys(EN).length).toBeGreaterThan(20);
  });

  it('every live mode resolves a name + rule key that exists in en', () => {
    for (const m of ['classic', 'blast', 'word-hunt', 'wheel-rush', 'word-tower', 'sealed-bid', 'crossword', 'random', null]) {
      const meta = roundModeMeta(m);
      expect(EN[meta.nameKey.replace('mpUi.round.', '')], meta.nameKey).toEqual(expect.any(String));
      expect(EN[meta.ruleKey.replace('mpUi.round.', '')], meta.ruleKey).toEqual(expect.any(String));
    }
  });

  describe.each(Object.entries({ en, he, sv, ja, es, ru }))('%s', (locale, bundle) => {
    const L = leaves(round(bundle));

    it('has exactly the en key set', () => {
      expect(Object.keys(L).sort()).toEqual(Object.keys(EN).sort());
    });

    it('every value is a non-empty string with en placeholders', () => {
      for (const [k, v] of Object.entries(EN)) {
        expect(typeof L[k], `${locale} ${k}`).toBe('string');
        expect((L[k] as string).trim().length, `${locale} ${k}`).toBeGreaterThan(0);
        expect(params(L[k] as string), `${locale} ${k}`).toEqual(params(v as string));
      }
    });

    it('is a real translation outside en', () => {
      if (locale === 'en') return;
      expect(L['mode.wordHunt.rule']).not.toBe(EN['mode.wordHunt.rule']);
      expect(L.getReady).not.toBe(EN.getReady);
    });
  });
});
