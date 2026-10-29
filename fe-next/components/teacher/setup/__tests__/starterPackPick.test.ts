import { describe, it, expect } from 'vitest';
import { STARTER_LESSON_PACKS } from '@/lib/education/starterLessonPacks';
import { packsForLanguage, recommendedPack } from '../starterPackPick';

describe('starter pack pick', () => {
  it('Given a class language with packs, Then only that language is offered', () => {
    const packs = packsForLanguage('he');
    expect(packs.length).toBeGreaterThan(0);
    expect(packs.every((p) => p.language === 'he')).toBe(true);
  });

  it('Given a class language with no pack, Then the English packs are offered rather than an empty row', () => {
    const packs = packsForLanguage('xx');
    expect(packs.length).toBeGreaterThan(0);
    expect(packs.every((p) => p.language === 'en')).toBe(true);
  });

  it('Given every class language and grade band, Then a pack is always pre-selected', () => {
    for (const lang of ['en', 'he', 'sv', 'ja', 'es', 'ru', 'xx']) {
      for (const band of [null, 'k2', 'g35', 'g68', 'g912', 'esl'] as const) {
        expect(STARTER_LESSON_PACKS).toContain(recommendedPack(lang, band));
      }
    }
  });

  it('Given older students, Then a harder pack wins over a beginner one when the language has both', () => {
    const en = packsForLanguage('en');
    const levels = new Set(en.map((p) => p.targetLevel));
    expect(recommendedPack('en', 'k2').targetLevel).toBe('beginner');
    if (levels.has('intermediate')) expect(recommendedPack('en', 'g912').targetLevel).not.toBe('beginner');
    expect(recommendedPack('en', 'esl').targetLevel).toBe('beginner');
  });
});
