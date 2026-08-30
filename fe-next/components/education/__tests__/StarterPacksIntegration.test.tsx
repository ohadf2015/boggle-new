/**
 * Starter Packs Integration Tests
 *
 * Tests that verify:
 * - Starter packs exist and have correct language field
 * - Words can be converted to VocabularyWords with canIntegrate flag
 * - Lesson creation flow includes starter packs
 */

import { describe, it, expect } from 'vitest';
import { STARTER_LESSON_PACKS } from '../../../lib/education/starterLessonPacks';
import { convertPackWordsToLessonWords } from '../../../lib/education/createLessonFromPack';

describe('Starter Packs Integration', () => {
  describe('Starter pack structure', () => {
    it('should have 3 starter packs', () => {
      expect(STARTER_LESSON_PACKS).toHaveLength(3);
    });

    it('should have language field for each pack', () => {
      STARTER_LESSON_PACKS.forEach(pack => {
        expect(pack).toHaveProperty('language');
        expect(['en', 'he', 'sv', 'ja', 'es', 'ru']).toContain(pack.language);
      });
    });

    it('common English pack should have language "en"', () => {
      const englishPack = STARTER_LESSON_PACKS.find(p => p.nameKey.includes('commonEnglish'));
      expect(englishPack?.language).toBe('en');
    });

    it('beginner Hebrew pack should have language "he"', () => {
      const hebrewPack = STARTER_LESSON_PACKS.find(p => p.nameKey.includes('beginnerHebrew'));
      expect(hebrewPack?.language).toBe('he');
    });

    it('academic vocab pack should have language "en"', () => {
      const academicPack = STARTER_LESSON_PACKS.find(p => p.nameKey.includes('academicVocab'));
      expect(academicPack?.language).toBe('en');
    });

    it('all packs should have name and description keys', () => {
      STARTER_LESSON_PACKS.forEach(pack => {
        expect(pack.nameKey).toBeDefined();
        expect(pack.descriptionKey).toBeDefined();
        expect(pack.nameKey).toContain('starterPacks');
        expect(pack.descriptionKey).toContain('starterPacks');
      });
    });

    it('all packs should have words with required fields', () => {
      STARTER_LESSON_PACKS.forEach(pack => {
        expect(pack.words.length).toBeGreaterThan(0);
        pack.words.forEach(word => {
          expect(word).toHaveProperty('word');
          expect(word).toHaveProperty('definition');
          expect(word).toHaveProperty('difficulty');
          expect(['easy', 'medium', 'hard']).toContain(word.difficulty);
        });
      });
    });
  });

  describe('Converting pack words to vocabulary words', () => {
    it('should convert LessonWord array to VocabularyWord array', () => {
      const packWords = STARTER_LESSON_PACKS[0].words;
      const vocabularyWords = convertPackWordsToLessonWords(packWords);

      expect(vocabularyWords).toHaveLength(packWords.length);
    });

    it('all converted words should have canIntegrate: true', () => {
      const packWords = STARTER_LESSON_PACKS[0].words;
      const vocabularyWords = convertPackWordsToLessonWords(packWords);

      vocabularyWords.forEach(word => {
        expect(word).toHaveProperty('canIntegrate');
        expect(word.canIntegrate).toBe(true);
      });
    });

    it('should preserve word and definition properties', () => {
      const packWords = STARTER_LESSON_PACKS[0].words.slice(0, 3);
      const vocabularyWords = convertPackWordsToLessonWords(packWords);

      packWords.forEach((packWord, idx) => {
        expect(vocabularyWords[idx].word).toBe(packWord.word);
        expect(vocabularyWords[idx].definition).toBe(packWord.definition);
      });
    });

    it('should handle words with and without definitions', () => {
      const testWords = [
        { word: 'test1', definition: 'A definition', difficulty: 'easy' as const },
        { word: 'test2', difficulty: 'medium' as const },
      ];
      const result = convertPackWordsToLessonWords(testWords);

      expect(result[0].definition).toBe('A definition');
      expect(result[1].definition).toBeUndefined();
      expect(result[0].canIntegrate).toBe(true);
      expect(result[1].canIntegrate).toBe(true);
    });
  });

  describe('Pack language distribution', () => {
    it('Hebrew pack should contain Hebrew words', () => {
      const hebrewPack = STARTER_LESSON_PACKS.find(p => p.language === 'he');
      expect(hebrewPack).toBeDefined();
      expect(hebrewPack?.words.length).toBeGreaterThan(0);
      // Check if the first word contains Hebrew characters
      const firstWord = hebrewPack?.words[0].word || '';
      expect(/[֐-׿]/.test(firstWord)).toBe(true);
    });

    it('English packs should contain English words', () => {
      STARTER_LESSON_PACKS.filter(p => p.language === 'en').forEach(pack => {
        expect(pack.words.length).toBeGreaterThan(0);
        // At least some words should be lowercase English
        const hasEnglishWords = pack.words.some(w => /^[a-z]/.test(w.word.toLowerCase()));
        expect(hasEnglishWords).toBe(true);
      });
    });
  });
});
