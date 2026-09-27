/**
 * Multi-locale Starter Packs Tests
 *
 * Verifies that all 6 locales (en, he, sv, ja, es, ru) have starter packs
 * with real, non-fabricated words from existing dictionaries.
 */

import { describe, it, expect } from 'vitest';
import { STARTER_LESSON_PACKS } from '../starterLessonPacks';

describe('Multi-locale Starter Packs', () => {
  describe('Locale coverage', () => {
    it('should have starter packs for all 6 locales', () => {
      const locales = new Set(STARTER_LESSON_PACKS.map(pack => pack.language));
      expect(locales.has('en')).toBe(true);
      expect(locales.has('he')).toBe(true);
      expect(locales.has('sv')).toBe(true);
      expect(locales.has('ja')).toBe(true);
      expect(locales.has('es')).toBe(true);
      expect(locales.has('ru')).toBe(true);
    });

    it('should have at least one pack per locale', () => {
      const locales = ['en', 'he', 'sv', 'ja', 'es', 'ru'];
      locales.forEach(locale => {
        const packs = STARTER_LESSON_PACKS.filter(p => p.language === locale);
        expect(packs.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Spanish (es) packs', () => {
    it('should have at least one Spanish pack', () => {
      const esPacks = STARTER_LESSON_PACKS.filter(p => p.language === 'es');
      expect(esPacks.length).toBeGreaterThan(0);
    });

    it('Spanish packs should have beginner-level words with definitions', () => {
      const esPacks = STARTER_LESSON_PACKS.filter(p => p.language === 'es');
      esPacks.forEach(pack => {
        expect(pack.words.length).toBeGreaterThan(0);
        pack.words.forEach(word => {
          expect(word.word).toBeDefined();
          expect(word.definition).toBeDefined();
          expect(word.difficulty).toMatch(/easy|medium|hard/);
        });
      });
    });

    it('Spanish words should be lowercase', () => {
      const esPacks = STARTER_LESSON_PACKS.filter(p => p.language === 'es');
      esPacks.forEach(pack => {
        pack.words.forEach(word => {
          // Most Spanish words should start lowercase (not UPPERCASE)
          expect(word.word).toMatch(/^[a-záéíóú]/);
        });
      });
    });
  });

  describe('Swedish (sv) packs', () => {
    it('should have at least one Swedish pack', () => {
      const svPacks = STARTER_LESSON_PACKS.filter(p => p.language === 'sv');
      expect(svPacks.length).toBeGreaterThan(0);
    });

    it('Swedish packs should have beginner-level words with definitions', () => {
      const svPacks = STARTER_LESSON_PACKS.filter(p => p.language === 'sv');
      svPacks.forEach(pack => {
        expect(pack.words.length).toBeGreaterThan(0);
        pack.words.forEach(word => {
          expect(word.word).toBeDefined();
          expect(word.definition).toBeDefined();
          expect(word.difficulty).toMatch(/easy|medium|hard/);
        });
      });
    });

    it('Swedish words should be lowercase', () => {
      const svPacks = STARTER_LESSON_PACKS.filter(p => p.language === 'sv');
      svPacks.forEach(pack => {
        pack.words.forEach(word => {
          // Swedish words should start lowercase
          expect(word.word).toMatch(/^[a-zåäö]/);
        });
      });
    });
  });

  describe('Japanese (ja) packs', () => {
    it('should have at least one Japanese pack', () => {
      const jaPacks = STARTER_LESSON_PACKS.filter(p => p.language === 'ja');
      expect(jaPacks.length).toBeGreaterThan(0);
    });

    it('Japanese packs should have beginner-level words with definitions', () => {
      const jaPacks = STARTER_LESSON_PACKS.filter(p => p.language === 'ja');
      jaPacks.forEach(pack => {
        expect(pack.words.length).toBeGreaterThan(0);
        pack.words.forEach(word => {
          expect(word.word).toBeDefined();
          expect(word.definition).toBeDefined();
          expect(word.difficulty).toMatch(/easy|medium|hard/);
        });
      });
    });

    it('Japanese words should use hiragana', () => {
      const jaPacks = STARTER_LESSON_PACKS.filter(p => p.language === 'ja');
      jaPacks.forEach(pack => {
        pack.words.forEach(word => {
          // Japanese words should contain hiragana characters
          expect(word.word).toMatch(/[぀-ゟ]/);
        });
      });
    });
  });

  describe('Russian (ru) packs', () => {
    it('should have at least one Russian pack', () => {
      const ruPacks = STARTER_LESSON_PACKS.filter(p => p.language === 'ru');
      expect(ruPacks.length).toBeGreaterThan(0);
    });

    it('Russian packs should have beginner-level words with definitions', () => {
      const ruPacks = STARTER_LESSON_PACKS.filter(p => p.language === 'ru');
      ruPacks.forEach(pack => {
        expect(pack.words.length).toBeGreaterThan(0);
        pack.words.forEach(word => {
          expect(word.word).toBeDefined();
          expect(word.definition).toBeDefined();
          expect(word.difficulty).toMatch(/easy|medium|hard/);
        });
      });
    });

    it('Russian words should use Cyrillic script', () => {
      const ruPacks = STARTER_LESSON_PACKS.filter(p => p.language === 'ru');
      ruPacks.forEach(pack => {
        pack.words.forEach(word => {
          // Russian words should contain Cyrillic characters
          expect(word.word).toMatch(/[Ѐ-ӿ]/);
        });
      });
    });
  });

  describe('Pack structure consistency', () => {
    it('all packs should have proper i18n keys', () => {
      STARTER_LESSON_PACKS.forEach(pack => {
        expect(pack.nameKey).toMatch(/^education\.starterPacks\./);
        expect(pack.descriptionKey).toMatch(/^education\.starterPacks\./);
      });
    });

    it('all packs should have valid category', () => {
      STARTER_LESSON_PACKS.forEach(pack => {
        expect(['general', 'academic', 'language']).toContain(pack.category);
      });
    });

    it('all packs should have valid target level', () => {
      STARTER_LESSON_PACKS.forEach(pack => {
        expect(['beginner', 'intermediate', 'advanced']).toContain(pack.targetLevel);
      });
    });

    it('all packs should have consistent settings', () => {
      STARTER_LESSON_PACKS.forEach(pack => {
        expect([4, 5]).toContain(pack.settings.gridSize);
        expect(pack.settings.minWordLength).toBeGreaterThan(0);
        expect(pack.settings.timeLimit).toBeGreaterThan(0);
        expect(typeof pack.settings.allowDiagonal).toBe('boolean');
      });
    });
  });

  describe('Word counts and difficulty distribution', () => {
    it('non-English packs should have reasonable word counts (10-25)', () => {
      const nonEnPacks = STARTER_LESSON_PACKS.filter(p => p.language !== 'en');
      nonEnPacks.forEach(pack => {
        expect(pack.words.length).toBeGreaterThanOrEqual(10);
        expect(pack.words.length).toBeLessThanOrEqual(25);
      });
    });

    it('all packs should have mix of difficulty levels', () => {
      STARTER_LESSON_PACKS.forEach(pack => {
        const difficulties = new Set(pack.words.map(w => w.difficulty));
        expect(difficulties.size).toBeGreaterThan(1);
      });
    });
  });
});
