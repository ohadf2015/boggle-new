import { describe, it, expect } from 'vitest';
import { loadPercent, isPlayable, PLAYABLE_FRAME_COUNT } from '../loadProgress';

describe('loadPercent', () => {
  it('is 0 when nothing loaded', () => {
    expect(loadPercent(0, 324)).toBe(0);
  });

  it('is 100 when all loaded', () => {
    expect(loadPercent(324, 324)).toBe(100);
  });

  it('rounds to an integer percentage', () => {
    expect(loadPercent(81, 324)).toBe(25); // 25.0
    expect(loadPercent(1, 3)).toBe(33); // 33.33 -> 33
  });

  it('clamps to 0..100 for out-of-range inputs', () => {
    expect(loadPercent(-5, 324)).toBe(0);
    expect(loadPercent(500, 324)).toBe(100);
  });

  it('returns 0 (no divide-by-zero) when total is 0', () => {
    expect(loadPercent(0, 0)).toBe(0);
    expect(loadPercent(5, 0)).toBe(0);
  });
});

describe('isPlayable', () => {
  it('is false before enough frames are ready', () => {
    expect(isPlayable(0, 324)).toBe(false);
    expect(isPlayable(PLAYABLE_FRAME_COUNT - 1, 324)).toBe(false);
  });

  it('is true once the playable threshold is reached', () => {
    expect(isPlayable(PLAYABLE_FRAME_COUNT, 324)).toBe(true);
    expect(isPlayable(324, 324)).toBe(true);
  });

  it('treats "all frames loaded" as playable even when total < threshold', () => {
    // tiny sequence (e.g. reduced-motion single-frame, or a short test set)
    expect(isPlayable(10, 10)).toBe(true);
    expect(isPlayable(5, 10)).toBe(false);
  });

  it('is false for an empty sequence', () => {
    expect(isPlayable(0, 0)).toBe(false);
  });
});
