import { describe, it, expect } from 'vitest';
import {
  isOnBrink,
  evaluateClutch,
  clutchSaveIntensity,
  stabilizeAfterClutch,
} from '../clutchSave';
import { LEAN_MAX_DEG } from '../towerLean';
import { TOPPLE_AFTER_SLOPPY } from '../cranePlacement';

describe('isOnBrink — when the next bad drop topples', () => {
  it('is false before enough bad drops have stacked', () => {
    expect(isOnBrink(0)).toBe(false);
    expect(isOnBrink(TOPPLE_AFTER_SLOPPY - 1)).toBe(false);
  });

  it('is true once the consecutive-bad count hits the topple precondition', () => {
    expect(isOnBrink(TOPPLE_AFTER_SLOPPY)).toBe(true);
    expect(isOnBrink(TOPPLE_AFTER_SLOPPY + 3)).toBe(true);
  });

  it('is reachable by construction (sloppy drops alone get you there)', () => {
    // Two sloppy drops in a row → on the brink, no miss required.
    expect(isOnBrink(2)).toBe(TOPPLE_AFTER_SLOPPY <= 2);
  });
});

describe('evaluateClutch — the do-or-die drop on the brink', () => {
  it('is a no-op when not on the brink', () => {
    expect(evaluateClutch(false, 'miss')).toBe('none');
    expect(evaluateClutch(false, 'perfect')).toBe('none');
    expect(evaluateClutch(false, 'sloppy')).toBe('none');
  });

  it('rewards a controlled drop (perfect/good) with a CLUTCH SAVE', () => {
    expect(evaluateClutch(true, 'perfect')).toBe('save');
    expect(evaluateClutch(true, 'good')).toBe('save');
  });

  it('topples on a shaky drop (sloppy/miss) while on the brink — stakes are raised', () => {
    expect(evaluateClutch(true, 'sloppy')).toBe('topple');
    expect(evaluateClutch(true, 'miss')).toBe('topple');
  });
});

describe('clutchSaveIntensity — how big the celebration should be', () => {
  it('is 0 with no lean and scales to 1 at the visible max', () => {
    expect(clutchSaveIntensity(0)).toBe(0);
    expect(clutchSaveIntensity(LEAN_MAX_DEG)).toBeCloseTo(1, 5);
  });

  it('scales linearly in between', () => {
    expect(clutchSaveIntensity(LEAN_MAX_DEG / 2)).toBeCloseTo(0.5, 5);
  });

  it('treats both lean directions identically and clamps past the max', () => {
    expect(clutchSaveIntensity(-LEAN_MAX_DEG)).toBeCloseTo(1, 5);
    expect(clutchSaveIntensity(LEAN_MAX_DEG + 5)).toBe(1);
  });
});

describe('stabilizeAfterClutch — snap the tower back upright', () => {
  it('returns an empty offset window so the lean reads as neutral again', () => {
    expect(stabilizeAfterClutch()).toEqual([]);
  });
});
