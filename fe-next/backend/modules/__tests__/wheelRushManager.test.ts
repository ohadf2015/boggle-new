/**
 * Wheel Rush Manager Tests
 * Pure logic: puzzle gen, validation, steal-lock state machine, reap.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../boggleSolver', () => ({
  getCachedTrie: vi.fn(() => ({})),
  getTrieNode: vi.fn((_trie: unknown, word: string) => {
    // Real backend Hebrew trie stores normalized forms (sofit→regular); mock matches.
    const dict = new Set(['cane', 'canes', 'scan', 'scant', 'שלומ', 'נלחמ']);
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
  WHEEL_RUSH_PANGRAM_BONUS,
} from '@/shared/constants/wheelRushConstants';
import { calculateWordScoreByLength } from '@/shared/utils/scoring';

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

    // Sofit parity with SP wordWheelGeneration: Hebrew wheel never carries final forms.
    // 4 of 6 he sources end in ם (sofit mem); without normalization the wheel renders ם/ן/ך/ף/ץ.
    it('Hebrew puzzle never contains sofit final forms', () => {
      const sofits = new Set(['ך', 'ם', 'ן', 'ף', 'ץ']);
      // Sample many seeds — sources are deterministic and one branch picks each in turn.
      for (let i = 0; i < 50; i++) {
        const p = generateWheelPuzzle(`HE-${i}`, 'he');
        for (const l of p.allLetters) {
          expect(sofits.has(l), `letter ${l} should not be sofit in seed HE-${i}`).toBe(false);
        }
      }
    });

    // Japanese wheels must be HIRAGANA, not kanji: you can anagram phonetic kana,
    // not logographs. Seeds were kanji-mixed (`新しい世界`) — incoherent for a wheel.
    it('Japanese puzzle contains only hiragana — never kanji', () => {
      const kanji = /[一-龯]/;
      const hiragana = /^[぀-ゟー]$/;
      for (let i = 0; i < 50; i++) {
        const p = generateWheelPuzzle(`JA-${i}`, 'ja');
        expect(p.allLetters).toHaveLength(7);
        expect(new Set(p.allLetters).size).toBe(7);
        for (const l of p.allLetters) {
          expect(kanji.test(l), `letter ${l} is kanji in seed JA-${i}`).toBe(false);
          expect(l, `letter ${l} not hiragana in seed JA-${i}`).toMatch(hiragana);
        }
      }
    });
  });

  describe('validateWheelSubmission', () => {
    const puzzle = { centerLetter: 'C', outerLetters: ['A','N','E','S','T','X'], allLetters: ['C','A','N','E','S','T','X'] };
    const state = () => initWheelRushState(puzzle, ['p1', 'p2'], 1000);

    it('rejects too-short', () => {
      expect(validateWheelSubmission(state(), 'CA', 'en').error).toBe('too-short');
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

    // Hebrew sofit normalization: keyboard input may send the final form (ם)
    // while the wheel exposes only regular forms (מ). Validation must accept both.
    it('Hebrew submission with sofit letter normalizes through validation', () => {
      const puzzleHe = { centerLetter: 'ש', outerLetters: ['ל','ו','מ','נ','ח','ת'], allLetters: ['ש','ל','ו','מ','נ','ח','ת'] };
      const sHe = initWheelRushState(puzzleHe, ['p1'], 1000);
      // 'שלום' = ש-ל-ו-ם (last char is sofit mem — must normalize to מ which is in the wheel).
      expect(validateWheelSubmission(sHe, 'שלום', 'he')).toEqual({ valid: true });
    });
  });

  describe('scoreWheelWord', () => {
    const all = ['C','A','N','E','S','T','X'];
    it('length-based base', () => {
      expect(scoreWheelWord('CANE', all)).toBe(calculateWordScoreByLength(4));
    });
    it('pangram bonus when all letters used', () => {
      // fake word w/ all 7 letters
      expect(scoreWheelWord('CANESTX', all)).toBe(calculateWordScoreByLength(7) + WHEEL_RUSH_PANGRAM_BONUS);
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
        expect(r.score).toBe(Math.round(calculateWordScoreByLength(4) * WHEEL_RUSH_FIRST_FINDER_MULT));
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
        expect(r.score).toBe(calculateWordScoreByLength(4));
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

  describe('playerStats tracking', () => {
    const puzzle = { centerLetter: 'C', outerLetters: ['A','N','E','S','T','X'], allLetters: ['C','A','N','E','S','T','X'] };

    it('initWheelRushState seeds empty playerStats per player', () => {
      const s = initWheelRushState(puzzle, ['p1','p2'], 1000);
      expect(s.playerStats).toEqual({
        p1: { wordsLocked: 0, wordsStolen: 0, wordsStolenFromMe: 0, bestWord: '', totalScore: 0 },
        p2: { wordsLocked: 0, wordsStolen: 0, wordsStolenFromMe: 0, bestWord: '', totalScore: 0 },
      });
    });

    it('locked outcome increments wordsLocked and totalScore', () => {
      const s = initWheelRushState(puzzle, ['p1','p2'], 1000);
      const r = applyWheelWord(s, 'p1', 'CANE', 1000);
      expect(r.kind).toBe('locked');
      expect(s.playerStats.p1.wordsLocked).toBe(1);
      if (r.kind === 'locked') {
        expect(s.playerStats.p1.totalScore).toBe(r.score);
      }
      expect(s.playerStats.p1.bestWord).toBe('CANE');
    });

    it('stolen outcome credits stealer and debits original locker', () => {
      const s = initWheelRushState(puzzle, ['p1','p2'], 1000);
      applyWheelWord(s, 'p1', 'CANE', 1000);
      const r = applyWheelWord(s, 'p2', 'CANE', 1500);
      expect(r.kind).toBe('stolen');
      expect(s.playerStats.p2.wordsStolen).toBe(1);
      expect(s.playerStats.p1.wordsStolenFromMe).toBe(1);
      if (r.kind === 'stolen') {
        expect(s.playerStats.p2.totalScore).toBe(r.score + r.stealBonus);
      }
      expect(s.playerStats.p2.bestWord).toBe('CANE');
    });

    it('bestWord tracks longest word', () => {
      const s = initWheelRushState(puzzle, ['p1'], 1000);
      applyWheelWord(s, 'p1', 'CANE', 1000);
      applyWheelWord(s, 'p1', 'CANES', 1000 + WHEEL_RUSH_LOCK_MS + 2);
      expect(s.playerStats.p1.bestWord).toBe('CANES');
    });

    it('bestWord does not shrink when shorter word follows', () => {
      const s = initWheelRushState(puzzle, ['p1'], 1000);
      applyWheelWord(s, 'p1', 'CANES', 1000);
      applyWheelWord(s, 'p1', 'SCAN', 1000 + WHEEL_RUSH_LOCK_MS + 2);
      expect(s.playerStats.p1.bestWord).toBe('CANES');
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
