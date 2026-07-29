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

  it('every locale has full FAQ parity with en (no silent dropped entries)', () => {
    // A length-only `>= 10` guard let he/es silently ship 10 vs en's 12.
    // Pin exact parity so a missing translated Q&A fails CI, not GSC.
    const enLen = educationSeoContent.en.faq.length;
    for (const loc of Object.keys(educationSeoContent)) {
      const arr = educationSeoContent[loc].faq;
      expect(arr.length, `locale ${loc} faq count`).toBe(enLen);
      for (const item of arr) {
        expect(item.question.length, `locale ${loc} q`).toBeGreaterThan(0);
        expect(item.answer.length, `locale ${loc} a`).toBeGreaterThan(0);
      }
    }
  });
});

describe('hub FAQ — native Hebrew, not machine-translated', () => {
  const he = educationSeoContent.he.faq;
  const allHe = he.map((f) => `${f.question} ${f.answer}`).join(' ');

  it('uses the real game term ציד מילים, never the MT calque מצודות (fortresses)', () => {
    expect(allHe).not.toContain('מצוד'); // מצודות = fortresses — wrong word for "word hunt"
    expect(allHe).toContain('ציד מילים');
  });
});
