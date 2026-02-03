/**
 * Test: Buzz Generator Wordle Guess Retry Logic
 *
 * Tests that the retry mechanism properly handles missing wordle_guess challenges
 * and includes specific feedback in subsequent attempts.
 */

import { validateChallenges } from '../buzz/challengeValidator';
import type { BuzzChallenge } from '../buzz/types';

describe('Buzz Generator - Wordle Guess Retry Logic', () => {
  describe('validateChallenges with missing wordle_guess', () => {
    it('should throw error when no wordle_guess challenge is present', () => {
      // GIVEN: 5 valid challenges but none are wordle_guess
      const challenges: BuzzChallenge[] = [
        {
          type: 'riddle',
          trend_topic: 'Election',
          prompt: 'I have a mouth but never speak',
          answer: 'RIVER',
          difficulty: 'medium',
          trending_context: 'Election news',
          hint: 'Flows through cities',
        },
        {
          type: 'fill_blank',
          trend_topic: 'Tech Launch',
          prompt: 'The new _ _ _ _ phone',
          answer: 'SMART',
          difficulty: 'easy',
          trending_context: 'Tech event',
        },
        {
          type: 'riddle',
          trend_topic: 'Weather',
          prompt: 'I fall but never get hurt',
          answer: 'RAIN',
          difficulty: 'easy',
          trending_context: 'Storm coming',
        },
        {
          type: 'word_chain',
          trend_topic: 'Sports',
          prompt: 'Used in tennis: _ _ _ _ _',
          answer: 'SERVE',
          difficulty: 'medium',
          trending_context: 'Championship match',
        },
        {
          type: 'riddle',
          trend_topic: 'Music',
          prompt: 'I have keys but open no locks',
          answer: 'PIANO',
          difficulty: 'medium',
          trending_context: 'Concert announcement',
        },
      ];

      // WHEN: Validating challenges
      // THEN: Should throw error about missing wordle_guess
      expect(() => {
        validateChallenges(challenges, 'en');
      }).toThrow('Daily Buzz must include at least one wordle_guess challenge');
    });

    it('should pass validation when wordle_guess challenge is present', () => {
      // GIVEN: 5 valid challenges including one wordle_guess
      const challenges: BuzzChallenge[] = [
        {
          type: 'wordle_guess',
          trend_topic: 'Election',
          prompt: 'Where votes are cast',
          answer: 'BOOTH',
          difficulty: 'medium',
          trending_context: 'Election day',
          hint: 'Voting location',
        },
        {
          type: 'fill_blank',
          trend_topic: 'Tech Launch',
          prompt: 'The new S _ _ _ _ phone',
          answer: 'SMART',
          difficulty: 'easy',
          trending_context: 'Tech event',
        },
        {
          type: 'riddle',
          trend_topic: 'Weather',
          prompt: 'I fall but never get hurt',
          answer: 'RAIN',
          difficulty: 'easy',
          trending_context: 'Storm coming',
        },
        {
          type: 'word_chain',
          trend_topic: 'Sports',
          prompt: 'Used in tennis: _ _ _ _ _',
          answer: 'SERVE',
          difficulty: 'medium',
          trending_context: 'Championship match',
        },
        {
          type: 'riddle',
          trend_topic: 'Music',
          prompt: 'I have keys but open no locks',
          answer: 'PIANO',
          difficulty: 'medium',
          trending_context: 'Concert announcement',
        },
      ];

      // WHEN: Validating challenges
      // THEN: Should not throw and return validated challenges
      expect(() => {
        const validated = validateChallenges(challenges, 'en');
        expect(validated).toHaveLength(5);
        expect(validated.some(c => c.type === 'wordle_guess')).toBe(true);
      }).not.toThrow();
    });

    it('should detect missing wordle_guess even when 5+ challenges pass other validations', () => {
      // GIVEN: 7 challenges, all valid except none are wordle_guess
      const challenges: BuzzChallenge[] = [
        {
          type: 'riddle',
          trend_topic: 'Election',
          prompt: 'I have a mouth but never speak',
          answer: 'RIVER',
          difficulty: 'medium',
          trending_context: 'Election news',
          hint: 'Flows through cities',
        },
        {
          type: 'fill_blank',
          trend_topic: 'Tech Launch',
          prompt: 'The new S _ _ _ _ phone',
          answer: 'SMART',
          difficulty: 'easy',
          trending_context: 'Tech event',
        },
        {
          type: 'riddle',
          trend_topic: 'Weather',
          prompt: 'I fall but never get hurt',
          answer: 'RAIN',
          difficulty: 'easy',
          trending_context: 'Storm coming',
        },
        {
          type: 'word_chain',
          trend_topic: 'Sports',
          prompt: 'Used in tennis',
          answer: 'SERVE',
          difficulty: 'medium',
          trending_context: 'Championship match',
        },
        {
          type: 'riddle',
          trend_topic: 'Music',
          prompt: 'I have keys but open no locks',
          answer: 'PIANO',
          difficulty: 'medium',
          trending_context: 'Concert announcement',
        },
        {
          type: 'fill_blank',
          trend_topic: 'Movie',
          prompt: 'The _ _ _ _ _ award',
          answer: 'OSCAR',
          difficulty: 'easy',
          trending_context: 'Award show',
        },
        {
          type: 'riddle',
          trend_topic: 'Tech',
          prompt: 'I connect the world but never move',
          answer: 'CABLE',
          difficulty: 'medium',
          trending_context: 'Internet infrastructure',
        },
      ];

      // WHEN: Validating challenges
      // THEN: Should throw error about missing wordle_guess (not about insufficient count)
      expect(() => {
        validateChallenges(challenges, 'en');
      }).toThrow('Daily Buzz must include at least one wordle_guess challenge');
    });
  });
});
