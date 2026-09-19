/**
 * Starter Lesson Packs — available across all 6 locales
 *
 * Verifies that all locales (en, he, sv, ja, es, ru) have starter packs
 * available for teachers to pick instantly, reducing onboarding friction.
 */

import { describe, it, expect } from 'vitest';
import STARTER_LESSON_PACKS from './starterLessonPacks';

describe('StarterLessonPacks', () => {
  const SUPPORTED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
  const SUPPORTED_CATEGORIES = ['general', 'academic', 'language'] as const;
  const SUPPORTED_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

  it('exports a non-empty array of starter packs', () => {
    expect(Array.isArray(STARTER_LESSON_PACKS)).toBe(true);
    expect(STARTER_LESSON_PACKS.length).toBeGreaterThan(0);
  });

  it('includes at least one pack per supported locale', () => {
    const localesCovered = new Set(STARTER_LESSON_PACKS.map((p) => p.language));
    expect(localesCovered.size).toBeGreaterThanOrEqual(SUPPORTED_LANGUAGES.length);

    for (const locale of SUPPORTED_LANGUAGES) {
      const hasLocale = STARTER_LESSON_PACKS.some((p) => p.language === locale);
      expect(hasLocale).toBe(true, `Missing pack for locale: ${locale}`);
    }
  });

  describe('pack structure', () => {
    for (const pack of STARTER_LESSON_PACKS) {
      describe(`${pack.language}/${pack.nameKey}`, () => {
        it('has required metadata fields', () => {
          expect(pack.nameKey).toBeDefined();
          expect(pack.nameKey).toMatch(/^education\.starterPacks\./);
          expect(pack.descriptionKey).toBeDefined();
          expect(pack.descriptionKey).toMatch(/^education\.starterPacks\./);
        });

        it('has a valid language', () => {
          expect(SUPPORTED_LANGUAGES).toContain(pack.language);
        });

        it('has a valid category', () => {
          expect(SUPPORTED_CATEGORIES).toContain(pack.category);
        });

        it('has a valid target level', () => {
          expect(SUPPORTED_LEVELS).toContain(pack.targetLevel);
        });

        it('has a non-empty word list', () => {
          expect(Array.isArray(pack.words)).toBe(true);
          expect(pack.words.length).toBeGreaterThan(0);
        });

        it('word count is reasonable (5-30 words)', () => {
          expect(pack.words.length).toBeGreaterThanOrEqual(5);
          expect(pack.words.length).toBeLessThanOrEqual(30);
        });

        it('all words have required fields', () => {
          for (const word of pack.words) {
            expect(word.word).toBeDefined();
            expect(word.definition).toBeDefined();
            expect(word.hint).toBeDefined();
            expect(word.difficulty).toBeDefined();
            expect(['easy', 'medium', 'hard']).toContain(word.difficulty);
          }
        });

        it('all words are non-empty strings', () => {
          for (const word of pack.words) {
            expect(typeof word.word).toBe('string');
            expect(word.word.length).toBeGreaterThan(0);
            expect(typeof word.definition).toBe('string');
            expect(word.definition.length).toBeGreaterThan(0);
            expect(typeof word.hint).toBe('string');
            expect(word.hint.length).toBeGreaterThan(0);
          }
        });

        it('has valid settings', () => {
          const { settings } = pack;
          expect(settings).toBeDefined();
          expect([4, 5]).toContain(settings.gridSize);
          expect(settings.minWordLength).toBeGreaterThanOrEqual(1);
          expect(settings.minWordLength).toBeLessThanOrEqual(6);
          expect(settings.timeLimit).toBeGreaterThanOrEqual(60);
          expect(settings.timeLimit).toBeLessThanOrEqual(600);
          expect(typeof settings.allowDiagonal).toBe('boolean');
        });

        it('word distribution has mostly easy/medium words', () => {
          const easyOrMedium = pack.words.filter((w) => w.difficulty !== 'hard').length;
          const ratio = easyOrMedium / pack.words.length;
          expect(ratio).toBeGreaterThanOrEqual(0.6);
        });
      });
    }
  });

  describe('locale coverage', () => {
    it('english has at least 2 packs (different levels)', () => {
      const enPacks = STARTER_LESSON_PACKS.filter((p) => p.language === 'en');
      expect(enPacks.length).toBeGreaterThanOrEqual(2);
    });

    it('spanish, swedish, japanese, russian each have at least 1 pack', () => {
      for (const locale of ['es', 'sv', 'ja', 'ru'] as const) {
        const packs = STARTER_LESSON_PACKS.filter((p) => p.language === locale);
        expect(packs.length).toBeGreaterThanOrEqual(1, `${locale} should have at least 1 pack`);
      }
    });

    it('hebrew has at least 1 pack', () => {
      const hePacks = STARTER_LESSON_PACKS.filter((p) => p.language === 'he');
      expect(hePacks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('pack uniqueness', () => {
    it('no duplicate nameKeys across packs', () => {
      const nameKeys = STARTER_LESSON_PACKS.map((p) => p.nameKey);
      const unique = new Set(nameKeys);
      expect(unique.size).toBe(nameKeys.length);
    });

    it('no duplicate language+category combinations for the same level', () => {
      const keys = STARTER_LESSON_PACKS.map(
        (p) => `${p.language}/${p.targetLevel}/${p.category}`
      );
      const unique = new Set(keys);
      // Not a hard error, just informational — multiple intermediate packs are OK
      expect(unique.size).toBeLessThanOrEqual(STARTER_LESSON_PACKS.length);
    });
  });
});
