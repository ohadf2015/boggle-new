/**
 * FAQ page content guards.
 *
 * The Hebrew FAQ listed only 4 supported languages (missing Spanish) while
 * the product ships 5 — a stale-translation drift that contradicts the
 * crawlable English answer. Pin the full language list so the next edit
 * can't silently undercount again.
 */
import { describe, it, expect } from 'vitest';
import { contentByLocale } from '../content';

describe('FAQ content — locale parity', () => {
  it('every locale has the same number of FAQ items as en', () => {
    const enLen = contentByLocale.en.items.length;
    for (const loc of Object.keys(contentByLocale)) {
      expect(contentByLocale[loc].items.length, `locale ${loc}`).toBe(enLen);
    }
  });
});

describe('FAQ content — Hebrew lists all 5 supported languages', () => {
  const he = contentByLocale.he;
  // The "play in multiple languages" answer must name every shipped language.
  const langAnswer =
    he.items.find((i) => i.answer.includes('שוודית'))?.answer ?? '';

  it.each(['עברית', 'אנגלית', 'שוודית', 'יפנית', 'ספרדית'])(
    'names %s',
    (lang) => {
      expect(langAnswer).toContain(lang);
    },
  );
});
