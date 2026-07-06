/**
 * Wheel Rush Manager Tests
 * Pure logic: puzzle gen, validation, parallel word discovery + first-finder bonus.
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
} from '../wheelRushManager';
import {
  WHEEL_RUSH_FIRST_FINDER_BONUS,
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

    it('is deterministic for the same round salt', () => {
      const a = generateWheelPuzzle('GAME1', 'en', 3);
      const b = generateWheelPuzzle('GAME1', 'en', 3);
      expect(a).toEqual(b);
    });

    it('produces fresh letters across rounds (different salt)', () => {
      // Same gameCode, successive rounds (gameSessionId) must not repeat the
      // same wheel — players reported "same letters every round".
      const puzzles = [0, 1, 2, 3, 4].map(r => generateWheelPuzzle('GAME1', 'en', r));
      const signatures = new Set(puzzles.map(p => p.allLetters.join('')));
      // At least most rounds differ — a deterministic seed must not collapse
      // every round to one puzzle.
      expect(signatures.size).toBeGreaterThan(1);
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
    it('still accepts a word another player already found (parallel discovery)', () => {
      const s = state();
      // Simulate p2 having already claimed CANE — it must remain valid for p1.
      applyWheelWord(s, 'p2', 'CANE', 1000);
      expect(validateWheelSubmission(s, 'CANE', 'en')).toEqual({ valid: true });
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

  describe('applyWheelWord — parallel discovery + first-finder bonus', () => {
    const puzzle = { centerLetter: 'C', outerLetters: ['A','N','E','S','T','X'], allLetters: ['C','A','N','E','S','T','X'] };

    it('first finder gets base score + first-finder bonus and is recorded', () => {
      const s = initWheelRushState(puzzle, ['p1','p2'], 1000);
      const r = applyWheelWord(s, 'p1', 'CANE', 1000);
      expect(r.kind).toBe('scored');
      if (r.kind === 'scored') {
        expect(r.firstFinder).toBe(true);
        expect(r.firstFinderBonus).toBe(WHEEL_RUSH_FIRST_FINDER_BONUS);
        expect(r.score).toBe(calculateWordScoreByLength(4) + WHEEL_RUSH_FIRST_FINDER_BONUS);
      }
      expect(s.firstFinders['CANE']).toBe('p1');
      expect(s.foundWords.p1).toContain('CANE');
    });

    it('a second player can still claim the same word — no lock, base score only', () => {
      const s = initWheelRushState(puzzle, ['p1','p2'], 1000);
      applyWheelWord(s, 'p1', 'CANE', 1000);
      const r = applyWheelWord(s, 'p2', 'CANE', 1500);
      expect(r.kind).toBe('scored');
      if (r.kind === 'scored') {
        expect(r.firstFinder).toBe(false);
        expect(r.firstFinderBonus).toBe(0);
        expect(r.score).toBe(calculateWordScoreByLength(4));
      }
      // The word stays credited to BOTH players (parallel discovery).
      expect(s.foundWords.p1).toContain('CANE');
      expect(s.foundWords.p2).toContain('CANE');
      // First-finder attribution never changes hands.
      expect(s.firstFinders['CANE']).toBe('p1');
    });

    it('rejects duplicate by same user', () => {
      const s = initWheelRushState(puzzle, ['p1','p2'], 1000);
      applyWheelWord(s, 'p1', 'CANE', 1000);
      const r = applyWheelWord(s, 'p1', 'CANE', 1500);
      expect(r.kind).toBe('rejected');
    });
  });

  describe('playerStats tracking', () => {
    const puzzle = { centerLetter: 'C', outerLetters: ['A','N','E','S','T','X'], allLetters: ['C','A','N','E','S','T','X'] };

    it('initWheelRushState seeds empty playerStats + firstFinders', () => {
      const s = initWheelRushState(puzzle, ['p1','p2'], 1000);
      expect(s.playerStats).toEqual({
        p1: { wordsLocked: 0, wordsStolen: 0, wordsStolenFromMe: 0, bestWord: '', totalScore: 0 },
        p2: { wordsLocked: 0, wordsStolen: 0, wordsStolenFromMe: 0, bestWord: '', totalScore: 0 },
      });
      expect(s.firstFinders).toEqual({});
    });

    it('scored outcome increments wordsLocked (words found) and totalScore', () => {
      const s = initWheelRushState(puzzle, ['p1','p2'], 1000);
      const r = applyWheelWord(s, 'p1', 'CANE', 1000);
      expect(r.kind).toBe('scored');
      expect(s.playerStats.p1.wordsLocked).toBe(1);
      if (r.kind === 'scored') {
        expect(s.playerStats.p1.totalScore).toBe(r.score);
      }
      expect(s.playerStats.p1.bestWord).toBe('CANE');
    });

    it('first-finder count (wordsStolen) only increments for the first finder', () => {
      const s = initWheelRushState(puzzle, ['p1','p2'], 1000);
      applyWheelWord(s, 'p1', 'CANE', 1000);  // p1 first
      applyWheelWord(s, 'p2', 'CANE', 1500);  // p2 not first
      expect(s.playerStats.p1.wordsStolen).toBe(1);
      expect(s.playerStats.p2.wordsStolen).toBe(0);
      // No stealing occurs, so nothing is ever debited.
      expect(s.playerStats.p1.wordsStolenFromMe).toBe(0);
    });

    it('bestWord tracks longest word', () => {
      const s = initWheelRushState(puzzle, ['p1'], 1000);
      applyWheelWord(s, 'p1', 'CANE', 1000);
      applyWheelWord(s, 'p1', 'CANES', 1002);
      expect(s.playerStats.p1.bestWord).toBe('CANES');
    });

    it('bestWord does not shrink when shorter word follows', () => {
      const s = initWheelRushState(puzzle, ['p1'], 1000);
      applyWheelWord(s, 'p1', 'CANES', 1000);
      applyWheelWord(s, 'p1', 'SCAN', 1002);
      expect(s.playerStats.p1.bestWord).toBe('CANES');
    });
  });
});
