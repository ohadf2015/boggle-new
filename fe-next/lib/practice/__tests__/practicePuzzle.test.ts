import { describe, it, expect } from 'vitest';
import {
  getRiddlePool,
  pickRiddleTarget,
  generatePracticePuzzle,
} from '../practicePuzzle';
import { isWordOnBoard } from '@/utils/utils';
import type { Language } from '@/shared/types/game';

// Deterministic RNG that always returns a fixed value (picks index 0).
const rng0 = () => 0;

describe('getRiddlePool', () => {
  it('returns a non-empty pool for EN, HE, SV and ES', () => {
    expect(getRiddlePool('en').length).toBeGreaterThan(0);
    expect(getRiddlePool('he').length).toBeGreaterThan(0);
    expect(getRiddlePool('sv').length).toBeGreaterThan(0);
    expect(getRiddlePool('es').length).toBeGreaterThan(0);
  });

  it('returns an empty pool for Japanese (its generator cannot embed)', () => {
    expect(getRiddlePool('ja')).toEqual([]);
  });

  // 3-4 letters: a 5-letter word cannot fit a 4x4 board's embed path, so the
  // pool is capped at 4 to keep the "guaranteed findable" contract intact.
  it('only contains short (3-4 letter) words with non-empty clues', () => {
    for (const lang of ['en', 'he', 'sv', 'es']) {
      for (const r of getRiddlePool(lang)) {
        expect(r.word.length).toBeGreaterThanOrEqual(3);
        expect(r.word.length).toBeLessThanOrEqual(4);
        expect(r.clue.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('EN words are uppercase A-Z only (board-embeddable)', () => {
    for (const r of getRiddlePool('en')) {
      expect(r.word).toMatch(/^[A-Z]{3,4}$/);
    }
  });

  it('HE words contain no final-form letters (board pool is finals-free)', () => {
    const FINALS = ['ך', 'ם', 'ן', 'ף', 'ץ'];
    for (const r of getRiddlePool('he')) {
      for (const f of FINALS) expect(r.word).not.toContain(f);
    }
  });
});

describe('pickRiddleTarget', () => {
  it('returns null for languages without a riddle pool (ja)', () => {
    expect(pickRiddleTarget('ja', rng0)).toBeNull();
  });

  it('returns a target for languages with a pool (sv/es)', () => {
    expect(pickRiddleTarget('sv', rng0)).toEqual(getRiddlePool('sv')[0]);
    expect(pickRiddleTarget('es', rng0)).toEqual(getRiddlePool('es')[0]);
  });

  it('returns the rng-selected entry for EN', () => {
    const pool = getRiddlePool('en');
    expect(pickRiddleTarget('en', rng0)).toEqual(pool[0]);
  });

  it('rng near 1 selects the last entry (never out of bounds)', () => {
    const pool = getRiddlePool('en');
    const target = pickRiddleTarget('en', () => 0.999999);
    expect(target).toEqual(pool[pool.length - 1]);
  });
});

describe('generatePracticePuzzle', () => {
  it('embeds the riddle word with [word] for EN/HE', () => {
    const calls: string[][] = [];
    const puzzle = generatePracticePuzzle('en', {
      rng: rng0,
      generate: (words) => {
        calls.push(words);
        return [['A', 'B'], ['C', 'D']];
      },
    });
    expect(puzzle.riddle).not.toBeNull();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual([puzzle.riddle!.word]);
  });

  it('calls generate with [] (no embed) when no riddle pool (ja)', () => {
    const calls: string[][] = [];
    const puzzle = generatePracticePuzzle('ja', {
      rng: rng0,
      generate: (words) => {
        calls.push(words);
        return [['A', 'B'], ['C', 'D']];
      },
    });
    expect(puzzle.riddle).toBeNull();
    expect(calls[0]).toEqual([]);
  });

  it('returns the board from the generator', () => {
    const board = [['X', 'Y'], ['Z', 'W']];
    const puzzle = generatePracticePuzzle('es', { rng: rng0, generate: () => board });
    expect(puzzle.board).toBe(board);
  });

  // Integration: real generator must place the riddle answer on the board
  // (the "guaranteed findable" contract). Runs the real embed path.
  it('guarantees the riddle answer is findable on a real generated board (en/he/sv/es)', () => {
    for (const lang of ['en', 'he', 'sv', 'es']) {
      for (let i = 0; i < 5; i++) {
        const puzzle = generatePracticePuzzle(lang);
        expect(puzzle.riddle).not.toBeNull();
        expect(isWordOnBoard(puzzle.riddle!.word, puzzle.board, lang as Language)).toBe(true);
      }
    }
  });

  it('produces a 4x4 board by default (real generator)', () => {
    const puzzle = generatePracticePuzzle('en');
    expect(puzzle.board).toHaveLength(4);
    expect(puzzle.board.every((row) => row.length === 4)).toBe(true);
  });
});
