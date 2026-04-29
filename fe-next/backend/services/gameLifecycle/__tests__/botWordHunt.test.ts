/**
 * Bot Word Hunt Tests
 *
 * Verifies that bots can play word-hunt mode by making Wordle-style guesses.
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import {
  filterCandidatesByFeedback,
  pickBotGuess,
  createBotWordHuntStrategy,
  type BotWordHuntStrategy,
} from '../botWordHunt';
import type { LetterFeedback } from '@/shared/types/game';

// Mock logger
vi.mock('../../../utils/logger', () => ({ default: {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
} }));

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
      const strategy = createBotWordHuntStrategy(allWords, 5, 'medium', 'apple');

      // Only 5-letter words should be candidates
      expect(strategy.candidates.every(w => w.length === 5)).toBe(true);
      expect(strategy.candidates).toContain('apple');
      expect(strategy.candidates).toContain('beach');
      expect(strategy.candidates).toContain('crane');
    });

    it('sets appropriate delay range based on difficulty', () => {
      const easy = createBotWordHuntStrategy(['apple'], 5, 'easy', 'apple');
      const hard = createBotWordHuntStrategy(['apple'], 5, 'hard', 'apple');

      expect(easy.minDelay).toBeGreaterThan(hard.minDelay);
      expect(easy.maxDelay).toBeGreaterThan(hard.maxDelay);
    });

    it('tracks guesses made', () => {
      const strategy = createBotWordHuntStrategy(['apple', 'beach'], 5, 'medium', 'apple');

      expect(strategy.guessesMade).toEqual([]);
    });

    it('stores targetWord, minWrongGuesses, and stumbleChance', () => {
      const strategy = createBotWordHuntStrategy(['apple', 'beach'], 5, 'medium', 'apple');

      expect(strategy.targetWord).toBe('apple');
      expect(strategy.minWrongGuesses).toBeGreaterThan(0);
      expect(strategy.stumbleChance).toBeGreaterThan(0);
      expect(strategy.stumbleChance).toBeLessThan(1);
    });

    it('easy bots require more wrong guesses than hard bots', () => {
      const easy = createBotWordHuntStrategy(['apple'], 5, 'easy', 'apple');
      const hard = createBotWordHuntStrategy(['apple'], 5, 'hard', 'apple');

      expect(easy.minWrongGuesses).toBeGreaterThan(hard.minWrongGuesses);
    });
  });

  describe('pickBotGuess - human-like behavior', () => {
    it('avoids the target word when not enough wrong guesses made', () => {
      const strategy: BotWordHuntStrategy = {
        candidates: ['apple', 'beach', 'crane'],
        guessesMade: [],
        minDelay: 5000,
        maxDelay: 10000,
        startDelay: 10000,
        minWrongGuesses: 2,
        stumbleChance: 0,
        targetWord: 'apple',
      };

      // Run multiple times to verify it never picks the target
      for (let i = 0; i < 50; i++) {
        const guess = pickBotGuess(strategy.candidates, 'medium', strategy);
        expect(guess).not.toBe('apple');
      }
    });

    it('can pick the target word after enough wrong guesses (no stumble)', () => {
      const strategy: BotWordHuntStrategy = {
        candidates: ['apple'],
        guessesMade: ['beach', 'crane'],
        minDelay: 5000,
        maxDelay: 10000,
        startDelay: 10000,
        minWrongGuesses: 2,
        stumbleChance: 0, // no stumble — should always pick target
        targetWord: 'apple',
      };

      const guess = pickBotGuess(strategy.candidates, 'medium', strategy);
      expect(guess).toBe('apple');
    });

    it('stumbles past the target word based on stumbleChance', () => {
      // With 100% stumble chance and other candidates available, should never pick target
      const strategy: BotWordHuntStrategy = {
        candidates: ['apple', 'beach', 'crane'],
        guessesMade: ['x', 'y'], // past minWrongGuesses
        minDelay: 5000,
        maxDelay: 10000,
        startDelay: 10000,
        minWrongGuesses: 2,
        stumbleChance: 1.0,
        targetWord: 'apple',
      };

      for (let i = 0; i < 50; i++) {
        const guess = pickBotGuess(strategy.candidates, 'medium', strategy);
        expect(guess).not.toBe('apple');
      }
    });

    it('picks target when stumbleChance is 0 and only target left', () => {
      const strategy: BotWordHuntStrategy = {
        candidates: ['apple'],
        guessesMade: ['x', 'y'],
        minDelay: 5000,
        maxDelay: 10000,
        startDelay: 10000,
        minWrongGuesses: 2,
        stumbleChance: 1.0, // stumble chance high but no alternatives
        targetWord: 'apple',
      };

      // Only candidate is the target — must return it regardless of stumble
      const guess = pickBotGuess(strategy.candidates, 'medium', strategy);
      expect(guess).toBe('apple');
    });

    it('falls back to target if it is the only candidate before min guesses', () => {
      const strategy: BotWordHuntStrategy = {
        candidates: ['apple'],
        guessesMade: [],
        minDelay: 5000,
        maxDelay: 10000,
        startDelay: 10000,
        minWrongGuesses: 2,
        stumbleChance: 0,
        targetWord: 'apple',
      };

      // Only candidate is the target — must return it
      const guess = pickBotGuess(strategy.candidates, 'medium', strategy);
      expect(guess).toBe('apple');
    });
  });
});
