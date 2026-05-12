import { describe, it, expect } from 'vitest';
import { validateLevelClear, starRating, type ClearSubmission } from '../anti-cheat';
import type { BlastLevel } from '../types';

const mockLevel: BlastLevel = {
  id: 'test-1',
  levelNumber: 1,
  theme: 'fruits',
  locale: 'en',
  words: ['apple', 'banana', 'cherry'],
  columns: [],
  resolvableOrder: [],
  tileFlags: {},
  difficulty: 1,
};

describe('anti-cheat', () => {
  describe('validateLevelClear', () => {
    it('accepts valid clear with all words found', () => {
      const submission: ClearSubmission = {
        levelNumber: 1,
        locale: 'en',
        wordsFound: ['apple', 'banana', 'cherry'],
        timeSeconds: 60,
        hintsUsed: 0,
        wrongAttempts: 0,
        cascadesTriggered: 0,
      };
      const validation = validateLevelClear(submission, mockLevel);
      expect(validation.ok).toBe(true);
    });

    it('rejects word not in level', () => {
      const submission: ClearSubmission = {
        levelNumber: 1,
        locale: 'en',
        wordsFound: ['apple', 'orange'],
        timeSeconds: 60,
        hintsUsed: 0,
        wrongAttempts: 0,
        cascadesTriggered: 0,
      };
      const validation = validateLevelClear(submission, mockLevel);
      expect(validation.ok).toBe(false);
      if (!validation.ok) {
        expect(validation.reason).toContain('not in level');
      }
    });

    it('rejects time too fast (less than 5 seconds per word)', () => {
      const submission: ClearSubmission = {
        levelNumber: 1,
        locale: 'en',
        wordsFound: ['apple', 'banana', 'cherry'],
        timeSeconds: 10, // 3 words * 5 = 15s minimum
        hintsUsed: 0,
        wrongAttempts: 0,
        cascadesTriggered: 0,
      };
      const validation = validateLevelClear(submission, mockLevel);
      expect(validation.ok).toBe(false);
      if (!validation.ok) {
        expect(validation.reason).toContain('time too fast');
      }
    });

    it('accepts time at boundary', () => {
      const submission: ClearSubmission = {
        levelNumber: 1,
        locale: 'en',
        wordsFound: ['apple', 'banana', 'cherry'],
        timeSeconds: 15, // 3 words * 5 = 15s minimum
        hintsUsed: 0,
        wrongAttempts: 0,
        cascadesTriggered: 0,
      };
      const validation = validateLevelClear(submission, mockLevel);
      expect(validation.ok).toBe(true);
    });
  });

  describe('starRating', () => {
    it('returns 3 stars for perfect clear (all words, no hints, <=3 wrong, time <= 30s/word)', () => {
      const submission: ClearSubmission = {
        levelNumber: 1,
        locale: 'en',
        wordsFound: ['apple', 'banana', 'cherry'],
        timeSeconds: 80, // 3 words * 30 = 90s
        hintsUsed: 0,
        wrongAttempts: 1,
        cascadesTriggered: 0,
      };
      const stars = starRating(submission, mockLevel);
      expect(stars).toBe(3);
    });

    it('returns 2 stars for good clear (hints<=1 OR wrong<=5)', () => {
      const submission: ClearSubmission = {
        levelNumber: 1,
        locale: 'en',
        wordsFound: ['apple', 'banana'],
        timeSeconds: 100,
        hintsUsed: 1,
        wrongAttempts: 2,
        cascadesTriggered: 0,
      };
      const stars = starRating(submission, mockLevel);
      expect(stars).toBe(2);
    });

    it('returns 1 star otherwise', () => {
      const submission: ClearSubmission = {
        levelNumber: 1,
        locale: 'en',
        wordsFound: ['apple'],
        timeSeconds: 150,
        hintsUsed: 3,
        wrongAttempts: 10,
        cascadesTriggered: 0,
      };
      const stars = starRating(submission, mockLevel);
      expect(stars).toBe(1);
    });
  });
});
