import { describe, it, expect } from 'vitest';
import {
  wreckingBallEarn,
  asyncWreckDamageFloors,
  smashPowerToFloors,
  smashVerdict,
  SMASH_SWEET_SPOT,
  SMASH_MAX_FLOORS,
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
  it('back-compat: omitting accuracy behaves like the old lead-only formula', () => {
    expect(asyncWreckDamageFloors(400, 10)).toBe(4);
    expect(asyncWreckDamageFloors(20, 10)).toBe(1);
  });
});

describe('smashPowerToFloors — the mini-game skill → damage curve', () => {
  it('a weak / mistimed strike lands the floor minimum', () => {
    expect(smashPowerToFloors(0)).toBe(1);
  });
  it('a sweet-spot strike lands the max floors', () => {
    expect(smashPowerToFloors(SMASH_SWEET_SPOT)).toBe(SMASH_MAX_FLOORS);
    expect(smashPowerToFloors(1)).toBe(SMASH_MAX_FLOORS);
  });
  it('ramps up between weak and perfect (coordination matters)', () => {
    expect(smashPowerToFloors(0.5)).toBeGreaterThan(smashPowerToFloors(0.1));
    expect(smashPowerToFloors(0.8)).toBeGreaterThanOrEqual(smashPowerToFloors(0.5));
  });
  it('reserves the top floor for the sweet spot (just-below is not max)', () => {
    expect(smashPowerToFloors(SMASH_SWEET_SPOT - 0.02)).toBeLessThan(SMASH_MAX_FLOORS);
  });
  it('clamps out-of-range power', () => {
    expect(smashPowerToFloors(-1)).toBe(1);
    expect(smashPowerToFloors(2)).toBe(SMASH_MAX_FLOORS);
  });
});

describe('smashVerdict — UI flair label', () => {
  it('labels a sweet-spot strike perfect', () => {
    expect(smashVerdict(0.9)).toBe('perfect');
  });
  it('labels a mid strike solid and a low strike weak', () => {
    expect(smashVerdict(0.6)).toBe('solid');
    expect(smashVerdict(0.2)).toBe('weak');
  });
});

describe('asyncWreckDamageFloors — skill raises damage, even at zero lead', () => {
  it('a perfect strike lands max floors with NO height lead', () => {
    expect(asyncWreckDamageFloors(100, 100, 1)).toBe(WRECK_MAX_FLOORS_PER_ATTACK);
  });
  it('a weak strike at zero lead falls back to the lead floor (1)', () => {
    expect(asyncWreckDamageFloors(100, 100, 0)).toBe(1);
  });
  it('coordination visibly matters at low lead (weak < perfect)', () => {
    expect(asyncWreckDamageFloors(120, 100, 0)).toBeLessThan(
      asyncWreckDamageFloors(120, 100, 1),
    );
  });
  it('skill cannot forge past the per-attack cap (no new cheat surface)', () => {
    expect(asyncWreckDamageFloors(99999, 0, 1)).toBe(WRECK_MAX_FLOORS_PER_ATTACK);
  });
});
