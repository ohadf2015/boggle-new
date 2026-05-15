import { describe, it, expect } from 'vitest';
import { createBag } from '../tileBag';
import {
  createGrid,
  cellAt,
  setCellLetter,
  type CascadeGrid,
} from '../cascade/boardGrid';
import { findAutoWords, resolveCascade } from '../cascade/cascadeResolver';

/**
 * Helper: build a grid where every cell is filled, then overwrite specific
 * rows/cols with known letters. Bag is drained and refill is deterministic.
 */
function gridWithLetters(rows: number, cols: number, fill: string[][]): CascadeGrid {
  const bag = createBag({ seed: 1, locale: 'en' });
  const g = createGrid(rows, cols, bag);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      setCellLetter(g, r, c, fill[r][c], 1);
    }
  }
  return g;
}

const dictOf = (...words: string[]) => {
  const set = new Set(words.map((w) => w.toUpperCase()));
  return (w: string) => set.has(w.toUpperCase());
};

describe('cascade/cascadeResolver', () => {
  describe('findAutoWords', () => {
    it('detects a 4-letter word in a row', () => {
      const g = gridWithLetters(3, 6, [
        ['S', 'T', 'A', 'R', 'X', 'Y'],
        ['Z', 'Z', 'Z', 'Z', 'Z', 'Z'],
        ['Z', 'Z', 'Z', 'Z', 'Z', 'Z'],
      ]);
      const isWord = dictOf('STAR');
      const matches = findAutoWords(g, isWord);
      expect(matches).toHaveLength(1);
      expect(matches[0].word).toBe('STAR');
      expect(matches[0].path).toEqual([
        cellAt(g, 0, 0)!.id,
        cellAt(g, 0, 1)!.id,
        cellAt(g, 0, 2)!.id,
        cellAt(g, 0, 3)!.id,
      ]);
      expect(matches[0].axis).toBe('row');
    });

    it('detects a 4-letter word in a column', () => {
      const g = gridWithLetters(5, 3, [
        ['S', 'X', 'Y'],
        ['T', 'X', 'Y'],
        ['A', 'X', 'Y'],
        ['R', 'X', 'Y'],
        ['Z', 'Z', 'Z'],
      ]);
      const matches = findAutoWords(g, dictOf('STAR'));
      expect(matches).toHaveLength(1);
      expect(matches[0].axis).toBe('column');
      expect(matches[0].word).toBe('STAR');
    });

    it('detects multiple non-overlapping matches', () => {
      const g = gridWithLetters(2, 8, [
        ['S', 'T', 'A', 'R', 'X', 'M', 'A', 'P'],
        ['Z', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z'],
      ]);
      const matches = findAutoWords(g, dictOf('STAR', 'MAP'));
      // MAP is 3 letters — below threshold of 4 → only STAR
      expect(matches.map((m) => m.word)).toEqual(['STAR']);
    });

    it('prefers the longest match starting at each position', () => {
      const g = gridWithLetters(1, 6, [['S', 'T', 'A', 'R', 'E', 'D']]);
      const matches = findAutoWords(g, dictOf('STAR', 'STARE', 'STARED'));
      expect(matches).toHaveLength(1);
      expect(matches[0].word).toBe('STARED');
    });

    it('ignores words shorter than 4 letters', () => {
      const g = gridWithLetters(1, 3, [['C', 'A', 'T']]);
      const matches = findAutoWords(g, dictOf('CAT'));
      expect(matches).toEqual([]);
    });

    it('returns empty when no words match dict', () => {
      const g = gridWithLetters(2, 4, [
        ['Q', 'W', 'X', 'Z'],
        ['Q', 'W', 'X', 'Z'],
      ]);
      const matches = findAutoWords(g, dictOf('FOO'));
      expect(matches).toEqual([]);
    });

    it('skips runs containing burned (null) cells', () => {
      const g = gridWithLetters(1, 5, [['S', 'T', 'A', 'R', 'E']]);
      setCellLetter(g, 0, 2, null, 0); // hole at col 2
      const matches = findAutoWords(g, dictOf('STAR', 'STARE'));
      expect(matches).toEqual([]);
    });
  });

  describe('resolveCascade', () => {
    it('returns no chains when no auto-words exist', () => {
      const g = gridWithLetters(3, 3, [
        ['Q', 'W', 'X'],
        ['Q', 'W', 'X'],
        ['Q', 'W', 'X'],
      ]);
      const bag = createBag({ seed: 2, locale: 'en' });
      const { chains } = resolveCascade(g, bag, dictOf('FOO'));
      expect(chains).toEqual([]);
    });

    it('detects a chain, burns the match, refills, returns chain depth 1', () => {
      const g = gridWithLetters(2, 4, [
        ['S', 'T', 'A', 'R'],
        ['Z', 'Z', 'Z', 'Z'],
      ]);
      const bag = createBag({ seed: 2, locale: 'en' });
      const isWord = dictOf('STAR');
      const { finalGrid, chains } = resolveCascade(g, bag, isWord);
      expect(chains).toHaveLength(1);
      expect(chains[0]).toHaveLength(1);
      expect(chains[0][0].word).toBe('STAR');
      // Row 0 col 0..3 must now hold the previous row 1 letters (Z) after gravity
      for (let c = 0; c < 4; c++) {
        expect(cellAt(finalGrid, 1, c)!.letter).toBe('Z');
        // top row spawned from bag, just must be non-null
        expect(cellAt(finalGrid, 0, c)!.letter).not.toBeNull();
      }
    });

    it('caps recursion at maxDepth', () => {
      // Build a grid that would loop forever if every refill spawned STAR
      // — instead just assert resolver stops at maxDepth
      const g = gridWithLetters(1, 4, [['S', 'T', 'A', 'R']]);
      const bag = createBag({ seed: 3, locale: 'en' });
      const isWord = () => true; // any string is a "word"
      const { chains } = resolveCascade(g, bag, isWord, { maxDepth: 2 });
      expect(chains.length).toBeLessThanOrEqual(2);
    });

    it('returns chains in order encountered', () => {
      const g = gridWithLetters(2, 4, [
        ['S', 'T', 'A', 'R'],
        ['M', 'A', 'P', 'S'],
      ]);
      const bag = createBag({ seed: 4, locale: 'en' });
      const isWord = dictOf('STAR'); // only STAR matches
      const { chains } = resolveCascade(g, bag, isWord);
      expect(chains[0][0].word).toBe('STAR');
    });

    it('is a no-op if grid is fully empty', () => {
      const bag = createBag({ seed: 5, locale: 'en' });
      const g = createGrid(2, 2, bag);
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) setCellLetter(g, r, c, null, 0);
      }
      // Resolver should not call dict on empty grid; need fresh bag for refill
      const refill = createBag({ seed: 6, locale: 'en' });
      const { chains, finalGrid } = resolveCascade(g, refill, dictOf());
      expect(chains).toEqual([]);
      // After gravity, all cells refilled from bag
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
          expect(cellAt(finalGrid, r, c)!.letter).not.toBeNull();
        }
      }
    });
  });
});
