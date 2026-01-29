/**
 * Tests for Answer Spoiler Detection
 * Ensures the answer does not appear in trend_topic or trending_context
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

  describe('answer in trend_topic', () => {
    it('should reject when answer appears exactly in trend_topic', () => {
      const challenge = createChallenge({
        trend_topic: 'SMART Technology',
        answer: 'SMART',
      });
      expect(validateAnswerNotSpoiled(challenge)).toBe(false);
    });

    it('should reject when answer appears case-insensitively in trend_topic', () => {
      const challenge = createChallenge({
        trend_topic: 'smart phones are popular',
        answer: 'SMART',
      });
      expect(validateAnswerNotSpoiled(challenge)).toBe(false);
    });

    it('should accept when answer does NOT appear in trend_topic', () => {
      const challenge = createChallenge({
        trend_topic: 'Mobile Technology',
        answer: 'PHONE',
      });
      expect(validateAnswerNotSpoiled(challenge)).toBe(true);
    });

    it('should reject when answer is a substring in trend_topic word', () => {
      const challenge = createChallenge({
        trend_topic: 'Smartphones Revolution',
        answer: 'SMART',
      });
      expect(validateAnswerNotSpoiled(challenge)).toBe(false);
    });
  });

  describe('answer in trending_context', () => {
    it('should reject when answer appears in trending_context', () => {
      const challenge = createChallenge({
        trending_context: 'Everyone wants to be SMART these days',
        answer: 'SMART',
      });
      expect(validateAnswerNotSpoiled(challenge)).toBe(false);
    });

    it('should reject when answer appears case-insensitively in trending_context', () => {
      const challenge = createChallenge({
        trending_context: 'Being smart is valued in tech',
        answer: 'SMART',
      });
      expect(validateAnswerNotSpoiled(challenge)).toBe(false);
    });

    it('should accept when answer does NOT appear in trending_context', () => {
      const challenge = createChallenge({
        trending_context: 'Technology is advancing rapidly',
        answer: 'PHONE',
      });
      expect(validateAnswerNotSpoiled(challenge)).toBe(true);
    });
  });

  describe('Hebrew language support', () => {
    it('should detect Hebrew answer in trend_topic', () => {
      const challenge = createChallenge({
        trend_topic: 'טכנולוגיה חכמה',
        answer: 'חכמה',
      });
      expect(validateAnswerNotSpoiled(challenge)).toBe(false);
    });

    it('should detect Hebrew answer in trending_context', () => {
      const challenge = createChallenge({
        trending_context: 'השימוש בטכנולוגיה חכמה גובר',
        answer: 'חכמה',
      });
      expect(validateAnswerNotSpoiled(challenge)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle short answers that might match common words', () => {
      // "AI" appears in "MAIL" but should only match as whole word
      const challenge = createChallenge({
        trend_topic: 'EMAIL Services',
        answer: 'AI',
      });
      // This should pass - AI is not a separate word in "EMAIL"
      expect(validateAnswerNotSpoiled(challenge)).toBe(true);
    });

    it('should reject when short answer appears as standalone word', () => {
      const challenge = createChallenge({
        trend_topic: 'AI Revolution',
        answer: 'AI',
      });
      expect(validateAnswerNotSpoiled(challenge)).toBe(false);
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
