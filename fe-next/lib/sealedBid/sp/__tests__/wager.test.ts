import { describe, it, expect } from 'vitest';
import { oddsMultiplier, settleBid, isHotOdds } from '../wager';

describe('oddsMultiplier', () => {
  it('rarer/longer word pays more than common short word', () => {
    expect(oddsMultiplier('QUIZ')).toBeGreaterThan(oddsMultiplier('CAT'));
    expect(oddsMultiplier('RETINAS')).toBeGreaterThan(oddsMultiplier('RAIN'));
  });
  it('is bounded 1.5..6', () => {
    expect(oddsMultiplier('CAT')).toBeGreaterThanOrEqual(1.5);
    expect(oddsMultiplier('QUIZZERS')).toBeLessThanOrEqual(6);
  });
});

describe('isHotOdds', () => {
  it('is false for a common short word (low multiplier)', () => {
    expect(isHotOdds(oddsMultiplier('CAT'))).toBe(false);
  });
  it('is true once the multiplier nears the 6x cap', () => {
    expect(isHotOdds(oddsMultiplier('QUIZZERS'))).toBe(true);
  });
  it('threshold is 4.5 inclusive', () => {
    expect(isHotOdds(4.5)).toBe(true);
    expect(isHotOdds(4.4)).toBe(false);
  });
});

describe('settleBid', () => {
  const rack = 'AEINRST';
  it('unique pays stake*(mult-1)', () => {
    const s = settleBid({ playerWord: 'RETINAS', botWords: ['TRAIN'], dictOk: true, rack, stake: 20 });
    expect(s.outcome).toBe('unique');
    expect(s.delta).toBe(Math.round(20 * (oddsMultiplier('RETINAS') - 1)));
  });
  it('clash loses stake', () => {
    const s = settleBid({ playerWord: 'TRAIN', botWords: ['TRAIN'], dictOk: true, rack, stake: 20 });
    expect(s.outcome).toBe('clash');
    expect(s.delta).toBe(-20);
  });
  it('deliberate pass (null word) risks nothing', () => {
    const s = settleBid({ playerWord: null, botWords: ['TRAIN'], dictOk: false, rack, stake: 20 });
    expect(s.outcome).toBe('none');
    expect(s.delta).toBe(0);
  });
  it('invalid word (staked) loses small ante', () => {
    const s = settleBid({ playerWord: 'ZZZZ', botWords: [], dictOk: false, rack, stake: 20 });
    expect(s.outcome).toBe('none');
    expect(s.delta).toBe(-5);
  });
});
