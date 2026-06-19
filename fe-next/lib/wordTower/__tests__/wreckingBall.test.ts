import { describe, it, expect } from 'vitest';
import {
  wreckingBallEarn,
  asyncWreckDamageFloors,
  WRECK_MAX_FLOORS_PER_ATTACK,
  SABOTAGE_TOKEN_CAP,
} from '../sabotage';

describe('wreckingBallEarn — earn on zones + achievements', () => {
  it('credits one charge per new zone entered', () => {
    const r = wreckingBallEarn(0, { totalEarnEvents: 2, credited: 0 });
    expect(r.charges).toBe(2);
    expect(r.credited).toBe(2);
  });
  it('is idempotent — re-evaluating the same totals grants nothing new', () => {
    const r = wreckingBallEarn(2, { totalEarnEvents: 2, credited: 2 });
    expect(r.charges).toBe(2);
    expect(r.credited).toBe(2);
  });
  it('only grants the delta of new events', () => {
    const r = wreckingBallEarn(1, { totalEarnEvents: 4, credited: 2 });
    expect(r.charges).toBe(3); // 1 + (4-2), capped at 3
  });
  it('never exceeds the token cap', () => {
    const r = wreckingBallEarn(0, { totalEarnEvents: 99, credited: 0 });
    expect(r.charges).toBe(SABOTAGE_TOKEN_CAP);
  });
  it('handles spend-then-earn correctly (no phantom re-grant)', () => {
    // earned 3, credited 3, then spent down to 0; a 4th event arrives
    const r = wreckingBallEarn(0, { totalEarnEvents: 4, credited: 3 });
    expect(r.charges).toBe(1);
    expect(r.credited).toBe(4);
  });
});

describe('asyncWreckDamageFloors — server-clampable impact', () => {
  it('scales with the attacker lead over the target', () => {
    const small = asyncWreckDamageFloors(20, 10);
    const big = asyncWreckDamageFloors(400, 10);
    expect(big).toBeGreaterThanOrEqual(small);
  });
  it('never exceeds the per-attack cap', () => {
    expect(asyncWreckDamageFloors(99999, 0)).toBeLessThanOrEqual(WRECK_MAX_FLOORS_PER_ATTACK);
  });
  it('is at least 1 floor (an attack always lands something)', () => {
    expect(asyncWreckDamageFloors(0, 0)).toBeGreaterThanOrEqual(1);
    expect(asyncWreckDamageFloors(-50, 100)).toBeGreaterThanOrEqual(1);
  });
});
