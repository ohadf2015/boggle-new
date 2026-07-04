import { describe, it, expect } from 'vitest';
import { rollGemDrop } from '../blastGemDrop';

describe('rollGemDrop', () => {
  it('drops nothing for an ordinary short word', () => {
    expect(rollGemDrop({ wordLength: 4 })).toBe(0);
  });

  it('drops a gem for a gem-letter word', () => {
    expect(rollGemDrop({ wordLength: 4, hasGemLetter: true })).toBe(1);
  });

  it('drops a gem for a long word (>= 7)', () => {
    expect(rollGemDrop({ wordLength: 7 })).toBe(1);
  });

  it('drops extra gems on a jackpot treasure roll', () => {
    expect(rollGemDrop({ wordLength: 4, treasureTier: 'jackpot' })).toBe(2);
  });

  it('stacks reasons but stays capped', () => {
    // gem-letter (1) + long (1) + jackpot (2) + combo (1) = 5, capped at 5
    const n = rollGemDrop({ wordLength: 8, hasGemLetter: true, treasureTier: 'jackpot', comboLevel: 2 });
    expect(n).toBe(5);
  });

  it('never returns a negative or fractional count', () => {
    const n = rollGemDrop({ wordLength: 0 });
    expect(n).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(n)).toBe(true);
  });
});
