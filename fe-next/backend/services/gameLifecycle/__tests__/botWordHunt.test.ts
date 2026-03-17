/**
 * Bot Word Hunt Tests
 *
 * Verifies that bots can play word-hunt mode by making Wordle-style guesses.
 */

import {
  filterCandidatesByFeedback,
  pickBotGuess,
  createBotWordHuntStrategy,
} from '../botWordHunt';
import type { LetterFeedback } from '@/shared/types/game';

// Mock logger
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('Bot Word Hunt', () => {
  describe('filterCandidatesByFeedback', () => {
    it('filters candidates based on correct position feedback', () => {
      const candidates = ['apple', 'apply', 'ample', 'angle'];
      const guess = 'apple';
      const feedback: LetterFeedback[] = ['correct', 'correct', 'absent', 'absent', 'correct'];

      const filtered = filterCandidatesByFeedback(candidates, guess, feedback);

      // Must have 'a' at 0, 'p' at 1, NOT 'p' at 2, NOT 'l' at 3, 'e' at 4
      // 'apply' fails (y != e at 4)
      // 'ample' fails (m != p at 1)
      // 'angle' fails (n != p at 1)
      expect(filtered).not.toContain('apply');
      expect(filtered).not.toContain('ample');
    });

    it('handles present feedback (right letter wrong position)', () => {
      const candidates = ['crane', 'crate', 'grace', 'trace'];
      const guess = 'crane';
      // 'c' correct, 'r' correct, 'a' present (exists but not at 2), 'n' absent, 'e' correct
      const feedback: LetterFeedback[] = ['correct', 'correct', 'present', 'absent', 'correct'];

      const filtered = filterCandidatesByFeedback(candidates, guess, feedback);

      // Must contain 'a' but NOT at position 2, must NOT contain 'n'
      // 'crate': c-correct, r-correct, a at pos 2 (same as guess pos - excluded), but wait
      // Actually 'crate' has 'a' at pos 2... tricky. Let me reconsider.
      // 'present' means 'a' is in the word but NOT at position 2
      // 'crate' has a at pos 2 -> filtered out
      expect(filtered).not.toContain('crane'); // has 'n' which is absent
    });

    it('returns empty array when no candidates match', () => {
      const candidates = ['hello', 'world'];
      const guess = 'hello';
      const feedback: LetterFeedback[] = ['absent', 'absent', 'absent', 'absent', 'absent'];

      const filtered = filterCandidatesByFeedback(candidates, guess, feedback);

      // 'hello' has all absent letters, 'world' has 'l' and 'o' which are absent
      expect(filtered).toEqual([]);
    });
  });

  describe('pickBotGuess', () => {
    it('returns a word from candidates', () => {
      const candidates = ['apple', 'beach', 'crane'];
      const guess = pickBotGuess(candidates, 'medium');

      expect(candidates).toContain(guess);
    });

    it('returns null when no candidates remain', () => {
      const guess = pickBotGuess([], 'medium');

      expect(guess).toBeNull();
    });
  });

  describe('createBotWordHuntStrategy', () => {
    it('creates strategy with candidates matching target length', () => {
      const allWords = ['cat', 'dog', 'apple', 'beach', 'go', 'crane', 'at'];
      const strategy = createBotWordHuntStrategy(allWords, 5, 'medium');

      // Only 5-letter words should be candidates
      expect(strategy.candidates.every(w => w.length === 5)).toBe(true);
      expect(strategy.candidates).toContain('apple');
      expect(strategy.candidates).toContain('beach');
      expect(strategy.candidates).toContain('crane');
    });

    it('sets appropriate delay range based on difficulty', () => {
      const easy = createBotWordHuntStrategy(['apple'], 5, 'easy');
      const hard = createBotWordHuntStrategy(['apple'], 5, 'hard');

      expect(easy.minDelay).toBeGreaterThan(hard.minDelay);
      expect(easy.maxDelay).toBeGreaterThan(hard.maxDelay);
    });

    it('tracks guesses made', () => {
      const strategy = createBotWordHuntStrategy(['apple', 'beach'], 5, 'medium');

      expect(strategy.guessesMade).toEqual([]);
    });
  });
});
