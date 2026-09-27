/**
 * Daily Challenge → Weekly Quest crediting rule.
 *
 * Per mode:
 * - puzzle / word_wheel: first attempt with at least one word counts; retries skip
 *   (first attempt already accumulated the word_count).
 * - word_hunt: counts on the submission that **transitions** the attempt to
 *   solved=true. A paid retry that flips solved=false → solved=true MUST credit;
 *   re-submitting an already-solved attempt must NOT double-credit.
 *
 * Gate must stay in sync with weekly-chest streak filter (status/claim routes)
 * so a submission never credits the quest but not the streak (or vice versa).
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

  it('credits a classic puzzle only when at least one word was found, first attempt only', () => {
    expect(
      shouldCreditDailyChallengeQuest({ mode: 'puzzle', playerId: 'p1', wordCount: 5 }),
    ).toBe(true);
    expect(
      shouldCreditDailyChallengeQuest({ mode: 'puzzle', playerId: 'p1', wordCount: 0 }),
    ).toBe(false);
    expect(
      shouldCreditDailyChallengeQuest({ mode: 'puzzle', playerId: 'p1' }),
    ).toBe(false);
    expect(
      shouldCreditDailyChallengeQuest({ mode: 'puzzle', playerId: 'p1', wordCount: 5, isRetry: true }),
    ).toBe(false);
  });

  it('credits Word Wheel only when at least one word was found, first attempt only', () => {
    expect(
      shouldCreditDailyChallengeQuest({ mode: 'word_wheel', playerId: 'p1', wordCount: 3 }),
    ).toBe(true);
    expect(
      shouldCreditDailyChallengeQuest({ mode: 'word_wheel', playerId: 'p1', wordCount: 0 }),
    ).toBe(false);
    expect(
      shouldCreditDailyChallengeQuest({ mode: 'word_wheel', playerId: 'p1' }),
    ).toBe(false);
    expect(
      shouldCreditDailyChallengeQuest({ mode: 'word_wheel', playerId: 'p1', wordCount: 3, isRetry: true }),
    ).toBe(false);
  });

  describe('Word Hunt — transition semantics', () => {
    it('credits a first-attempt solve', () => {
      expect(
        shouldCreditDailyChallengeQuest({ mode: 'word_hunt', playerId: 'p1', solved: true }),
      ).toBe(true);
    });

    it('does not credit a first-attempt failure', () => {
      expect(
        shouldCreditDailyChallengeQuest({ mode: 'word_hunt', playerId: 'p1', solved: false }),
      ).toBe(false);
    });

    it('credits a retry that flips a previously-failed attempt to solved', () => {
      // This is the bug fix: a paid retry after a failed first attempt previously
      // never advanced the daily_challenges quest, even though the player
      // legitimately completed the daily.
      expect(
        shouldCreditDailyChallengeQuest({
          mode: 'word_hunt',
          playerId: 'p1',
          solved: true,
          isRetry: true,
          wasAlreadySolved: false,
        }),
      ).toBe(true);
    });

    it('does NOT double-credit when re-submitting an already-solved attempt', () => {
      expect(
        shouldCreditDailyChallengeQuest({
          mode: 'word_hunt',
          playerId: 'p1',
          solved: true,
          isRetry: true,
          wasAlreadySolved: true,
        }),
      ).toBe(false);
    });

    it('does not credit a retry that is still unsolved', () => {
      expect(
        shouldCreditDailyChallengeQuest({
          mode: 'word_hunt',
          playerId: 'p1',
          solved: false,
          isRetry: true,
          wasAlreadySolved: false,
        }),
      ).toBe(false);
    });
  });
});
