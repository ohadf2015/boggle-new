/**
 * Education hub — teacher search-intent copy guards (2026-05-30).
 *
 * /education had 0 GSC impressions over 90d: indexed but buried because the
 * title/H1 spoke brand-positioning ("built for your language"), not the
 * phrases teachers actually type ("free vocabulary games for the classroom",
 * "no login", "own word list"). These tests pin the intent-matched copy so a
 * future refactor can't silently regress it back to generic positioning.
 */
import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { educationSeoContent } from '../seoContent';

describe('seo.educationHub — intent-matched metadata (CTR/ranking)', () => {
  const hub = (en as any).seo.educationHub;

  it('title leads with the high-intent teacher phrase', () => {
    expect(hub.title).toMatch(/vocabulary games/i);
    expect(hub.title).toMatch(/classroom/i);
    expect(hub.title).toMatch(/free/i);
  });

  it('description surfaces the no-student-login moat', () => {
    expect(hub.description).toMatch(/no\b[^.]*\b(login|account)/i);
  });
});

describe('education.landing.hero — visible H1 speaks teacher intent', () => {
  const hero = (en as any).education.landing.hero;

  it('H1 leads with free + classroom intent (not brand positioning)', () => {
    expect(hero.h1).toMatch(/classroom|class/i);
    expect(hero.h1).toMatch(/free|no (student )?(login|account)/i);
  });

  it('keeps the native-language moat as supporting copy in the sub', () => {
    expect(hero.sub).toMatch(/language|languages/i);
  });
});

describe('hub FAQ — GEO-citable teacher questions', () => {
  const faq = educationSeoContent.en.faq;
  const questions = faq.map((f) => f.question.toLowerCase());

  it('answers the custom-word-list intent ("any vocabulary words")', () => {
    expect(questions.some((q) => /own|custom/.test(q) && /word|vocab/.test(q)))
      .toBe(true);
  });

  it('answers the no-download / browser-device intent', () => {
    expect(questions.some((q) => /download|install/.test(q))).toBe(true);
  });

  it('adds the 2 new teacher questions to every locale (non-empty)', () => {
    for (const loc of Object.keys(educationSeoContent)) {
      const arr = educationSeoContent[loc].faq;
      expect(arr.length, `locale ${loc}`).toBeGreaterThanOrEqual(10);
      // The 2 intent questions are appended at the end of each locale array.
      for (const item of arr.slice(-2)) {
        expect(item.question.length, `locale ${loc} q`).toBeGreaterThan(0);
        expect(item.answer.length, `locale ${loc} a`).toBeGreaterThan(0);
      }
    }
  });
});
