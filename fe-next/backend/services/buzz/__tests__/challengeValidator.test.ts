/**
 * ChallengeValidator Tests
 *
 * Tests for Daily Buzz challenge validation logic
 * Following TDD RED-GREEN-REFACTOR cycle
 */

import { validateChallenges, validateAnswerNotSpoiled } from '../challengeValidator';
import type { BuzzChallenge } from '../types';

// Mock the trendsService
jest.mock('../trendsService', () => ({
  isSportsRelatedChallenge: jest.fn(() => false),
}));

describe('challengeValidator', () => {
  // Helper to create a valid challenge that won't be caught by other validations
  // Uses generic prompts that don't contain the answer
  const createValidChallenge = (
    answer: string,
    type: BuzzChallenge['type'] = 'riddle',
    prompt = 'A generic clue about something'
  ): BuzzChallenge => ({
    type,
    trend_topic: 'Test Trend',
    prompt,
    answer,
    difficulty: 'medium',
    trending_context: 'Some trending context',
    hint: 'A helpful hint',
  });

  describe('validateAnswerNotSpoiled', () => {
    it('should return true when answer is not in prompt or hint', () => {
      // GIVEN
      const challenge = createValidChallenge('PIANO', 'riddle', 'What has black and white keys?');

      // WHEN
      const result = validateAnswerNotSpoiled(challenge);

      // THEN
      expect(result).toBe(true);
    });

    it('should return false when answer appears in prompt', () => {
      // GIVEN
      const challenge: BuzzChallenge = {
        type: 'riddle',
        trend_topic: 'Music',
        prompt: 'This piano is magical',
        answer: 'PIANO',
        difficulty: 'medium',
        trending_context: 'Music context',
        hint: 'Something',
      };

      // WHEN
      const result = validateAnswerNotSpoiled(challenge);

      // THEN
      expect(result).toBe(false);
    });

    it('should return false when answer appears in hint', () => {
      // GIVEN
      const challenge: BuzzChallenge = {
        type: 'riddle',
        trend_topic: 'Music',
        prompt: 'What instrument?',
        answer: 'PIANO',
        difficulty: 'medium',
        trending_context: 'Music context',
        hint: 'The piano is popular',
      };

      // WHEN
      const result = validateAnswerNotSpoiled(challenge);

      // THEN
      expect(result).toBe(false);
    });
  });

  describe('validateChallenges - options quality checks', () => {
    it('should reject challenges where options do not include the answer', () => {
      // GIVEN - word_chain with options that don't include the answer
      const challenges: BuzzChallenge[] = [
        createValidChallenge('CRAFT', 'wordle_guess'),
        {
          ...createValidChallenge('FLOWER', 'word_chain'),
          options: ['LIGHT', 'BURN', 'PLANT', 'LEAF'], // Missing FLOWER!
        },
        createValidChallenge('DRUMS', 'riddle'),
        createValidChallenge('VIOLIN', 'riddle'),
        createValidChallenge('FLUTES', 'riddle'),
        createValidChallenge('CELLOS', 'riddle'),
        createValidChallenge('HARPED', 'riddle'),
      ];

      // WHEN
      const result = validateChallenges(challenges, 'en');

      // THEN - The challenge with bad options should be rejected
      expect(result.length).toBe(6); // 7 - 1 rejected
      const hasFlower = result.some(c => c.answer === 'FLOWER');
      expect(hasFlower).toBe(false);
    });

    it('should accept challenges where options include the answer', () => {
      // GIVEN - word_chain with options that include the answer
      const challenges: BuzzChallenge[] = [
        createValidChallenge('CRAFT', 'wordle_guess'),
        {
          ...createValidChallenge('FLOWER', 'word_chain'),
          options: ['FLOWER', 'LIGHT', 'BURN', 'PLANT'], // Includes FLOWER
        },
        createValidChallenge('DRUMS', 'riddle'),
        createValidChallenge('VIOLIN', 'riddle'),
        createValidChallenge('FLUTES', 'riddle'),
        createValidChallenge('CELLOS', 'riddle'),
        createValidChallenge('HARPED', 'riddle'),
      ];

      // WHEN
      const result = validateChallenges(challenges, 'en');

      // THEN - All 7 should pass
      expect(result.length).toBe(7);
    });

    it('should reject challenges with duplicate options', () => {
      // GIVEN - word_chain with duplicate options
      const challenges: BuzzChallenge[] = [
        createValidChallenge('CRAFT', 'wordle_guess'),
        {
          ...createValidChallenge('FLOWER', 'word_chain'),
          options: ['FLOWER', 'LIGHT', 'LIGHT', 'PLANT'], // LIGHT is duplicated!
        },
        createValidChallenge('DRUMS', 'riddle'),
        createValidChallenge('VIOLIN', 'riddle'),
        createValidChallenge('FLUTES', 'riddle'),
        createValidChallenge('CELLOS', 'riddle'),
        createValidChallenge('HARPED', 'riddle'),
      ];

      // WHEN
      const result = validateChallenges(challenges, 'en');

      // THEN - The challenge with duplicate options should be rejected
      expect(result.length).toBe(6);
      const hasFlower = result.some(c => c.answer === 'FLOWER');
      expect(hasFlower).toBe(false);
    });

    it('should reject challenges with fewer than 3 options', () => {
      // GIVEN - word_chain with only 2 options
      const challenges: BuzzChallenge[] = [
        createValidChallenge('CRAFT', 'wordle_guess'),
        {
          ...createValidChallenge('FLOWER', 'word_chain'),
          options: ['FLOWER', 'LIGHT'], // Only 2 options!
        },
        createValidChallenge('DRUMS', 'riddle'),
        createValidChallenge('VIOLIN', 'riddle'),
        createValidChallenge('FLUTES', 'riddle'),
        createValidChallenge('CELLOS', 'riddle'),
        createValidChallenge('HARPED', 'riddle'),
      ];

      // WHEN
      const result = validateChallenges(challenges, 'en');

      // THEN - The challenge with too few options should be rejected
      expect(result.length).toBe(6);
      const hasFlower = result.some(c => c.answer === 'FLOWER');
      expect(hasFlower).toBe(false);
    });

    it('should not apply options validation to challenges without options', () => {
      // GIVEN - All riddles with no options (they don't need options)
      const challenges: BuzzChallenge[] = [
        createValidChallenge('CRAFT', 'wordle_guess'),
        createValidChallenge('GUITAR', 'riddle'),
        createValidChallenge('DRUMS', 'riddle'),
        createValidChallenge('VIOLIN', 'riddle'),
        createValidChallenge('FLUTES', 'riddle'),
        createValidChallenge('CELLOS', 'riddle'),
        createValidChallenge('HARPED', 'riddle'),
      ];

      // WHEN
      const result = validateChallenges(challenges, 'en');

      // THEN - All 7 should pass
      expect(result.length).toBe(7);
    });
  });

  describe('validateChallenges - duplicate answer prevention', () => {
    it('should remove challenges with duplicate answers', () => {
      // GIVEN - 7 challenges, but 2 have the same answer 'CRAFT'
      const challenges: BuzzChallenge[] = [
        createValidChallenge('CRAFT', 'wordle_guess'), // 5 letters for wordle
        createValidChallenge('GUITAR', 'riddle'),
        createValidChallenge('CRAFT', 'anagram'), // Duplicate!
        createValidChallenge('DRUMS', 'riddle'),
        createValidChallenge('VIOLIN', 'riddle'),
        createValidChallenge('FLUTES', 'riddle'),
        createValidChallenge('CELLOS', 'riddle'),
      ];

      // WHEN
      const result = validateChallenges(challenges, 'en');

      // THEN - Should have 6 unique answers (first CRAFT kept, second removed)
      expect(result.length).toBe(6);
      const answers = result.map(c => c.answer.toUpperCase());
      expect(new Set(answers).size).toBe(6); // All unique
      // First CRAFT should be kept
      expect(result[0].answer).toBe('CRAFT');
      // Second CRAFT should be removed
      expect(answers.filter(a => a === 'CRAFT').length).toBe(1);
    });

    it('should handle case-insensitive duplicate detection', () => {
      // GIVEN - duplicates with different cases
      const challenges: BuzzChallenge[] = [
        createValidChallenge('CRAFT', 'wordle_guess'),
        createValidChallenge('guitar', 'riddle'),
        createValidChallenge('Craft', 'anagram'), // Case-insensitive duplicate
        createValidChallenge('DRUMS', 'riddle'),
        createValidChallenge('GUITAR', 'fill_blank'), // Case-insensitive duplicate
        createValidChallenge('FLUTES', 'riddle'),
        createValidChallenge('CELLOS', 'riddle'),
      ];

      // WHEN
      const result = validateChallenges(challenges, 'en');

      // THEN - Should have 5 unique answers
      expect(result.length).toBe(5);
      const normalizedAnswers = result.map(c => c.answer.toLowerCase());
      expect(new Set(normalizedAnswers).size).toBe(5); // All unique when normalized
    });

    it('should keep the first occurrence when duplicates are found', () => {
      // GIVEN - First ALPHA appears with 'Initial clue', second ALPHA with 'Duplicate clue'
      const challenges: BuzzChallenge[] = [
        createValidChallenge('ALPHA', 'wordle_guess', 'Initial clue about greek'),
        createValidChallenge('BRAVO', 'riddle'),
        createValidChallenge('ALPHA', 'anagram', 'Duplicate clue about greek'),
        createValidChallenge('DELTA', 'riddle'),
        createValidChallenge('GAMMA', 'riddle'),
        createValidChallenge('OMEGA', 'riddle'),
        createValidChallenge('SIGMA', 'riddle'),
      ];

      // WHEN
      const result = validateChallenges(challenges, 'en');

      // THEN - First occurrence should be kept
      const alphaChallenge = result.find(c => c.answer === 'ALPHA');
      expect(alphaChallenge?.prompt).toBe('Initial clue about greek');
    });

    it('should still validate minimum 5 challenges after duplicate removal', () => {
      // GIVEN - Only 5 challenges but 2 are duplicates (leaves only 3)
      const challenges: BuzzChallenge[] = [
        createValidChallenge('CRAFT', 'wordle_guess'),
        createValidChallenge('GUITAR', 'riddle'),
        createValidChallenge('CRAFT', 'anagram'), // Duplicate
        createValidChallenge('DRUMS', 'riddle'),
        createValidChallenge('GUITAR', 'fill_blank'), // Duplicate
      ];

      // WHEN/THEN - Should throw because only 3 unique valid challenges remain
      expect(() => validateChallenges(challenges, 'en')).toThrow(
        /Insufficient validated challenges/
      );
    });

    it('should not affect challenges with unique answers', () => {
      // GIVEN - 7 challenges all with unique answers
      const challenges: BuzzChallenge[] = [
        createValidChallenge('CRAFT', 'wordle_guess'),
        createValidChallenge('GUITAR', 'riddle'),
        createValidChallenge('DRUMS', 'anagram'),
        createValidChallenge('VIOLIN', 'fill_blank'),
        createValidChallenge('FLUTES', 'riddle'),
        createValidChallenge('CELLOS', 'riddle'),
        createValidChallenge('HARPED', 'riddle'),
      ];

      // WHEN
      const result = validateChallenges(challenges, 'en');

      // THEN - All 7 should be returned
      expect(result.length).toBe(7);
    });
  });
});
