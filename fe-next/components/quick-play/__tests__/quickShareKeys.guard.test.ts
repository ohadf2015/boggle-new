import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { es } from '@/translations/es';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';

type Tree = { [k: string]: string | Tree };
const LOCALES = { en, he, es, sv, ja, ru } as unknown as Record<string, Tree>;
const EMOJI = /\p{Extended_Pictographic}/u;
const FILES = ['quickShareText.ts', 'challengeShare.ts', 'QuickResultsNextActions.tsx'].map((f) =>
  path.resolve(__dirname, '..', f),
);

function resolve(tree: Tree, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node as Tree | undefined)?.[part], tree);
}

const KEYS = [
  ...new Set(
    FILES.flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(/'(quickPlay\.solo\.[\w.]+)'/g)].map((m) => m[1]),
    ),
  ),
];

describe('Quick Play share copy', () => {
  it('finds the keys it guards', () => {
    expect(KEYS).toEqual(expect.arrayContaining(['quickPlay.solo.recap.header', 'quickPlay.solo.copied']));
    expect(KEYS.length).toBeGreaterThan(12);
  });

  it.each(Object.keys(LOCALES))('resolves every share key in %s, with no emoji in the recap', (locale) => {
    const missing = KEYS.filter((k) => typeof resolve(LOCALES[locale], k) !== 'string');
    expect(missing).toEqual([]);
    const recap = resolve(LOCALES[locale], 'quickPlay.solo.recap') as Record<string, string>;
    for (const value of Object.values(recap)) expect(value).not.toMatch(EMOJI);
  });

  it.each(Object.keys(LOCALES))('keeps every placeholder of the English recap in %s', (locale) => {
    const enRecap = resolve(LOCALES.en, 'quickPlay.solo.recap') as Record<string, string>;
    const recap = resolve(LOCALES[locale], 'quickPlay.solo.recap') as Record<string, string>;
    for (const [key, value] of Object.entries(enRecap)) {
      const want = [...value.matchAll(/\{\w+\}/g)].map((m) => m[0]).sort();
      const got = [...recap[key].matchAll(/\{\w+\}/g)].map((m) => m[0]).sort();
      expect(got, `${locale} recap.${key}`).toEqual(want);
    }
  });
});
