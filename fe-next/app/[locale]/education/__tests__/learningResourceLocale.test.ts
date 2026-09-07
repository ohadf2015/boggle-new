/**
 * A LearningResource must not lie about what language the page is in.
 *
 * Round 4 found `sight-words-practice` emitting an English `name` and
 * `inLanguage: "en"` on the es/he/ja/ru/sv routes. The obvious fix — localize
 * `inLanguage` — would have been worse than the bug. `getSightWordsContent` ignores
 * its locale argument and returns one English object, and the five non-English routes
 * are `noindex, follow` with a canonical to /en. Declaring `inLanguage: "ja"` there
 * would tell a crawler a Japanese resource exists at a URL that serves English prose.
 *
 * So the invariant is not "always localize". It has two arms:
 *
 *   1. If a page emits a LearningResource on locale L, that node must declare L.
 *   2. A page whose content module is locale-invariant must not emit one at all on a
 *      non-English route. Gate it, the way `vocabulary-games-classroom` already gates
 *      its English HowTo.
 *
 * Arm 2 is what `sight-words-practice` now satisfies. Arm 1 is what every other
 * education landing satisfies. Both are checked here so that neither can be "fixed"
 * into the other's failure mode.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { locales } from '@/i18n/config';
import { buildEducationLandingJsonLd, educationLearningResourceJsonLd } from '@/lib/seo/educationLanding';
import { getEslWordGamesContent } from '../esl-word-games/content';
import { getVocabClassroomContent } from '../vocabulary-games-classroom/content';
import { getSightWordsLanding } from '../sight-words-practice/landing';
import { getSightWordsContent } from '../sight-words-practice/content';

const ROOT = join(__dirname, '..', '..', '..', '..');

describe('arm 1 — an emitted LearningResource declares the page locale', () => {
  it.each([...locales])('%s gets its own inLanguage from the shared builder', (locale) => {
    const node = educationLearningResourceJsonLd({
      locale,
      path: '/education/vocabulary-games-classroom',
      name: getVocabClassroomContent(locale).metaTitle,
      description: getVocabClassroomContent(locale).metaDescription,
      teaches: 'Vocabulary',
    });
    expect(node.inLanguage).toBe(locale);
  });

  it.each([...locales])('%s name is the locale name, not the English one', (locale) => {
    if (locale === 'en') return;
    const mine = getVocabClassroomContent(locale).metaTitle;
    expect(mine).not.toBe(getVocabClassroomContent('en').metaTitle);
    expect(getEslWordGamesContent(locale).metaTitle).not.toBe(getEslWordGamesContent('en').metaTitle);
  });
});

describe('arm 2 — a locale-invariant page emits no LearningResource off /en', () => {
  /**
   * Proves the premise rather than assuming it: if someone translates this page,
   * this assertion fails and the gate below must be deleted in the same commit.
   */
  it('sight-words content really is locale-invariant', () => {
    const en = getSightWordsContent('en');
    for (const locale of locales) {
      expect(getSightWordsContent(locale)).toBe(en);
    }
  });

  /**
   * Asserted against the emitted nodes, not the page source. The page moved onto
   * `EducationLandingTemplate` in R2 and no longer names these builders inline —
   * a source-text assertion would have gone quietly vacuous.
   */
  it('its LearningResource and HowTo are gated to the English route', () => {
    const types = (locale: string) =>
      buildEducationLandingJsonLd({
        locale,
        path: '/education/sight-words-practice',
        content: getSightWordsLanding(locale),
      }).map((n) => n['@type']);

    expect(types('en')).toContain('LearningResource');
    expect(types('en')).toContain('HowTo');

    for (const locale of locales.filter((l) => l !== 'en')) {
      expect(types(locale)).not.toContain('LearningResource');
      expect(types(locale)).not.toContain('HowTo');
    }
  });

  it('the page still declares English content, which is the truth', () => {
    const node = educationLearningResourceJsonLd({
      locale: 'en',
      path: '/education/sight-words-practice',
      contentLanguage: 'en',
      name: 'Sight Words Practice Online',
      description: getSightWordsContent('en').metaDescription,
      teaches: 'Sight words',
    });
    expect(node.inLanguage).toBe('en');
  });
});
