import { describe, it, expect } from 'vitest';
import { blastCoinDelta, COIN_TILE_CURRENCY } from '../blastCoinCurrency';

describe('blastCoinDelta', () => {
  it('pays a tenth of the word score, at least one coin', () => {
    expect(blastCoinDelta(42, 0)).toBe(4);
    expect(blastCoinDelta(3, 0)).toBe(1);
  });

  it('adds a fixed payout for every coin tile cleared', () => {
    expect(blastCoinDelta(42, 2)).toBe(4 + 2 * COIN_TILE_CURRENCY);
  });

  it('multiplies the whole payout on a coin-rush wave', () => {
    expect(blastCoinDelta(42, 2, 2)).toBe(2 * (4 + 2 * COIN_TILE_CURRENCY));
  });
});
