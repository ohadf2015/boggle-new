import { describe, expect, it } from 'vitest';
import { BLOCK_HEIGHT_PX, blockWidthForWord, scoreFromHeightM } from '../scoring';

describe('blockWidthForWord', () => {
  it('given a longer word, when sized, then the block is wider', () => {
    // The whole design hinges on this: word skill buys you a better *platform*,
    // not a number. A long word is a wide block that is easier to land on next.
    expect(blockWidthForWord('cat')).toBeLessThan(blockWidthForWord('cattle'));
    expect(blockWidthForWord('cattle')).toBeLessThan(blockWidthForWord('cattleman'));
  });

  it('given a three-letter word, when sized, then it is still landable', () => {
    // v1 scored a 3-letter word at literally zero bonus metres, which made the
    // easiest legal move feel like a punishment. Here it is narrow, never useless.
    expect(blockWidthForWord('cat')).toBeGreaterThanOrEqual(60);
  });

  it('given a very long word, when sized, then width is capped', () => {
    // Uncapped width would let one lucky word pave a platform nothing can miss.
    expect(blockWidthForWord('extraordinarily')).toBe(blockWidthForWord('institutions'));
  });

  it('given the same word twice, when sized, then width is identical', () => {
    expect(blockWidthForWord('tower')).toBe(blockWidthForWord('tower'));
  });
});

describe('scoreFromHeightM', () => {
  it('given no tower, when scored, then zero', () => {
    expect(scoreFromHeightM(0)).toBe(0);
  });

  it('given more height, when scored, then more score', () => {
    expect(scoreFromHeightM(12)).toBeGreaterThan(scoreFromHeightM(4));
  });

  it('given a height, when scored, then it is a whole number', () => {
    expect(Number.isInteger(scoreFromHeightM(7.3187))).toBe(true);
  });
});

describe('BLOCK_HEIGHT_PX', () => {
  it('given the block height, when read, then it matches the physics tests', () => {
    expect(BLOCK_HEIGHT_PX).toBe(34);
  });
});
