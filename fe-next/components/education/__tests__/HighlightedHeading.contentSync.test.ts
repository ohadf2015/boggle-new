import { describe, it, expect } from 'vitest';
import { getSightWordsContent } from '@/app/[locale]/education/sight-words-practice/content';
import { getSpellingBeeContent } from '@/app/[locale]/education/spelling-bee-practice/content';

/**
 * `HighlightedHeading` takes the accented phrase as a literal prop, so the page
 * holds a second copy of a substring that really lives in content.ts. That
 * duplication is deliberate — deriving it would mean adding a `highlight` field
 * to six locales for a purely visual accent — but it decays silently: edit the
 * English heading and the accent just stops rendering, with nothing failing.
 *
 * (The component degrades to plain text by design; this is cosmetic loss, not
 * the corruption bug it replaced, where a no-match APPENDED the English phrase
 * onto every translated heading.)
 *
 * These pairs must stay in sync with the props in the two page.tsx files.
 */
const PAIRS: Array<[string, string, string]> = [
  ['sight-words-practice', 'modesHeading', 'drill sight words'],
  ['sight-words-practice', 'routineHeading', 'sight-word routine'],
  ['spelling-bee-practice', 'drillModesHeading', 'drill modes'],
  ['spelling-bee-practice', 'trainingPlanHeading', 'training plan'],
];

const CONTENT: Record<string, Record<string, string>> = {
  'sight-words-practice': getSightWordsContent('en') as unknown as Record<string, string>,
  'spelling-bee-practice': getSpellingBeeContent('en') as unknown as Record<string, string>,
};

describe('HighlightedHeading accents still match their English headings', () => {
  it.each(PAIRS)('%s / %s contains "%s"', (page, key, highlight) => {
    const heading = CONTENT[page][key];
    expect(heading, `${page} content.ts is missing ${key}`).toBeTruthy();
    expect(
      heading.includes(highlight),
      `"${highlight}" is no longer inside ${page}.${key} ("${heading}") — the accent has silently stopped rendering. Update the highlight prop in that page.tsx, or the heading.`
    ).toBe(true);
  });
});
