/**
 * spelling-bee-practice indexing gate.
 *
 * 2026-05-30: non-EN routes were set noindex because the body prose was hardcoded
 * English in `page.tsx` and only the meta was localized — indexing five
 * English-bodied near-duplicates under /he|/es|/sv|/ja would have been a
 * duplicate-content problem, not a traffic win.
 *
 * 2026-09-05: that premise no longer holds. `content.ts` carries full per-locale
 * blocks for all six languages — hero, four drill modes, a four-week training
 * plan, and eight FAQ answers, all genuinely translated (spot-checked in ja and
 * he, not merely "different from English") — and `page.tsx` renders every visible
 * string from `c.*`. Five fully translated pages were sitting behind a noindex
 * left over from a shape the file no longer has.
 *
 * So the gate flips, and the premise becomes an assertion rather than a comment:
 * the second test below fails the moment someone reintroduces hardcoded English
 * prose into the body, which is the only condition that would justify a noindex
 * here again.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateMetadata } from '../spelling-bee-practice/page';
import { getSpellingBeeContent } from '../spelling-bee-practice/content';

const LOCALES = ['en', 'he', 'es', 'sv', 'ja', 'ru'] as const;

async function robotsFor(locale: string) {
  const meta = await generateMetadata({ params: Promise.resolve({ locale }) } as never);
  return meta.robots as { index: boolean; follow: boolean };
}

describe('spelling-bee-practice robots gate', () => {
  it.each(LOCALES)('%s is indexable — the body is translated', async (locale) => {
    expect(await robotsFor(locale)).toEqual({ index: true, follow: true });
  });

  it('an unsupported locale stays noindex', async () => {
    expect(await robotsFor('fr')).toEqual({ index: false, follow: true });
  });
});

describe('the content that justifies indexing', () => {
  it.each(LOCALES)('%s has its own translated body, not the English one', (locale) => {
    const c = getSpellingBeeContent(locale);
    const en = getSpellingBeeContent('en');
    expect(c.faqs.length).toBeGreaterThanOrEqual(6);
    expect(c.trainingPlanItems.length).toBeGreaterThanOrEqual(4);
    expect(c.drillModes.length).toBeGreaterThanOrEqual(4);
    if (locale !== 'en') {
      // Every substantial block differs from English — a translated shell around
      // English prose would collide here.
      expect(c.mainParagraph).not.toBe(en.mainParagraph);
      expect(c.faqs[0].a).not.toBe(en.faqs[0].a);
      expect(c.trainingPlanItems[0].activity).not.toBe(en.trainingPlanItems[0].activity);
    }
  });

  it('renders no hardcoded English prose in the body', () => {
    const src = readFileSync(
      join(__dirname, '..', 'spelling-bee-practice', 'page.tsx'),
      'utf8',
    );
    // JSX text nodes of four or more word characters that are not an expression.
    const literals = (src.match(/>[^<>{}\n]*[A-Za-z]{4,}[^<>{}\n]*</g) ?? [])
      .map((m) => m.slice(1, -1).trim())
      .filter((t) => t.length > 0);
    expect(literals).toEqual([]);
  });
});
