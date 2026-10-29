import { describe, it, expect } from 'vitest';
import { fxCanSleep, fxHoldMs, FX_RESOLUTION_CAP, fxResolution } from '../fxSleep';

const quiet = { emitters: 0, shaking: false, flashing: false, dilating: false, sinceEffectMs: 2000, holdMs: 300 };

describe('fxCanSleep', () => {
  it('Given nothing on screen and the batch hold has passed, Then the effects canvas may stop drawing', () => {
    expect(fxCanSleep(quiet)).toBe(true);
  });

  it('Given a batch whose delayed bursts are still due, Then it stays awake', () => {
    expect(fxCanSleep({ ...quiet, sinceEffectMs: 1000, holdMs: 1700 })).toBe(false);
  });

  it('Given particles, a shake, a flash or slow-mo still running, Then it keeps drawing', () => {
    expect(fxCanSleep({ ...quiet, emitters: 1 })).toBe(false);
    expect(fxCanSleep({ ...quiet, shaking: true })).toBe(false);
    expect(fxCanSleep({ ...quiet, flashing: true })).toBe(false);
    expect(fxCanSleep({ ...quiet, dilating: true })).toBe(false);
  });
});

describe('fxHoldMs', () => {
  it('Given an everyday word verdict, Then the canvas can sleep soon after its particles die, before the next swipe', () => {
    expect(fxHoldMs([{ type: 'invalid' }, { type: 'lifeDrop' }])).toBeLessThanOrEqual(400);
    expect(fxHoldMs([{ type: 'wordValid' }])).toBeGreaterThan(150);
  });

  it('Given a finish with bursts scheduled up to 1.5s later, Then it stays awake past the last one', () => {
    expect(fxHoldMs([{ type: 'gameWon' }])).toBeGreaterThan(1500);
    expect(fxHoldMs([{ type: 'targetFound' }])).toBeGreaterThan(600);
  });
});

describe('fxResolution', () => {
  it('Given a dense phone screen, Then the full-screen particle layer draws at a capped resolution', () => {
    expect(fxResolution(2.625)).toBe(FX_RESOLUTION_CAP);
    expect(fxResolution(1)).toBe(1);
    expect(FX_RESOLUTION_CAP).toBeLessThanOrEqual(1.5);
  });
});
