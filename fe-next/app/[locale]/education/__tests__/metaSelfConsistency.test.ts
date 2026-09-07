/**
 * One page must not state two different language counts.
 *
 * Round 4 shipped `/ru/education` with `5 языках` in its meta description,
 * og:description and twitter:description while the H1, the JSON-LD and every body
 * block on the SAME page said six. Two guards ran over that string and both passed:
 * `educationClaims` did not scan the `seo.*` namespace, and both files' Russian
 * pattern knew only the genitive `языков`, never the prepositional `языках`.
 *
 * Those two holes are now closed, but closing holes one inflection at a time is how
 * this defect keeps coming back. This test asks a different question — not "is any
 * particular wrong string present" but "does this page agree with itself" — so it
 * catches the next variant without anyone having to predict its spelling.
 *
 * It reads the SHIPPED strings: the per-locale `content.ts` modules that
 * `generateMetadata` returns verbatim, and the `seo.educationHub.*` keys the hub's
 * metadata is built from. Importing `page.tsx` would drag the whole server component
 * tree into vitest for no extra truth — the metadata is these strings.
 */
import { describe, it, expect } from 'vitest';
import { locales } from '@/i18n/config';
import { getEslWordGamesContent } from '../esl-word-games/content';
import { getVocabClassroomContent } from '../vocabulary-games-classroom/content';
import { getGamesForTeachersContent } from '../games-for-teachers/content';
import { getForSchoolsContent } from '../for-schools/content';
import { getSightWordsContent } from '../sight-words-practice/content';
import { en } from '@/translations/en';
import { es } from '@/translations/es';
import { he } from '@/translations/he';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';
import { sv } from '@/translations/sv';

const REAL_COUNT = locales.length;

/**
 * Every "<n> <language-noun>" in the string, in any language we ship, returned as
 * numbers. Spelled-out numerals count: "five languages" is the same claim as "5".
 *
 * Japanese is matched without a separator and needs the `ほかの` / `他の` guard —
 * "the other 5 languages" is English plus five, which is six and correct.
 */
const WORD_NUMBERS: Record<string, number> = {
  four: 4, five: 5, six: 6, seven: 7,
  cuatro: 4, cinco: 5, seis: 6, siete: 7,
  fyra: 4, fem: 5, sex: 6, sju: 7,
  ארבע: 4, חמש: 5, שש: 6, שבע: 7,
  ארבעה: 4, חמישה: 5, שישה: 6, שבעה: 7,
  четыре: 4, пять: 5, шесть: 6, семь: 7,
};
const WORD_ALT = Object.keys(WORD_NUMBERS).join('|');

const NOUN =
  'languages?|dictionaries|idiomas?|diccionarios|språk|ordböcker|ordlistor'
  + '|שפות|מילונים|язык(?:ов|ах|ами|а)|словар(?:ей|ях|ями|я)';

const LATIN_ISH = new RegExp(String.raw`(\d{1,2}|${WORD_ALT})\s+(?:[\p{L}-]+\s+){0,2}(?:${NOUN})(?![\p{L}])`, 'giu');
const JAPANESE = new RegExp(String.raw`(?<!ほかの)(?<!他の)(\d{1,2}|四|五|六|七)\s*つ?の?(?:内蔵)?(?:言語|辞書)`, 'gu');
const JA_DIGITS: Record<string, number> = { 四: 4, 五: 5, 六: 6, 七: 7 };

function languageCounts(text: string): number[] {
  const found: number[] = [];
  for (const m of text.matchAll(LATIN_ISH)) {
    const raw = m[1].toLowerCase();
    found.push(WORD_NUMBERS[raw] ?? Number(raw));
  }
  for (const m of text.matchAll(JAPANESE)) {
    const raw = m[1];
    found.push(JA_DIGITS[raw] ?? Number(raw));
  }
  return found.filter((n) => Number.isFinite(n));
}

/** Every string on a page that a search engine or a reader treats as a claim. */
type Surface = { label: string; text: string };

function surfacesFor(get: (l: string) => Record<string, unknown>, locale: string): Surface[] {
  const c = get(locale);
  const out: Surface[] = [];
  const push = (label: string, v: unknown) => {
    if (typeof v === 'string') out.push({ label, text: v });
  };
  push('metaTitle', c.metaTitle);
  push('metaDescription', c.metaDescription);
  push('ogTitle', c.ogTitle);
  push('ogDescription', c.ogDescription);
  push('twitterDescription', c.twitterDescription);
  // The H1 is assembled from different field names per page; take them all.
  for (const [k, v] of Object.entries(c)) {
    if (/^(h1|hero|heroH1|heroTitle|heroSubtitle|heroTag)/.test(k)) {
      push(k, v);
      if (v && typeof v === 'object') {
        for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) push(`${k}.${k2}`, v2);
      }
    }
  }
  return out;
}

const PAGES: Array<[string, (l: string) => Record<string, unknown>]> = [
  ['esl-word-games', getEslWordGamesContent as never],
  ['vocabulary-games-classroom', getVocabClassroomContent as never],
  ['games-for-teachers', getGamesForTeachersContent as never],
  ['for-schools', getForSchoolsContent as never],
  ['sight-words-practice', getSightWordsContent as never],
];

describe('the locale list is the source of truth', () => {
  it('is six', () => {
    expect(REAL_COUNT).toBe(6);
  });

  it('the detector is not vacuous', () => {
    expect(languageCounts('supports five languages')).toEqual([5]);
    expect(languageCounts('на 5 языках')).toEqual([5]);
    expect(languageCounts('6言語対応')).toEqual([6]);
    expect(languageCounts('ほかの5言語')).toEqual([]);
    expect(languageCounts('Seis idiomas')).toEqual([6]);
    // A number that is not about languages must not register.
    expect(languageCounts('5 research-backed drills')).toEqual([]);
  });
});

describe.each(PAGES)('%s — meta, og, twitter and H1 agree', (_page, get) => {
  it.each([...locales])('%s states one language count, and it is the real one', (locale) => {
    const offenders = surfacesFor(get, locale)
      .flatMap(({ label, text }) =>
        languageCounts(text)
          .filter((n) => n !== REAL_COUNT)
          .map((n) => `  ${label}: says ${n}, real count is ${REAL_COUNT} — "${text.slice(0, 110)}"`),
      );
    expect(offenders.join('\n') || null).toBeNull();
  });
});

/**
 * The hub has no `content.ts`; its metadata comes from the catalogues. These are the
 * exact keys `/[locale]/education/page.tsx` reads for title/description/og/twitter.
 */
const CATALOGUES: Array<[string, unknown]> = [
  ['en', en], ['es', es], ['he', he], ['ja', ja], ['ru', ru], ['sv', sv],
];

describe.each(CATALOGUES)('education hub (%s) — meta, og and twitter agree', (_locale, catalogue) => {
  const hub = ((catalogue as Record<string, Record<string, unknown>>).seo?.educationHub ?? {}) as Record<string, unknown>;

  it('has the hub metadata keys to check', () => {
    expect(Object.keys(hub).length).toBeGreaterThan(0);
  });

  it('states one language count, and it is the real one', () => {
    const offenders = Object.entries(hub)
      .filter(([, v]) => typeof v === 'string')
      .flatMap(([k, v]) =>
        languageCounts(v as string)
          .filter((n) => n !== REAL_COUNT)
          .map((n) => `  seo.educationHub.${k}: says ${n} — "${(v as string).slice(0, 110)}"`),
      );
    expect(offenders.join('\n') || null).toBeNull();
  });
});
