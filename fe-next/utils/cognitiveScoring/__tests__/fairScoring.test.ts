/**
 * Tests for fair cognitive scoring that doesn't penalize players unreasonably
 *
 * Issue: The cognitive scoring system was too harsh, penalizing players
 * for normal gameplay patterns:
 *
 * 1. Attention: maxCombo/wordsFound punishes finding many words
 * 2. Vocabulary: Requires unrealistic rare word ratios for decent scores
 * 3. Flexibility: Requires 8 unique lengths (too strict)
 *
 * Expected behavior: A decent game (reasonable words, some combos, some
 * variety) should score at least 40-50 points in each domain.
 */

import { calculateAttention } from '../attention';
import { calculateVocabulary } from '../vocabulary';
import { calculateFlexibility } from '../flexibility';
import { calculateGameCognitiveScores, calculateOverallScore } from '../index';
import type { CognitiveDomain } from '@/shared/types/cognitive';

describe('Cognitive Scoring - Fair and Forgiving', () => {
  describe('Attention scoring should not penalize finding many words', () => {
    it('should give at least 40 points when maxCombo is 20% of words found', () => {
      // Player found 25 words with a max combo of 5 (20% combo rate)
      // This is a NORMAL game pattern - combos break naturally
      // Old formula: 5/25 * 100 * 1.1 = 22 points (too harsh!)
      // Expected: At least 40 points for a decent game
      const result = calculateAttention({
        wordsFound: 25,
        maxCombo: 5,
        hintsUsed: 0,
      });

      expect(result).toBeGreaterThanOrEqual(40);
    });

    it('should give at least 50 points when maxCombo is 30% of words found', () => {
      // Player found 20 words with a max combo of 6 (30% combo rate)
      // Old formula: 6/20 * 100 * 1.1 = 33 points (too harsh!)
      // Expected: At least 50 points
      const result = calculateAttention({
        wordsFound: 20,
        maxCombo: 6,
        hintsUsed: 0,
      });

      expect(result).toBeGreaterThanOrEqual(50);
    });

    it('should not decrease score when finding MORE words', () => {
      // Finding more words should not penalize the score
      const score10Words = calculateAttention({
        wordsFound: 10,
        maxCombo: 5,
        hintsUsed: 0,
      });

      const score30Words = calculateAttention({
        wordsFound: 30,
        maxCombo: 5,
        hintsUsed: 0,
      });

      // Score should NOT decrease when finding more words with same combo
      // (or at least not by much)
      expect(score30Words).toBeGreaterThanOrEqual(score10Words - 10);
    });
  });

  describe('Vocabulary scoring should be achievable', () => {
    it('should give at least 30 points with 10% rare words', () => {
      // Player found 20 words, 2 rare (10% rare ratio)
      // This is a typical game outcome
      // Old formula: 2/20 * 200 = 20 points (too harsh!)
      // Expected: At least 30 points
      const result = calculateVocabulary({
        wordsFound: 20,
        rareWordCount: 2,
        legendaryWordCount: 0,
      });

      expect(result).toBeGreaterThanOrEqual(30);
    });

    it('should give at least 50 points with 15% rare words', () => {
      // Player found 20 words, 3 rare (15% rare ratio)
      // Old formula: 3/20 * 200 = 30 points (too harsh!)
      // Expected: At least 50 points
      const result = calculateVocabulary({
        wordsFound: 20,
        rareWordCount: 3,
        legendaryWordCount: 0,
      });

      expect(result).toBeGreaterThanOrEqual(50);
    });

    it('should give bonus for legendary words', () => {
      const withoutLegendary = calculateVocabulary({
        wordsFound: 20,
        rareWordCount: 2,
        legendaryWordCount: 0,
      });

      const withLegendary = calculateVocabulary({
        wordsFound: 20,
        rareWordCount: 2,
        legendaryWordCount: 1,
      });

      expect(withLegendary).toBeGreaterThan(withoutLegendary);
    });
  });

  describe('Flexibility scoring should be more forgiving', () => {
    it('should give at least 50 points with 5 unique word lengths', () => {
      // Most games naturally have 5 unique lengths (3, 4, 5, 6, 7)
      // Old formula: 5/8 * 100 = 62.5 points (acceptable but tight)
      // Expected: At least 50 points
      const result = calculateFlexibility({
        wordLengths: [3, 4, 5, 6, 7, 3, 4, 5, 4, 3],
      });

      expect(result).toBeGreaterThanOrEqual(50);
    });

    it('should give at least 75 points with 6 unique word lengths', () => {
      // A good game with 6 unique lengths (3, 4, 5, 6, 7, 8)
      // Old formula: 6/8 * 100 = 75 points (good)
      // Expected: At least 75 points
      const result = calculateFlexibility({
        wordLengths: [3, 4, 5, 6, 7, 8, 3, 4, 5, 4],
      });

      expect(result).toBeGreaterThanOrEqual(75);
    });
  });

  describe('Overall game score should be fair for typical games', () => {
    it('should give at least 40 overall score for a decent game', () => {
      // A decent game: 15 words in 120s, 4.5 avg length, 4 combo, 1 rare, 4 unique lengths
      const result = calculateGameCognitiveScores(
        {
          wordsFound: 15,
          gameDurationSeconds: 120,
          gridSize: 25,
          wordLengths: [3, 4, 5, 6, 4, 5, 4, 3, 5, 4, 6, 5, 4, 5, 4], // avg ~4.5
          maxCombo: 4,
          hintsUsed: 0,
          rareWordCount: 1,
          legendaryWordCount: 0,
        },
        'user-123'
      );

      expect(result).not.toBeNull();
      if (result) {
        const domainScores: Record<CognitiveDomain, number> = {
          processingSpeed: result.processingSpeed,
          workingMemory: result.workingMemory,
          attention: result.attention,
          flexibility: result.flexibility,
          vocabulary: result.vocabulary,
        };
        const overallScore = calculateOverallScore(domainScores);

        // A decent game should score at least 40 overall
        expect(overallScore).toBeGreaterThanOrEqual(40);
      }
    });

    it('should give at least 50 overall score for a good game', () => {
      // A good game: 25 words in 120s, 5 avg length, 8 combo, 3 rare, 5 unique lengths
      const result = calculateGameCognitiveScores(
        {
          wordsFound: 25,
          gameDurationSeconds: 120,
          gridSize: 25,
          wordLengths: [3, 4, 5, 6, 7, 5, 4, 5, 6, 5, 4, 5, 6, 4, 5, 6, 5, 4, 5, 6, 4, 5, 6, 5, 4],
          maxCombo: 8,
          hintsUsed: 0,
          rareWordCount: 3,
          legendaryWordCount: 0,
        },
        'user-123'
      );

      expect(result).not.toBeNull();
      if (result) {
        const domainScores: Record<CognitiveDomain, number> = {
          processingSpeed: result.processingSpeed,
          workingMemory: result.workingMemory,
          attention: result.attention,
          flexibility: result.flexibility,
          vocabulary: result.vocabulary,
        };
        const overallScore = calculateOverallScore(domainScores);

        // A good game should score at least 50 overall
        expect(overallScore).toBeGreaterThanOrEqual(50);
      }
    });
  });
});
