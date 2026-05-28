import { describe, it, expect } from 'vitest';
import { dailyBestKey, mergeDailyBest, beatsDailyBest } from '../dailyBest';

describe('dailyBestKey — per-day localStorage slot', () => {
  it('namespaces today\'s best by the UTC day', () => {
    expect(dailyBestKey('2026-05-29')).toBe('wt-daily-best-2026-05-29');
  });
});

describe('mergeDailyBest — monotonic whole-metre best', () => {
  it('keeps the higher of stored vs current', () => {
    expect(mergeDailyBest(120, 95.7)).toBe(120);
    expect(mergeDailyBest(120, 140.9)).toBe(140);
  });

  it('floors the height to whole metres', () => {
    expect(mergeDailyBest(0, 12.9)).toBe(12);
  });

  it('never regresses below the stored best', () => {
    expect(mergeDailyBest(200, 0)).toBe(200);
  });
});

describe('beatsDailyBest — when to fire the "new best" beat', () => {
  it('is true once you climb past the best you started the run with', () => {
    expect(beatsDailyBest(120, 121)).toBe(true);
  });

  it('is false at or below the starting best', () => {
    expect(beatsDailyBest(120, 120)).toBe(false);
    expect(beatsDailyBest(120, 119.5)).toBe(false);
  });

  it('compares on whole metres (a fractional nudge past the line counts once it floors over)', () => {
    expect(beatsDailyBest(120, 120.9)).toBe(false); // floor 120, not > 120
    expect(beatsDailyBest(120, 121.1)).toBe(true);
  });

  it('a first-ever run (best 0) celebrates the first metre', () => {
    expect(beatsDailyBest(0, 1)).toBe(true);
    expect(beatsDailyBest(0, 0)).toBe(false);
  });
});
