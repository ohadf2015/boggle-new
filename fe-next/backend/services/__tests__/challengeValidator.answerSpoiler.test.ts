/**
 * Tests for Answer Spoiler Detection
 * Ensures the answer does not appear in user-facing fields (prompt and hint)
 * Note: trend_topic and trending_context are metadata and are not checked
 */

import { validateAnswerNotSpoiled, normalizeBlankSizes } from '../buzz/challengeValidator';
import type { BuzzChallenge } from '../buzz/types';

describe('validateAnswerNotSpoiled', () => {
  const createChallenge = (overrides: Partial<BuzzChallenge>): BuzzChallenge => ({
    type: 'fill_blank',
    trend_topic: 'Tech Innovation',
    prompt: 'Complete: _ _ _ _ _ (5 letters)',
    answer: 'SMART',
    hint: 'Think of intelligence',
    difficulty: 'medium',
    trending_context: 'Technology is advancing rapidly',
    ...overrides,
  });

  describe('answer in prompt', () => {
    it('should reject when answer appears exactly in prompt', () => {
      const challenge = createChallenge({
        prompt: 'The SMART device is popular',
        answer: 'SMART',
      });
      expect(validateAnswerNotSpoiled(challenge)).toBe(false);
    });

    it('should reject when answer appears case-insensitively in prompt', () => {
      const challenge = createChallenge({
        prompt: 'A smart device that everyone wants',
        answer: 'SMART',
      });
      expect(validateAnswerNotSpoiled(challenge)).toBe(false);
    });

    it('should accept when answer does NOT appear in prompt', () => {
      const challenge = createChallenge({
        prompt: 'A mobile device that fits in your pocket',
        answer: 'PHONE',
      });
      expect(validateAnswerNotSpoiled(challenge)).toBe(true);
    });

    it('should reject when answer is a substring in prompt word', () => {
      const challenge = createChallenge({
        prompt: 'Smartphones are everywhere',
        answer: 'SMART',
      });
      expect(validateAnswerNotSpoiled(challenge)).toBe(false);
    });
  });

  describe('answer in hint', () => {
    it('should reject when answer appears in hint', () => {
      const challenge = createChallenge({
        hint: 'Everyone wants to be SMART these days',
        answer: 'SMART',
      });
      expect(validateAnswerNotSpoiled(challenge)).toBe(false);
    });

    it('should reject when answer appears case-insensitively in hint', () => {
      const challenge = createChallenge({
        hint: 'Being smart is valued',
        answer: 'SMART',
      });
      expect(validateAnswerNotSpoiled(challenge)).toBe(false);
    });

    it('should accept when answer does NOT appear in hint', () => {
      const challenge = createChallenge({
        hint: 'Used for calling people',
        answer: 'PHONE',
      });
      expect(validateAnswerNotSpoiled(challenge)).toBe(true);
    });
  });

  describe('metadata fields (should be ignored)', () => {
    it('should accept when answer appears in trend_topic (metadata field)', () => {
      const challenge = createChallenge({
        trend_topic: 'SMART Technology',
        prompt: 'What device is everywhere?',
        answer: 'SMART',
      });
      // trend_topic is metadata, not shown to user, so this is OK
      expect(validateAnswerNotSpoiled(challenge)).toBe(true);
    });

    it('should accept when answer appears in trending_context (metadata field)', () => {
      const challenge = createChallenge({
        trending_context: 'Everyone wants to be SMART these days',
        prompt: 'What quality is valued in tech?',
        answer: 'SMART',
      });
      // trending_context is metadata, not shown to user, so this is OK
      expect(validateAnswerNotSpoiled(challenge)).toBe(true);
    });
  });

  describe('Hebrew language support', () => {
    it('should detect Hebrew answer in prompt', () => {
      const challenge = createChallenge({
        prompt: 'טכנולוגיה חכמה היא העתיד',
        answer: 'חכמה',
      });
      expect(validateAnswerNotSpoiled(challenge)).toBe(false);
    });

    it('should detect Hebrew answer in hint', () => {
      const challenge = createChallenge({
        hint: 'השימוש בטכנולוגיה חכמה גובר',
        answer: 'חכמה',
      });
      expect(validateAnswerNotSpoiled(challenge)).toBe(false);
    });

    it('should accept Hebrew answer in metadata fields', () => {
      const challenge = createChallenge({
        trend_topic: 'טכנולוגיה חכמה',
        prompt: 'מה העתיד של הטכנולוגיה?',
        answer: 'חכמה',
      });
      // trend_topic is metadata, so this is OK
      expect(validateAnswerNotSpoiled(challenge)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle short answers that might match common words', () => {
      // "AI" appears in "MAIL" but should only match as whole word
      const challenge = createChallenge({
        prompt: 'What powers EMAIL Services?',
        answer: 'AI',
      });
      // This should pass - AI is not a separate word in "EMAIL"
      expect(validateAnswerNotSpoiled(challenge)).toBe(true);
    });

    it('should reject when short answer appears as standalone word in prompt', () => {
      const challenge = createChallenge({
        prompt: 'AI Revolution is here',
        answer: 'AI',
      });
      expect(validateAnswerNotSpoiled(challenge)).toBe(false);
    });

    it('should handle challenges without hint', () => {
      const challenge = createChallenge({
        hint: undefined as any,
        prompt: 'What is the future?',
        answer: 'SMART',
      });
      expect(validateAnswerNotSpoiled(challenge)).toBe(true);
    });
  });
});

describe('normalizeBlankSizes - first letter hint', () => {
  const createFillBlankChallenge = (prompt: string, answer: string): BuzzChallenge => ({
    type: 'fill_blank',
    trend_topic: 'Test Topic',
    prompt,
    answer,
    hint: 'Test hint',
    difficulty: 'medium',
    trending_context: 'Test context',
  });

  it('should add first letter hint to fill_blank prompts', () => {
    const challenges = [
      createFillBlankChallenge('Complete: _____ (5 letters)', 'SMART'),
    ];

    const normalized = normalizeBlankSizes(challenges);

    // Should show: "Complete: S _ _ _ _ (5 letters)"
    expect(normalized[0].prompt).toContain('S _');
    expect(normalized[0].prompt).toMatch(/S\s+_\s+_\s+_\s+_/);
  });

  it('should handle Hebrew first letter hints', () => {
    const challenges = [
      createFillBlankChallenge('השלימו: _____ (5 אותיות)', 'חכמה'),
    ];

    const normalized = normalizeBlankSizes(challenges);

    // Should show first Hebrew letter: ח
    expect(normalized[0].prompt).toContain('ח');
  });

  it('should preserve existing first letter if already present', () => {
    const challenges = [
      createFillBlankChallenge('Complete: S _ _ _ _ (5 letters)', 'SMART'),
    ];

    const normalized = normalizeBlankSizes(challenges);

    // Should not duplicate first letter
    expect(normalized[0].prompt).not.toMatch(/S\s+S/);
    expect(normalized[0].prompt).toContain('S _');
  });

  it('should not modify non-fill_blank challenges', () => {
    const anagramChallenge: BuzzChallenge = {
      type: 'anagram',
      trend_topic: 'Test Topic',
      prompt: 'Unscramble: TRAMS',
      answer: 'SMART',
      hint: 'Test hint',
      difficulty: 'medium',
      trending_context: 'Test context',
    };

    const normalized = normalizeBlankSizes([anagramChallenge]);

    expect(normalized[0].prompt).toBe('Unscramble: TRAMS');
  });

  it('should handle multi-word answers correctly', () => {
    const challenges = [
      createFillBlankChallenge('Complete: ________ (8 letters)', 'COMPUTER'),
    ];

    const normalized = normalizeBlankSizes(challenges);

    // Should show: "Complete: C _ _ _ _ _ _ _ (8 letters)"
    expect(normalized[0].prompt).toContain('C _');
  });
});
