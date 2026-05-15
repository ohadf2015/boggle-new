/**
 * Daily Challenge → Weekly Quest crediting rule.
 *
 * Bug: none of the three daily-challenge submit endpoints ever called
 * updateQuestProgress, so the `daily_challenges` weekly quest could never
 * progress. The gate for "this submission counts as a completed daily
 * challenge" differs per mode, so the decision is a pure, testable helper.
 * The completion rule must match the weekly-chest streak filter.
 */

import { describe, it, expect } from 'vitest';
import { shouldCreditDailyChallengeQuest } from '../questCredit';

describe('shouldCreditDailyChallengeQuest', () => {
  it('does not credit guests (no playerId)', () => {
    expect(
      shouldCreditDailyChallengeQuest({ mode: 'puzzle', playerId: null, wordCount: 5 }),
    ).toBe(false);
    expect(
      shouldCreditDailyChallengeQuest({ mode: 'word_hunt', playerId: undefined, solved: true }),
    ).toBe(false);
  });

  it('does not credit retries (first attempt already counted)', () => {
    expect(
      shouldCreditDailyChallengeQuest({ mode: 'puzzle', playerId: 'p1', wordCount: 5, isRetry: true }),
    ).toBe(false);
    expect(
      shouldCreditDailyChallengeQuest({ mode: 'word_hunt', playerId: 'p1', solved: true, isRetry: true }),
    ).toBe(false);
  });

  it('credits a classic puzzle only when at least one word was found', () => {
    expect(
      shouldCreditDailyChallengeQuest({ mode: 'puzzle', playerId: 'p1', wordCount: 5 }),
    ).toBe(true);
    expect(
      shouldCreditDailyChallengeQuest({ mode: 'puzzle', playerId: 'p1', wordCount: 0 }),
    ).toBe(false);
    expect(
      shouldCreditDailyChallengeQuest({ mode: 'puzzle', playerId: 'p1' }),
    ).toBe(false);
  });

  it('credits Word Hunt only when solved', () => {
    expect(
      shouldCreditDailyChallengeQuest({ mode: 'word_hunt', playerId: 'p1', solved: true }),
    ).toBe(true);
    expect(
      shouldCreditDailyChallengeQuest({ mode: 'word_hunt', playerId: 'p1', solved: false }),
    ).toBe(false);
  });

  it('credits Word Wheel only when at least one word was found', () => {
    expect(
      shouldCreditDailyChallengeQuest({ mode: 'word_wheel', playerId: 'p1', wordCount: 3 }),
    ).toBe(true);
    expect(
      shouldCreditDailyChallengeQuest({ mode: 'word_wheel', playerId: 'p1', wordCount: 0 }),
    ).toBe(false);
    expect(
      shouldCreditDailyChallengeQuest({ mode: 'word_wheel', playerId: 'p1' }),
    ).toBe(false);
  });
});
