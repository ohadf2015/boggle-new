import { describe, it, expect } from 'vitest';
import { shopGoal } from '../shopGoal';

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
