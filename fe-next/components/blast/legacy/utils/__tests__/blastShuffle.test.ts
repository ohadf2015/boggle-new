import { describe, it, expect } from 'vitest';
import { shuffleForPlayableWord } from '../blastShuffle';
import type { BlastTileState } from '../../types';

const WORDS = new Set(['at', 'ta']);
const checkWord = (w: string) => WORDS.has(w.toLowerCase());

function tiles(live: Array<[number, number]>): BlastTileState[][] {
  return Array.from({ length: 3 }, (_, r) => Array.from({ length: 3 }, (_, c) => ({
    uid: `${r}-${c}`, row: r, col: c, type: 'standard' as const, activationEffect: null, hitsRemaining: 0,
    isCleared: !live.some(([lr, lc]) => lr === r && lc === c),
  })));
}

const grid = () => [['x', 'x', 'x'], ['x', 'x', 'x'], ['x', 'x', 'x']];
const cycle = (letters: string[]) => { let i = 0; return () => letters[i++ % letters.length]; };

describe('shuffleForPlayableWord', () => {
  it('re-rolls the live letters until a word can be played', () => {
    const t = tiles([[0, 0], [0, 1]]);
    const next = shuffleForPlayableWord(grid(), t, checkWord, 2, cycle(['q', 'z', 'a', 't']));
    expect(next).not.toBeNull();
    expect(WORDS.has(next![0][0] + next![0][1])).toBe(true);
  });

  it('leaves cleared cells untouched', () => {
    const t = tiles([[0, 0], [0, 1]]);
    const next = shuffleForPlayableWord(grid(), t, checkWord, 2, cycle(['a', 't']))!;
    expect(next[2]).toEqual(['x', 'x', 'x']);
  });

  it('gives up when the live tiles are too scattered to ever spell a word', () => {
    const t = tiles([[0, 0], [2, 2]]);
    expect(shuffleForPlayableWord(grid(), t, checkWord, 2, cycle(['a', 't']))).toBeNull();
  });

  it('gives up after a bounded number of re-rolls', () => {
    const t = tiles([[0, 0], [0, 1]]);
    let calls = 0;
    const result = shuffleForPlayableWord(grid(), t, checkWord, 2, () => { calls++; return 'q'; });
    expect(result).toBeNull();
    expect(calls).toBeLessThanOrEqual(2 * 40);
  });
});
