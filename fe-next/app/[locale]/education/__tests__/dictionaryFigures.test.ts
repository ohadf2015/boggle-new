/**
 * Every dictionary number on an education page must come from the measured file.
 *
 * The first version of this copy was written from `wc -l` on the dictionary sources.
 * That is a different quantity from the one the sentence claims: the loader
 * normalises and dedups into a Set and merges the approved list. Russian's 1,415,065
 * lines are 1,347,105 real entries, so "over 1,400,000" was false on five locales of
 * two pages, and nothing in the suite could tell — the numbers were string literals.
 *
 * Now `scripts/measure-dictionaries.ts` writes `dictionaryStats.generated.json` and
 * `dictionaryFloor()` is the only way copy may print a size. This test closes the
 * loop from the other end: it scans the rendered content for ANY large number and
 * fails on one that is not a published floor. A literal cannot sneak back in.
 */
import { describe, it, expect } from 'vitest';
import {
  DICTIONARY_COUNTS,
  DICTIONARY_STATS_GENERATED_AT,
  allDictionaryFloors,
  dictionaryFloor,
  type DictionaryLang,
} from '@/lib/seo/dictionaryStats';
import { getVocabClassroomContent } from '../vocabulary-games-classroom/content';
import { getEslWordGamesContent } from '../esl-word-games/content';
import { getSightWordsContent } from '../sight-words-practice/content';

const LOCALES = ['en', 'he', 'es', 'sv', 'ja', 'ru'] as const;

/** Every string a locale build renders from its depth blocks. */
function depthText(locale: string): string {
  const parts: string[] = [];
  for (const get of [getVocabClassroomContent, getEslWordGamesContent]) {
    for (const s of get(locale).depth) parts.push(s.answer, ...s.points);
  }
  for (const s of getSightWordsContent(locale).depth) parts.push(s.answer, ...s.points);
  return parts.join('\n');
}

describe('the generated stats file', () => {
  it('carries a count for all six languages', () => {
    expect(Object.keys(DICTIONARY_COUNTS).sort()).toEqual(['en', 'es', 'he', 'ja', 'ru', 'sv']);
  });

  it('records when it was generated', () => {
    expect(DICTIONARY_STATS_GENERATED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('every published floor is at or below the measured count', () => {
    for (const lang of Object.keys(DICTIONARY_COUNTS) as DictionaryLang[]) {
      for (const locale of LOCALES) {
        const printed = dictionaryFloor(lang, locale);
        const asNumber = locale === 'ja'
          ? Number(printed.replace('万', '')) * 10_000
          : Number(printed.replace(/[^\d]/g, ''));
        expect(asNumber, `${lang} floor in ${locale}`).toBeLessThanOrEqual(DICTIONARY_COUNTS[lang]);
        expect(asNumber, `${lang} floor in ${locale}`).toBeGreaterThan(0);
      }
    }
  });
});

describe.each(LOCALES)('%s education copy', (locale) => {
  const text = depthText(locale);
  const allowed = new Set(allDictionaryFloors(locale));

  it('prints no large number that is not a published floor', () => {
    // Any run of 4+ digits, with the locale's own grouping separator, or a 万 figure.
    const pattern = locale === 'ja' ? /\d{1,4}万/g : /\d{1,3}(?:[,  ]\d{3})+/g;
    const found = text.match(pattern) ?? [];
    const stray = [...new Set(found)].filter((n) => !allowed.has(n));
    expect(stray, `not derived from dictionaryStats.generated.json`).toEqual([]);
  });

  it('actually prints dictionary figures (the scan is not vacuous)', () => {
    const printed = allDictionaryFloors(locale).filter((f) => text.includes(f));
    expect(printed.length).toBeGreaterThanOrEqual(5);
  });

  it('never states an exact count — floors only', () => {
    for (const lang of Object.keys(DICTIONARY_COUNTS) as DictionaryLang[]) {
      expect(text).not.toContain(String(DICTIONARY_COUNTS[lang]));
      expect(text).not.toContain(DICTIONARY_COUNTS[lang].toLocaleString('en-US'));
    }
  });
});
