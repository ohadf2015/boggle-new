/**
 * Tests for Challenge Validator
 * Specifically testing AI field name normalization
 */

import { parseAIResponse, validateChallenges } from '../buzz/challengeValidator';
import type { BuzzChallenge } from '../buzz/types';

describe('parseAIResponse - AI field name normalization', () => {
  // Test case 1: AI returns 'trending_topic' instead of 'trend_topic'
  it('should normalize trending_topic to trend_topic', () => {
    const aiResponse = JSON.stringify({
      date: '2026-01-28',
      language: 'he',
      challenges: [
        {
          type: 'anagram',
          trending_topic: 'ישראל', // Wrong field name - should be trend_topic
          prompt: 'פתרו: לארשי',
          answer: 'ישראל',
          difficulty: 'easy',
          trending_context: 'ישראל בחדשות',
        },
        {
          type: 'fill_blank',
          trending_topic: 'טכנולוגיה',
          prompt: 'השלימו: טכ_ _ _ _ _ _',
          answer: 'טכנולוגיה',
          difficulty: 'medium',
          trending_context: 'חדשות טכנולוגיה',
        },
        {
          type: 'riddle',
          trending_topic: 'ספורט',
          prompt: 'מה זה?',
          answer: 'כדור',
          difficulty: 'easy',
          trending_context: 'ספורט',
        },
        {
          type: 'anagram',
          trending_topic: 'מוסיקה',
          prompt: 'פתרו: הקיסומ',
          answer: 'מוסיקה',
          difficulty: 'easy',
          trending_context: 'מוסיקה',
        },
        {
          type: 'fill_blank',
          trending_topic: 'אומנות',
          prompt: 'השלימו: אומ_ _ _',
          answer: 'אומנות',
          difficulty: 'easy',
          trending_context: 'אומנות',
        },
      ],
    });

    const result = parseAIResponse(aiResponse);

    expect(result.challenges.length).toBe(5);
    // Verify that trend_topic is present on all challenges
    result.challenges.forEach((challenge) => {
      expect(challenge.trend_topic).toBeDefined();
      expect(challenge.trend_topic).not.toBe('');
    });
  });

  // Test case 2: AI returns 'trend' instead of 'trend_topic'
  it('should normalize trend to trend_topic', () => {
    const aiResponse = JSON.stringify({
      date: '2026-01-28',
      language: 'he',
      challenges: [
        {
          type: 'anagram',
          trend: 'ישראל', // Wrong field name
          prompt: 'פתרו: לארשי',
          answer: 'ישראל',
          difficulty: 'easy',
          trending_context: 'ישראל בחדשות',
        },
        {
          type: 'fill_blank',
          trend: 'טכנולוגיה',
          prompt: 'השלימו: טכ_ _ _ _ _ _',
          answer: 'טכנולוגיה',
          difficulty: 'medium',
          trending_context: 'חדשות טכנולוגיה',
        },
        {
          type: 'riddle',
          trend: 'ספורט',
          prompt: 'מה זה?',
          answer: 'כדור',
          difficulty: 'easy',
          trending_context: 'ספורט',
        },
        {
          type: 'anagram',
          trend: 'מוסיקה',
          prompt: 'פתרו: הקיסומ',
          answer: 'מוסיקה',
          difficulty: 'easy',
          trending_context: 'מוסיקה',
        },
        {
          type: 'fill_blank',
          trend: 'אומנות',
          prompt: 'השלימו: אומ_ _ _',
          answer: 'אומנות',
          difficulty: 'easy',
          trending_context: 'אומנות',
        },
      ],
    });

    const result = parseAIResponse(aiResponse);

    expect(result.challenges.length).toBe(5);
    result.challenges.forEach((challenge) => {
      expect(challenge.trend_topic).toBeDefined();
    });
  });

  // Test case 3: AI returns 'clue' instead of 'prompt'
  it('should normalize clue to prompt', () => {
    const aiResponse = JSON.stringify({
      date: '2026-01-28',
      language: 'he',
      challenges: [
        {
          type: 'anagram',
          trend_topic: 'ישראל',
          clue: 'פתרו: לארשי', // Wrong field name - should be prompt
          answer: 'ישראל',
          difficulty: 'easy',
          trending_context: 'ישראל בחדשות',
        },
        {
          type: 'fill_blank',
          trend_topic: 'טכנולוגיה',
          clue: 'השלימו: טכ_ _ _ _ _ _',
          answer: 'טכנולוגיה',
          difficulty: 'medium',
          trending_context: 'חדשות טכנולוגיה',
        },
        {
          type: 'riddle',
          trend_topic: 'ספורט',
          clue: 'מה זה?',
          answer: 'כדור',
          difficulty: 'easy',
          trending_context: 'ספורט',
        },
        {
          type: 'anagram',
          trend_topic: 'מוסיקה',
          clue: 'פתרו: הקיסומ',
          answer: 'מוסיקה',
          difficulty: 'easy',
          trending_context: 'מוסיקה',
        },
        {
          type: 'fill_blank',
          trend_topic: 'אומנות',
          clue: 'השלימו: אומ_ _ _',
          answer: 'אומנות',
          difficulty: 'easy',
          trending_context: 'אומנות',
        },
      ],
    });

    const result = parseAIResponse(aiResponse);

    expect(result.challenges.length).toBe(5);
    result.challenges.forEach((challenge) => {
      expect(challenge.prompt).toBeDefined();
      expect(challenge.prompt).not.toBe('');
    });
  });

  // Test case 4: AI returns 'context' instead of 'trending_context'
  it('should normalize context to trending_context', () => {
    const aiResponse = JSON.stringify({
      date: '2026-01-28',
      language: 'he',
      challenges: [
        {
          type: 'anagram',
          trend_topic: 'ישראל',
          prompt: 'פתרו: לארשי',
          answer: 'ישראל',
          difficulty: 'easy',
          context: 'ישראל בחדשות', // Wrong field name
        },
        {
          type: 'fill_blank',
          trend_topic: 'טכנולוגיה',
          prompt: 'השלימו: טכ_ _ _ _ _ _',
          answer: 'טכנולוגיה',
          difficulty: 'medium',
          context: 'חדשות טכנולוגיה',
        },
        {
          type: 'riddle',
          trend_topic: 'ספורט',
          prompt: 'מה זה?',
          answer: 'כדור',
          difficulty: 'easy',
          context: 'ספורט',
        },
        {
          type: 'anagram',
          trend_topic: 'מוסיקה',
          prompt: 'פתרו: הקיסומ',
          answer: 'מוסיקה',
          difficulty: 'easy',
          context: 'מוסיקה',
        },
        {
          type: 'fill_blank',
          trend_topic: 'אומנות',
          prompt: 'השלימו: אומ_ _ _',
          answer: 'אומנות',
          difficulty: 'easy',
          context: 'אומנות',
        },
      ],
    });

    const result = parseAIResponse(aiResponse);

    expect(result.challenges.length).toBe(5);
    result.challenges.forEach((challenge) => {
      expect(challenge.trending_context).toBeDefined();
    });
  });

  // Test case 5: Multiple field name variants combined
  it('should normalize multiple field name variants in same response', () => {
    const aiResponse = JSON.stringify({
      date: '2026-01-28',
      language: 'he',
      challenges: [
        {
          type: 'anagram',
          trending_topic: 'ישראל', // trending_topic instead of trend_topic
          clue: 'פתרו: לארשי', // clue instead of prompt
          answer: 'ישראל',
          difficulty: 'easy',
          context: 'ישראל בחדשות', // context instead of trending_context
        },
        {
          type: 'fill_blank',
          trend: 'טכנולוגיה', // trend instead of trend_topic
          prompt: 'השלימו: טכ_ _ _ _ _ _',
          answer: 'טכנולוגיה',
          difficulty: 'medium',
          trending_context: 'חדשות טכנולוגיה',
        },
        {
          type: 'riddle',
          topic: 'ספורט', // topic instead of trend_topic
          clue: 'מה זה?',
          answer: 'כדור',
          difficulty: 'easy',
          trending_context: 'ספורט',
        },
        {
          type: 'anagram',
          trend_topic: 'מוסיקה',
          prompt: 'פתרו: הקיסומ',
          answer: 'מוסיקה',
          difficulty: 'easy',
          trending_context: 'מוסיקה',
        },
        {
          type: 'fill_blank',
          trend_topic: 'אומנות',
          prompt: 'השלימו: אומ_ _ _',
          answer: 'אומנות',
          difficulty: 'easy',
          trending_context: 'אומנות',
        },
      ],
    });

    const result = parseAIResponse(aiResponse);

    expect(result.challenges.length).toBe(5);
    result.challenges.forEach((challenge) => {
      expect(challenge.trend_topic).toBeDefined();
      expect(challenge.prompt).toBeDefined();
      expect(challenge.trending_context).toBeDefined();
    });
  });

  // Test case 6: AI returns nested data object structure
  // This bug was discovered in production: AI returned { type, prompt, data: { trend_topic, answer, ... } }
  it('should extract fields from nested data object', () => {
    const aiResponse = JSON.stringify({
      date: '2026-01-28',
      language: 'he',
      challenges: [
        {
          type: 'anagram',
          prompt: 'פתרו: לארשי',
          data: {
            trend_topic: 'ישראל',
            answer: 'ישראל',
            difficulty: 'easy',
            trending_context: 'ישראל בחדשות',
          },
        },
        {
          type: 'fill_blank',
          prompt: 'השלימו: טכ_ _ _ _ _ _',
          data: {
            trend_topic: 'טכנולוגיה',
            answer: 'טכנולוגיה',
            difficulty: 'medium',
            trending_context: 'חדשות טכנולוגיה',
          },
        },
        {
          type: 'riddle',
          prompt: 'מה זה?',
          data: {
            trend_topic: 'ספורט',
            answer: 'כדור',
            difficulty: 'easy',
            trending_context: 'ספורט',
          },
        },
        {
          type: 'anagram',
          prompt: 'פתרו: הקיסומ',
          data: {
            trend_topic: 'מוסיקה',
            answer: 'מוסיקה',
            difficulty: 'easy',
            trending_context: 'מוסיקה',
          },
        },
        {
          type: 'fill_blank',
          prompt: 'השלימו: אומ_ _ _',
          data: {
            trend_topic: 'אומנות',
            answer: 'אומנות',
            difficulty: 'easy',
            trending_context: 'אומנות',
          },
        },
      ],
    });

    const result = parseAIResponse(aiResponse);

    expect(result.challenges.length).toBe(5);
    result.challenges.forEach((challenge) => {
      expect(challenge.type).toBeDefined();
      expect(challenge.trend_topic).toBeDefined();
      expect(challenge.prompt).toBeDefined();
      expect(challenge.answer).toBeDefined();
      expect(challenge.difficulty).toBeDefined();
      expect(challenge.trending_context).toBeDefined();
    });
  });

  // Test case 7: Original correct field names still work
  it('should still work with correct field names', () => {
    const aiResponse = JSON.stringify({
      date: '2026-01-28',
      language: 'he',
      challenges: [
        {
          type: 'anagram',
          trend_topic: 'ישראל',
          prompt: 'פתרו: לארשי',
          answer: 'ישראל',
          difficulty: 'easy',
          trending_context: 'ישראל בחדשות',
        },
        {
          type: 'fill_blank',
          trend_topic: 'טכנולוגיה',
          prompt: 'השלימו: טכ_ _ _ _ _ _',
          answer: 'טכנולוגיה',
          difficulty: 'medium',
          trending_context: 'חדשות טכנולוגיה',
        },
        {
          type: 'riddle',
          trend_topic: 'ספורט',
          prompt: 'מה זה?',
          answer: 'כדור',
          difficulty: 'easy',
          trending_context: 'ספורט',
        },
        {
          type: 'anagram',
          trend_topic: 'מוסיקה',
          prompt: 'פתרו: הקיסומ',
          answer: 'מוסיקה',
          difficulty: 'easy',
          trending_context: 'מוסיקה',
        },
        {
          type: 'fill_blank',
          trend_topic: 'אומנות',
          prompt: 'השלימו: אומ_ _ _',
          answer: 'אומנות',
          difficulty: 'easy',
          trending_context: 'אומנות',
        },
      ],
    });

    const result = parseAIResponse(aiResponse);

    expect(result.challenges.length).toBe(5);
    result.challenges.forEach((challenge) => {
      expect(challenge.trend_topic).toBeDefined();
      expect(challenge.prompt).toBeDefined();
      expect(challenge.trending_context).toBeDefined();
    });
  });
});

