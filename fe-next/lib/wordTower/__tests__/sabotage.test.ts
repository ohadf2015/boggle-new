import { describe, it, expect } from 'vitest';
import {
  awardSabotageToken,
  SABOTAGE_PERFECT_THRESHOLD,
  SABOTAGE_TOKEN_CAP,
  spendSabotageToken,
  canSabotage,
  sabotageFloorsFor,
  SABOTAGE_FLOORS_PER_HIT,
  canEarnViaAd,
  awardSabotageTokenViaAd,
} from '../sabotage';

describe('awardSabotageToken — perfect-streak earn rule', () => {
  it('grants a token when crossing the perfect-streak threshold', () => {
    expect(awardSabotageToken(0, SABOTAGE_PERFECT_THRESHOLD)).toBe(1);
  });

  it('does not grant a token below the threshold', () => {
    expect(awardSabotageToken(0, SABOTAGE_PERFECT_THRESHOLD - 1)).toBe(0);
  });

  it('grants a second token at the next multiple', () => {
    expect(awardSabotageToken(1, SABOTAGE_PERFECT_THRESHOLD * 2)).toBe(2);
  });

  it('does not double-grant for the same threshold crossing', () => {
    expect(awardSabotageToken(1, SABOTAGE_PERFECT_THRESHOLD)).toBe(1);
  });

  it('caps at SABOTAGE_TOKEN_CAP (no over-stockpiling)', () => {
    expect(
      awardSabotageToken(SABOTAGE_TOKEN_CAP, SABOTAGE_PERFECT_THRESHOLD * (SABOTAGE_TOKEN_CAP + 1)),
    ).toBe(SABOTAGE_TOKEN_CAP);
  });
});

describe('spendSabotageToken / canSabotage', () => {
  it('canSabotage true with at least one token AND a rival', () => {
    expect(canSabotage(1, 1)).toBe(true);
    expect(canSabotage(0, 1)).toBe(false);
    expect(canSabotage(1, 0)).toBe(false);
  });

  it('spendSabotageToken decrements by 1, floored at 0', () => {
    expect(spendSabotageToken(2)).toBe(1);
    expect(spendSabotageToken(1)).toBe(0);
    expect(spendSabotageToken(0)).toBe(0);
  });
});

describe('sabotageFloorsFor — anti-grief cap', () => {
  it('always returns SABOTAGE_FLOORS_PER_HIT (currently 1)', () => {
    expect(sabotageFloorsFor()).toBe(SABOTAGE_FLOORS_PER_HIT);
    expect(SABOTAGE_FLOORS_PER_HIT).toBe(1); // anti-grief: cap at one floor
  });
});

describe('canEarnViaAd', () => {
  it('true when tokens below cap', () => {
    expect(canEarnViaAd(0)).toBe(true);
    expect(canEarnViaAd(SABOTAGE_TOKEN_CAP - 1)).toBe(true);
  });

  it('false at or above cap', () => {
    expect(canEarnViaAd(SABOTAGE_TOKEN_CAP)).toBe(false);
  });
});

describe('awardSabotageTokenViaAd', () => {
  it('grants exactly 1 token from zero', () => {
    expect(awardSabotageTokenViaAd(0)).toBe(1);
  });

  it('increments by 1 when below cap', () => {
    expect(awardSabotageTokenViaAd(1)).toBe(2);
  });

  it('clamps at cap — no over-grant', () => {
    expect(awardSabotageTokenViaAd(SABOTAGE_TOKEN_CAP)).toBe(SABOTAGE_TOKEN_CAP);
    expect(awardSabotageTokenViaAd(SABOTAGE_TOKEN_CAP - 1)).toBe(SABOTAGE_TOKEN_CAP);
  });
});
