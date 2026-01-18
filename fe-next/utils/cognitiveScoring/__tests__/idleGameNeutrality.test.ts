/**
 * Tests for idle game (no words found) cognitive scoring behavior
 *
 * Issue: When a player doesn't find any words (idle game), their cognitive
 * score was being set to 0 across all domains, which unfairly penalizes their
 * rolling average.
 *
 * Expected behavior: Idle games should be neutral - they should not affect
 * the player's cognitive score at all. The main entry point
 * (calculateGameCognitiveScores) returns null for idle games, which signals
 * to the caller to skip saving/aggregating.
 */

import {
  calculateProcessingSpeed,
  calculateWordsPerMinute,
} from '../processingSpeed';
import {
  calculateWorkingMemory,
  calculateAverageWordLength,
} from '../workingMemory';
import {
  calculateAttention,
  calculateComboRate,
} from '../attention';
import {
  calculateFlexibility,
  countUniqueWordLengths,
} from '../flexibility';
import {
  calculateVocabulary,
  calculateRareWordRatio,
} from '../vocabulary';
import {
  calculateGameCognitiveScores,
} from '../index';

describe('Idle Game Cognitive Scoring - Neutrality', () => {
  describe('calculateGameCognitiveScores (main entry point)', () => {
    it('should return null for idle games (wordsFound === 0)', () => {
      const result = calculateGameCognitiveScores(
        {
          wordsFound: 0,
          gameDurationSeconds: 120,
          gridSize: 25,
          wordLengths: [],
          maxCombo: 0,
          hintsUsed: 0,
          rareWordCount: 0,
          legendaryWordCount: 0,
        },
        'user-123',
        'session-456'
      );

      // Idle games should return null to indicate "no data"
      // This allows the caller to skip saving/aggregating
      expect(result).toBeNull();
    });

    it('should return valid scores for games with words found', () => {
      const result = calculateGameCognitiveScores(
        {
          wordsFound: 10,
          gameDurationSeconds: 120,
          gridSize: 25,
          wordLengths: [3, 4, 5, 4, 3, 6, 4, 5, 4, 3],
          maxCombo: 5,
          hintsUsed: 0,
          rareWordCount: 1,
          legendaryWordCount: 0,
        },
        'user-123',
        'session-456'
      );

      // Active games should return valid scores
      expect(result).not.toBeNull();
      expect(result?.processingSpeed).toBeGreaterThan(0);
      expect(result?.workingMemory).toBeGreaterThan(0);
      expect(result?.attention).toBeGreaterThan(0);
      expect(result?.flexibility).toBeGreaterThan(0);
      expect(result?.vocabulary).toBeGreaterThanOrEqual(0); // Could be 0 if no rare words
    });
  });

  describe('Individual Domain Calculators - Edge Cases', () => {
    // Individual domain calculators return 0 for edge cases (empty input)
    // but the main entry point (calculateGameCognitiveScores) handles this
    // by returning null BEFORE calling these functions

    describe('calculateProcessingSpeed', () => {
      it('should return 0 for idle games (edge case handled by main function)', () => {
        const result = calculateProcessingSpeed({
          wordsFound: 0,
          gameDurationSeconds: 120,
          gridSize: 25,
        });

        // Returns 0 but this case is handled upstream by main function returning null
        expect(result).toBe(0);
      });

      it('should return valid score for active games', () => {
        const result = calculateProcessingSpeed({
          wordsFound: 10,
          gameDurationSeconds: 120,
          gridSize: 25,
        });

        expect(result).toBeGreaterThan(0);
      });
    });

    describe('calculateWorkingMemory', () => {
      it('should return 0 for idle games (edge case handled by main function)', () => {
        const result = calculateWorkingMemory({
          wordLengths: [],
          gridSize: 25,
        });

        // Returns 0 but this case is handled upstream by main function returning null
        expect(result).toBe(0);
      });

      it('should return valid score for active games', () => {
        const result = calculateWorkingMemory({
          wordLengths: [4, 5, 6],
          gridSize: 25,
        });

        expect(result).toBeGreaterThan(0);
      });
    });

    describe('calculateAttention', () => {
      it('should return 0 for idle games (edge case handled by main function)', () => {
        const result = calculateAttention({
          wordsFound: 0,
          maxCombo: 0,
          hintsUsed: 0,
        });

        // Returns 0 but this case is handled upstream by main function returning null
        expect(result).toBe(0);
      });

      it('should return valid score for active games', () => {
        const result = calculateAttention({
          wordsFound: 10,
          maxCombo: 5,
          hintsUsed: 0,
        });

        expect(result).toBeGreaterThan(0);
      });
    });

    describe('calculateFlexibility', () => {
      it('should return 0 for idle games (edge case handled by main function)', () => {
        const result = calculateFlexibility({
          wordLengths: [],
        });

        // Returns 0 but this case is handled upstream by main function returning null
        expect(result).toBe(0);
      });

      it('should return valid score for active games', () => {
        const result = calculateFlexibility({
          wordLengths: [3, 4, 5, 6],
        });

        expect(result).toBeGreaterThan(0);
      });
    });

    describe('calculateVocabulary', () => {
      it('should return 0 for idle games (edge case handled by main function)', () => {
        const result = calculateVocabulary({
          wordsFound: 0,
          rareWordCount: 0,
          legendaryWordCount: 0,
        });

        // Returns 0 but this case is handled upstream by main function returning null
        expect(result).toBe(0);
      });

      it('should return 0 for active games with no rare words', () => {
        const result = calculateVocabulary({
          wordsFound: 10,
          rareWordCount: 0,
          legendaryWordCount: 0,
        });

        // Vocabulary CAN be 0 for active games if no rare words found
        expect(result).toBe(0);
      });

      it('should return positive score for games with rare words', () => {
        const result = calculateVocabulary({
          wordsFound: 10,
          rareWordCount: 2,
          legendaryWordCount: 1,
        });

        expect(result).toBeGreaterThan(0);
      });
    });
  });

  describe('Scoring should be forgiving and give reasonable points', () => {
    it('should give at least 40 points for moderate processing speed (5 WPM)', () => {
      // 5 words per minute on 5x5 (threshold 12 WPM)
      // Expected: 5/12 * 100 = ~42 points
      const result = calculateProcessingSpeed({
        wordsFound: 10,
        gameDurationSeconds: 120, // 5 WPM
        gridSize: 25,
      });

      expect(result).toBeGreaterThanOrEqual(40);
    });

    it('should give at least 50 points for moderate attention (50% combo rate)', () => {
      // 50% combo rate with no hints
      // Expected: 0.5 * 100 * 1.1 = 55 points
      const result = calculateAttention({
        wordsFound: 10,
        maxCombo: 5,
        hintsUsed: 0,
      });

      expect(result).toBeGreaterThanOrEqual(50);
    });

    it('should give at least 50 points for moderate flexibility (4 unique lengths)', () => {
      // 4 unique lengths
      // Expected: 4/8 * 100 = 50 points
      const result = calculateFlexibility({
        wordLengths: [3, 4, 5, 6, 3, 4, 5, 6],
      });

      expect(result).toBeGreaterThanOrEqual(50);
    });

    it('should give at least 50 points for average working memory (4.5 avg length)', () => {
      // Average 4.5 length on 5x5
      // Expected: 4.5 * 1.0 * 12 = 54 points
      const result = calculateWorkingMemory({
        wordLengths: [4, 5, 4, 5, 4, 5],
        gridSize: 25,
      });

      expect(result).toBeGreaterThanOrEqual(50);
    });
  });
});
