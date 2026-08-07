import { describe, it, expect } from 'vitest';
import { orderModesForNewcomer } from '../newcomerModeOrder';

describe('orderModesForNewcomer', () => {
  it('demotes blast below the modes newcomers actually finish', () => {
    // What a newcomer gets today: blast is force-promoted to sit right after
    // arena, ahead of connections/brainGym/wordCraft, despite completing at
    // 31% for first-24h players vs 45% for classic and 56% for word-wheel.
    const order = ['practice', 'daily', 'arena', 'blast', 'connections', 'brainGym', 'wordCraft'];

    expect(orderModesForNewcomer(order)).toEqual([
      'practice', 'daily', 'arena', 'connections', 'brainGym', 'wordCraft', 'blast',
    ]);
  });

  it('leaves the relative order of everything else untouched', () => {
    const order = ['daily', 'arena', 'practice', 'connections'];
    expect(orderModesForNewcomer(order)).toEqual(order);
  });

  it('is a no-op when blast is absent (e.g. a locale that hides it)', () => {
    const order = ['practice', 'daily', 'arena'];
    expect(orderModesForNewcomer(order)).toEqual(order);
  });

  it('does not mutate the input', () => {
    const order = ['daily', 'blast', 'arena'];
    const copy = [...order];
    orderModesForNewcomer(order);
    expect(order).toEqual(copy);
  });

  it('handles an empty order', () => {
    expect(orderModesForNewcomer([])).toEqual([]);
  });
});
