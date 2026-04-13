/**
 * Wheel Rush Manager Tests
 * Pure logic: puzzle gen, validation, steal-lock state machine, reap.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../boggleSolver', () => ({
  getCachedTrie: vi.fn(() => ({})),
  getTrieNode: vi.fn((_trie: unknown, word: string) => {
    const dict = new Set(['cane', 'canes', 'scan', 'scant', 'שלום', 'נלחם']);
    return dict.has(word.toLowerCase()) ? { isWord: true } : null;
  }),
}));

import {
  generateWheelPuzzle,
  initWheelRushState,
  validateWheelSubmission,
  scoreWheelWord,
  applyWheelWord,
  reapExpiredLocks,
} from '../wheelRushManager';
import {
  WHEEL_RUSH_LOCK_MS,
  WHEEL_RUSH_STEAL_BONUS,
  WHEEL_RUSH_FIRST_FINDER_MULT,
  WHEEL_RUSH_POINTS_PER_LETTER,
  WHEEL_RUSH_PANGRAM_BONUS,
} from '@/shared/constants/wheelRushConstants';

describe('wheelRushManager', () => {
  describe('generateWheelPuzzle', () => {
    it('is deterministic per gameCode+lang', () => {
      const a = generateWheelPuzzle('GAME1', 'en');
      const b = generateWheelPuzzle('GAME1', 'en');
      expect(a).toEqual(b);
    });

    it('produces 7 unique letters with center set', () => {
      const p = generateWheelPuzzle('GAME2', 'en');
      expect(p.allLetters).toHaveLength(7);
      expect(new Set(p.allLetters).size).toBe(7);
      expect(p.centerLetter).toBe(p.allLetters[0]);
      expect(p.outerLetters).toHaveLength(6);
    });

    it('differs across gameCodes', () => {
      const a = generateWheelPuzzle('A', 'en');
      const b = generateWheelPuzzle('B', 'en');
      expect(a).not.toEqual(b);
    });
  });

  describe('validateWheelSubmission', () => {
    const puzzle = { centerLetter: 'C', outerLetters: ['A','N','E','S','T','X'], allLetters: ['C','A','N','E','S','T','X'] };
    const state = () => initWheelRushState(puzzle, ['p1', 'p2'], 1000);

    it('rejects too-short', () => {
      expect(validateWheelSubmission(state(), 'CAN', 'en').error).toBe('too-short');
    });
    it('rejects no-center', () => {
      expect(validateWheelSubmission(state(), 'NEST', 'en').error).toBe('no-center');
    });
    it('rejects bad-letters (letter not in wheel)', () => {
      expect(validateWheelSubmission(state(), 'CZZZ', 'en').error).toBe('bad-letters');
    });
    it('rejects not-a-word', () => {
      expect(validateWheelSubmission(state(), 'CANT', 'en').error).toBe('not-a-word');
    });
    it('accepts valid word', () => {
      expect(validateWheelSubmission(state(), 'CANE', 'en')).toEqual({ valid: true });
    });
    it('rejects already-closed', () => {
      const s = state();
      s.closed.push('CANE');
      expect(validateWheelSubmission(s, 'CANE', 'en').error).toBe('already-closed');
    });
  });

  describe('scoreWheelWord', () => {
    const all = ['C','A','N','E','S','T','X'];
    it('length-based base', () => {
      expect(scoreWheelWord('CANE', all)).toBe(4 * WHEEL_RUSH_POINTS_PER_LETTER);
    });
    it('pangram bonus when all letters used', () => {
      // fake word w/ all 7 letters
      expect(scoreWheelWord('CANESTX', all)).toBe(7 * WHEEL_RUSH_POINTS_PER_LETTER + WHEEL_RUSH_PANGRAM_BONUS);
    });
  });

  describe('applyWheelWord — steal-lock', () => {
    const puzzle = { centerLetter: 'C', outerLetters: ['A','N','E','S','T','X'], allLetters: ['C','A','N','E','S','T','X'] };

    it('first finder gets locked w/ multiplier', () => {
      const s = initWheelRushState(puzzle, ['p1','p2'], 1000);
      const r = applyWheelWord(s, 'p1', 'CANE', 1000);
      expect(r.kind).toBe('locked');
      if (r.kind === 'locked') {
        expect(r.lockUntil).toBe(1000 + WHEEL_RUSH_LOCK_MS);
        expect(r.score).toBe(Math.round(4 * WHEEL_RUSH_POINTS_PER_LETTER * WHEEL_RUSH_FIRST_FINDER_MULT));
      }
      expect(s.locks['CANE'].by).toBe('p1');
    });

    it('second finder during window steals', () => {
      const s = initWheelRushState(puzzle, ['p1','p2'], 1000);
      applyWheelWord(s, 'p1', 'CANE', 1000);
      const r = applyWheelWord(s, 'p2', 'CANE', 1500);
      expect(r.kind).toBe('stolen');
      if (r.kind === 'stolen') {
        expect(r.from).toBe('p1');
        expect(r.stealBonus).toBe(WHEEL_RUSH_STEAL_BONUS);
        expect(r.score).toBe(4 * WHEEL_RUSH_POINTS_PER_LETTER);
      }
      expect(s.closed).toContain('CANE');
      expect(s.locks['CANE']).toBeUndefined();
    });

    it('rejects duplicate by same user', () => {
      const s = initWheelRushState(puzzle, ['p1','p2'], 1000);
      applyWheelWord(s, 'p1', 'CANE', 1000);
      const r = applyWheelWord(s, 'p1', 'CANE', 1500);
      expect(r.kind).toBe('rejected');
    });

    it('after lock expires, next finder becomes new locker', () => {
      const s = initWheelRushState(puzzle, ['p1','p2'], 1000);
      applyWheelWord(s, 'p1', 'CANE', 1000);
      const r = applyWheelWord(s, 'p2', 'CANE', 1000 + WHEEL_RUSH_LOCK_MS + 1);
      expect(r.kind).toBe('locked');
    });
  });

  describe('reapExpiredLocks', () => {
    const puzzle = { centerLetter: 'C', outerLetters: ['A','N','E','S','T','X'], allLetters: ['C','A','N','E','S','T','X'] };
    it('moves expired locks to closed', () => {
      const s = initWheelRushState(puzzle, ['p1'], 1000);
      applyWheelWord(s, 'p1', 'CANE', 1000);
      const reaped = reapExpiredLocks(s, 1000 + WHEEL_RUSH_LOCK_MS + 1);
      expect(reaped).toEqual([{ word: 'CANE', finder: 'p1' }]);
      expect(s.closed).toContain('CANE');
      expect(s.locks['CANE']).toBeUndefined();
    });
    it('leaves active locks intact', () => {
      const s = initWheelRushState(puzzle, ['p1'], 1000);
      applyWheelWord(s, 'p1', 'CANE', 1000);
      const reaped = reapExpiredLocks(s, 1500);
      expect(reaped).toEqual([]);
      expect(s.locks['CANE']).toBeDefined();
    });
  });
});
