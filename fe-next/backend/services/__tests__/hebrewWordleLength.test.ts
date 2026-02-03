/**
 * Tests for Hebrew Wordle Word Length Validation
 *
 * Hebrew words typically have 4-5 letters, not strictly 5 like English.
 * This test ensures language-specific wordle lengths are supported.
 */

import { validateChallenges } from '../buzz/challengeValidator';
import type { BuzzChallenge, ChallengeType } from '../buzz/types';

function createChallenge(type: ChallengeType, answer: string, topic = 'test'): BuzzChallenge {
  return {
    type,
    trend_topic: topic,
    prompt: `Test prompt about ${topic}`, // Don't include answer in prompt (spoiler detection)
    answer,
    difficulty: 'easy' as const,
    trending_context: `Context for ${topic}`,
  };
}

describe('Hebrew Wordle Word Length', () => {
  it('should accept 4-letter Hebrew words for wordle_guess', () => {
    // GIVEN: A set of Hebrew challenges including a 4-letter wordle_guess
    const challenges = [
      createChallenge('riddle', 'ישראל', 'חדשות'),
      createChallenge('wordle_guess', 'כדור', 'ספורט'), // 4 Hebrew letters - should be valid for Hebrew
      createChallenge('anagram', 'טכנולוגיה', 'טק'),
      createChallenge('fill_blank', 'מוסיקה', 'תרבות'),
      createChallenge('word_chain', 'אומנות', 'גלריה'),
    ];

    // WHEN: Validating Hebrew challenges
    const result = validateChallenges(challenges, 'he');

    // THEN: Should pass validation (4 letters is valid for Hebrew)
    expect(result).toBeDefined();
    expect(result.length).toBe(5);

    const wordleChallenge = result.find(c => c.type === 'wordle_guess');
    expect(wordleChallenge).toBeDefined();
    expect(wordleChallenge?.answer).toBe('כדור');
    expect(wordleChallenge?.answer.length).toBe(4);
  });

  it('should accept 5-letter English words for wordle_guess', () => {
    // GIVEN: A set of English challenges including a 5-letter wordle_guess
    const challenges = [
      createChallenge('riddle', 'PUZZLE', 'games'),
      createChallenge('wordle_guess', 'BRAIN', 'science'), // 5 English letters - standard Wordle
      createChallenge('anagram', 'MUSIC', 'culture'),
      createChallenge('fill_blank', 'SPORT', 'athletics'),
      createChallenge('word_chain', 'CHAIN', 'connection'),
    ];

    // WHEN: Validating English challenges
    const result = validateChallenges(challenges, 'en');

    // THEN: Should pass validation (5 letters is valid for English)
    expect(result).toBeDefined();
    expect(result.length).toBe(5);

    const wordleChallenge = result.find(c => c.type === 'wordle_guess');
    expect(wordleChallenge).toBeDefined();
    expect(wordleChallenge?.answer).toBe('BRAIN');
    expect(wordleChallenge?.answer.length).toBe(5);
  });

  it('should reject 6-letter English words for wordle_guess', () => {
    // GIVEN: A set of English challenges including a 6-letter wordle_guess
    const challenges = [
      createChallenge('riddle', 'PUZZLE', 'games'),
      createChallenge('wordle_guess', 'BRAINS', 'science'), // 6 letters - invalid
      createChallenge('anagram', 'MUSIC', 'culture'),
      createChallenge('fill_blank', 'SPORT', 'athletics'),
      createChallenge('word_chain', 'CHAIN', 'connection'),
    ];

    // WHEN & THEN: Should throw error (wordle_guess is filtered out, leaving only 4 valid challenges)
    expect(() => validateChallenges(challenges, 'en')).toThrow(
      'Insufficient validated challenges'
    );
  });

  it('should reject 3-letter Hebrew words for wordle_guess', () => {
    // GIVEN: A set of Hebrew challenges including a 3-letter wordle_guess
    const challenges = [
      createChallenge('riddle', 'ישראל', 'חדשות'),
      createChallenge('wordle_guess', 'כלב', 'חיות'), // 3 letters - too short
      createChallenge('anagram', 'טכנולוגיה', 'טק'),
      createChallenge('fill_blank', 'מוסיקה', 'תרבות'),
      createChallenge('word_chain', 'אומנות', 'גלריה'),
    ];

    // WHEN & THEN: Should throw error (wordle_guess is filtered out, leaving only 4 valid challenges)
    expect(() => validateChallenges(challenges, 'he')).toThrow(
      'Insufficient validated challenges'
    );
  });
});
