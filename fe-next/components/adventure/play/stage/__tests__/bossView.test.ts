import { describe, it, expect } from 'vitest';
import { hpPercent, urgencyOf, PHASE_NOTCHES, notchesPassed } from '../bossView';

describe('bossView', () => {
  it('given hp, when asked for a percent, then it is clamped to 0..100 and survives max 0', () => {
    expect(hpPercent(50, 200)).toBe(25);
    expect(hpPercent(-5, 200)).toBe(0);
    expect(hpPercent(900, 200)).toBe(100);
    expect(hpPercent(10, 0)).toBe(0);
  });

  it('pins the phase notches to the combat engine thresholds (66% / 33%)', () => {
    expect(PHASE_NOTCHES).toEqual([66, 33]);
  });

  it('given hp, when counting passed notches, then each crossed threshold counts once', () => {
    expect(notchesPassed(100, 100)).toBe(0);
    expect(notchesPassed(66, 100)).toBe(1);
    expect(notchesPassed(50, 100)).toBe(1);
    expect(notchesPassed(33, 100)).toBe(2);
    expect(notchesPassed(0, 100)).toBe(2);
  });

  it('given a wind-up with time left, when graded, then it escalates calm -> warn -> urgent', () => {
    expect(urgencyOf(3000)).toBe('calm');
    expect(urgencyOf(1400)).toBe('warn');
    expect(urgencyOf(600)).toBe('urgent');
    expect(urgencyOf(0)).toBe('urgent');
  });
});
