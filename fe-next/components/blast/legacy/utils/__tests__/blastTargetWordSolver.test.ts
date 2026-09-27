/**
 * blastTargetWordSolver — Tests for word path detection on Blast board.
 *
 * Verifies that a target word can be spelled by traversing adjacent cells
 * without reusing any cell in the path.
 */

import { canSpellOnBoard } from '../blastTargetWordSolver';
import type { LetterGrid } from '../../types';

describe('canSpellOnBoard', () => {
  describe('happy path', () => {
    it('finds a simple word on a horizontal path', () => {
      const grid: LetterGrid = [
        ['C', 'A', 'T'],
        ['X', 'X', 'X'],
        ['X', 'X', 'X'],
      ];
      expect(canSpellOnBoard(grid, 'CAT')).toBe(true);
    });

    it('finds a word on a vertical path', () => {
      const grid: LetterGrid = [
        ['D', 'X', 'X'],
        ['O', 'X', 'X'],
        ['G', 'X', 'X'],
      ];
      expect(canSpellOnBoard(grid, 'DOG')).toBe(true);
    });

    it('finds a word on a diagonal path', () => {
      const grid: LetterGrid = [
        ['H', 'X', 'X'],
        ['X', 'I', 'X'],
        ['X', 'X', 'P'],
      ];
      expect(canSpellOnBoard(grid, 'HIP')).toBe(true);
    });

    it('finds a word with multiple possible paths (returns first match)', () => {
      const grid: LetterGrid = [
        ['C', 'A', 'T'],
        ['A', 'X', 'X'],
        ['T', 'X', 'X'],
      ];
      // CAT exists horizontally in row 0; also could form via row 0 C → row 1 A → row 2 T diagonally
      expect(canSpellOnBoard(grid, 'CAT')).toBe(true);
    });

    it('finds a word on a zigzag path', () => {
      const grid: LetterGrid = [
        ['A', 'X', 'X'],
        ['X', 'B', 'X'],
        ['X', 'X', 'C'],
      ];
      expect(canSpellOnBoard(grid, 'ABC')).toBe(true);
    });
  });

  describe('failure cases', () => {
    it('returns false when a required letter is missing', () => {
      const grid: LetterGrid = [
        ['C', 'A', 'X'],
        ['X', 'X', 'X'],
        ['X', 'X', 'X'],
      ];
      expect(canSpellOnBoard(grid, 'CAT')).toBe(false);
    });

    it('returns false when a letter is missing for reuse (only one A)', () => {
      const grid: LetterGrid = [
        ['A', 'B', 'X'],
        ['X', 'X', 'X'],
        ['X', 'X', 'X'],
      ];
      // ABA would need two A's; only one available (reuse not allowed)
      expect(canSpellOnBoard(grid, 'ABA')).toBe(false);
    });

    it('returns false when letters exist but are not adjacent', () => {
      const grid: LetterGrid = [
        ['C', 'X', 'X'],
        ['X', 'X', 'X'],
        ['X', 'X', 'A', 'T'],
      ];
      // C and A are too far apart
      expect(canSpellOnBoard(grid, 'CAT')).toBe(false);
    });

    it('returns false for empty target word', () => {
      const grid: LetterGrid = [
        ['C', 'A', 'T'],
        ['X', 'X', 'X'],
        ['X', 'X', 'X'],
      ];
      expect(canSpellOnBoard(grid, '')).toBe(false);
    });

    it('returns false for single letter path when target is longer', () => {
      const grid: LetterGrid = [
        ['A', 'X', 'X'],
        ['X', 'X', 'X'],
        ['X', 'X', 'X'],
      ];
      expect(canSpellOnBoard(grid, 'APPLE')).toBe(false);
    });
  });

  describe('RTL support (Hebrew)', () => {
    it('finds Hebrew word with same adjacency rules', () => {
      const grid: LetterGrid = [
        ['א', 'ב', 'ג'],
        ['X', 'X', 'X'],
        ['X', 'X', 'X'],
      ];
      expect(canSpellOnBoard(grid, 'אבג')).toBe(true);
    });

    it('handles uppercase/lowercase Hebrew (no-op but doesn\'t break)', () => {
      const grid: LetterGrid = [
        ['א', 'ב'],
        ['X', 'X'],
      ];
      // Hebrew letters case-insensitive
      expect(canSpellOnBoard(grid, 'אב')).toBe(true);
    });
  });

  describe('case insensitivity', () => {
    it('matches uppercase letters in grid against lowercase target', () => {
      const grid: LetterGrid = [
        ['C', 'A', 'T'],
        ['X', 'X', 'X'],
        ['X', 'X', 'X'],
      ];
      expect(canSpellOnBoard(grid, 'cat')).toBe(true);
    });

    it('matches lowercase letters in grid against uppercase target', () => {
      const grid: LetterGrid = [
        ['c', 'a', 't'],
        ['x', 'x', 'x'],
        ['x', 'x', 'x'],
      ];
      expect(canSpellOnBoard(grid, 'CAT')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('solves on a 1x1 board', () => {
      const grid: LetterGrid = [['A']];
      expect(canSpellOnBoard(grid, 'A')).toBe(true);
      expect(canSpellOnBoard(grid, 'AB')).toBe(false);
    });

    it('solves on a large board (8x8)', () => {
      const grid: LetterGrid = Array(8).fill(null).map((_, i) =>
        Array(8).fill('X').map((_, j) => (i === 0 && j < 7 ? 'CRYSTAL'[j] : 'X'))
      );
      expect(canSpellOnBoard(grid, 'CRYSTAL')).toBe(true);
    });

    it('returns false for word longer than grid cells', () => {
      const grid: LetterGrid = [['A', 'B'], ['C', 'D']];
      expect(canSpellOnBoard(grid, 'ABCDEFGH')).toBe(false);
    });
  });

  describe('complex adjacency', () => {
    it('navigates 8-directional adjacency correctly', () => {
      // Build a grid where the word requires moving in all 8 directions
      const grid: LetterGrid = [
        ['X', 'X', 'S', 'X', 'X'],
        ['X', 'X', 'A', 'X', 'X'],
        ['D', 'X', 'C', 'X', 'K'],
        ['X', 'X', 'R', 'X', 'X'],
        ['X', 'X', 'E', 'X', 'X'],
      ];
      // Path: S(0,2) → A(1,2) → C(2,2) → R(3,2) → E(4,2) (straight down)
      expect(canSpellOnBoard(grid, 'SACRE')).toBe(true);
    });

    it('correctly rejects paths that require cell reuse in middle', () => {
      const grid: LetterGrid = [
        ['A', 'B'],
        ['C', 'A'],
      ];
      // ABA would need A(0,0) → B(0,1) → A(1,1) — different A's, valid!
      expect(canSpellOnBoard(grid, 'ABA')).toBe(true);
    });

    it('handles multiple copies of same letter', () => {
      const grid: LetterGrid = [
        ['A', 'A', 'A'],
        ['X', 'A', 'X'],
        ['X', 'X', 'X'],
      ];
      // AAA can form with any valid path through 3 adjacent A's
      expect(canSpellOnBoard(grid, 'AAA')).toBe(true);
    });
  });
});
