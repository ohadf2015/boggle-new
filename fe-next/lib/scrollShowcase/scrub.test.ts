import { describe, it, expect } from 'vitest';
import { clamp01, scrubVideoTime } from './scrub';

describe('clamp01', () => {
  it('passes through values inside [0,1]', () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.42)).toBe(0.42);
    expect(clamp01(1)).toBe(1);
  });

  it('clamps out-of-range values to the [0,1] bounds', () => {
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(5)).toBe(1);
  });
});

describe('scrubVideoTime', () => {
  const DURATION = 5;

  it('maps progress 0 to time 0 and progress 1 to the full duration', () => {
    expect(scrubVideoTime(0, DURATION)).toBe(0);
    expect(scrubVideoTime(1, DURATION)).toBe(DURATION);
  });

  it('maps mid progress linearly', () => {
    expect(scrubVideoTime(0.5, DURATION)).toBe(2.5);
  });

  it('clamps progress outside [0,1] so currentTime never leaves the clip', () => {
    expect(scrubVideoTime(-1, DURATION)).toBe(0);
    expect(scrubVideoTime(2, DURATION)).toBe(DURATION);
  });

  it('returns 0 for an unknown/zero duration (metadata not yet loaded)', () => {
    expect(scrubVideoTime(0.5, 0)).toBe(0);
    expect(scrubVideoTime(0.5, Number.NaN)).toBe(0);
  });
});
