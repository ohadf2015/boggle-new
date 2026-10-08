import { describe, it, expect } from 'vitest';
import { applyRoundBoundary, emptyEconomyState } from '../classroomEconomy';

describe('power-ups across the round boundary', () => {
  it('Given a streak shield bought between rounds, When the next round starts, Then it is still held', () => {
    const bought = { ...emptyEconomyState(), roundId: '7', shieldHeld: true, streak: 4 };
    const next = applyRoundBoundary(bought, '8');
    expect(next.shieldHeld).toBe(true);
    expect(next.streak).toBe(0);
  });
});
