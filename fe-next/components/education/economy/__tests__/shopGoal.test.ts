import { describe, it, expect } from 'vitest';
import { shopGoal, powerUpStatus, readyPowerUpCount } from '../shopGoal';

describe('shopGoal', () => {
  it('Given no cash, Then the goal is the cheapest power-up with the full price to save', () => {
    expect(shopGoal(0)).toEqual({ kind: 'save', id: 'hintReveal', cost: 10, missing: 10 });
  });

  it('Given cash past the cheapest price, Then the goal moves to the next unaffordable power-up', () => {
    expect(shopGoal(12)).toEqual({ kind: 'save', id: 'doubleCash', cost: 15, missing: 3 });
  });

  it('Given cash that covers every power-up, Then the goal says one is ready to buy', () => {
    expect(shopGoal(40)).toEqual({ kind: 'ready', id: 'hintReveal', cost: 10 });
  });
});

describe('powerUpStatus / readyPowerUpCount', () => {
  const base = { cash: 12, shieldHeld: false, doubleCashMsLeft: 0 };

  it('says how much is missing for an item the student cannot afford yet', () => {
    expect(powerUpStatus(base, 'streakShield')).toEqual({ kind: 'short', missing: 8 });
    expect(powerUpStatus(base, 'hintReveal')).toEqual({ kind: 'ready' });
  });

  it('owned and round-only beat price', () => {
    expect(powerUpStatus({ ...base, cash: 99, shieldHeld: true }, 'streakShield')).toEqual({ kind: 'owned' });
    expect(powerUpStatus({ ...base, cash: 99 }, 'doubleCash', true)).toEqual({ kind: 'roundOnly' });
  });

  it('counts what the student can buy right now', () => {
    expect(readyPowerUpCount(base)).toBe(1);
    expect(readyPowerUpCount({ ...base, cash: 50 })).toBe(3);
    expect(readyPowerUpCount({ ...base, cash: 50, shieldHeld: true })).toBe(2);
  });
});