describe('validateChallenges - wordle_guess requirement', () => {
  const createChallenge = (type: string, answer: string): BuzzChallenge => ({
    type: type as BuzzChallenge['type'],
    trend_topic: 'Test Topic',
    prompt: 'Test prompt',
    answer,
    difficulty: 'easy',
    trending_context: 'Test context',
  });

  it('should pass validation when wordle_guess is present', () => {
    const challenges = [
      createChallenge('riddle', 'ANSWER'),
      createChallenge('wordle_guess', 'BRAIN'), // 5 letters - valid
      createChallenge('anagram', 'PUZZLE'),
      createChallenge('fill_blank', 'GAME'),
      createChallenge('word_chain', 'CHAIN'),
    ];

    const result = validateChallenges(challenges, 'en');
    expect(result.length).toBe(5);
    expect(result.some(c => c.type === 'wordle_guess')).toBe(true);
  });

  it('should throw error when no wordle_guess challenge is present', () => {
    const challenges = [
      createChallenge('riddle', 'ANSWER'),
      createChallenge('riddle', 'BRAIN'),
      createChallenge('anagram', 'PUZZLE'),
      createChallenge('fill_blank', 'GAME'),
      createChallenge('word_chain', 'CHAIN'),
    ];

    expect(() => validateChallenges(challenges, 'en')).toThrow(
      'Daily Buzz must include at least one wordle_guess challenge'
    );
  });

  it('should reject wordle_guess with wrong letter count', () => {
    const challenges = [
      createChallenge('riddle', 'ANSWER'),
      createChallenge('wordle_guess', 'BRAINS'), // 6 letters - invalid, will be filtered out
      createChallenge('anagram', 'PUZZLE'),
      createChallenge('fill_blank', 'GAME'),
      createChallenge('word_chain', 'CHAIN'),
      createChallenge('riddle', 'EXTRA'), // Add extra to have 5 valid challenges after filtering
    ];

    // The invalid wordle_guess (6 letters) gets filtered out, leaving no valid wordle_guess
    expect(() => validateChallenges(challenges, 'en')).toThrow(
      'Daily Buzz must include at least one wordle_guess challenge'
    );
  });
});
