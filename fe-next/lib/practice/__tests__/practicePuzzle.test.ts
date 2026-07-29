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
  it('returns a non-empty pool for all 5 supported languages', () => {
    for (const lang of ['en', 'he', 'sv', 'es', 'ja']) {
      expect(getRiddlePool(lang).length).toBeGreaterThan(0);
    }
  });

  it('returns an empty pool for unsupported languages', () => {
    expect(getRiddlePool('fr')).toEqual([]);
  });

  // 3-4 letters for the embed (clue-then-embed) langs: a 5-letter word can't fit
  // a 4x4 board's embed path. JA uses generate-then-detect with 2-3 kana words.
  it('contains short, embeddable words with non-empty clues', () => {
    const bounds: Record<string, [number, number]> = {
      en: [3, 4], he: [3, 4], sv: [3, 4], es: [3, 4], ja: [2, 3],
    };
    for (const [lang, [min, max]] of Object.entries(bounds)) {
      for (const r of getRiddlePool(lang)) {
        expect(r.word.length).toBeGreaterThanOrEqual(min);
        expect(r.word.length).toBeLessThanOrEqual(max);
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
  it('returns null for unsupported languages', () => {
    expect(pickRiddleTarget('fr', rng0)).toBeNull();
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

  it('calls generate with [] (no embed) when no riddle pool (fr)', () => {
    const calls: string[][] = [];
    const puzzle = generatePracticePuzzle('fr', {
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

  // JA uses generate-then-detect: the riddle is a clued word found ON the board.
  it('detects a findable JA riddle word on a real board', () => {
    let foundRiddle = false;
    for (let i = 0; i < 8; i++) {
      const puzzle = generatePracticePuzzle('ja');
      if (puzzle.riddle) {
        foundRiddle = true;
        expect(isWordOnBoard(puzzle.riddle.word, puzzle.board, 'ja' as Language)).toBe(true);
      }
    }
    // Across 8 boards at least one should yield a clued word (~39/40 hit rate).
    expect(foundRiddle).toBe(true);
  });

  it('produces a 4x4 board by default (real generator)', () => {
    const puzzle = generatePracticePuzzle('en');
    expect(puzzle.board).toHaveLength(4);
    expect(puzzle.board.every((row) => row.length === 4)).toBe(true);
  });
});
