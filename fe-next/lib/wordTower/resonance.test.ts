import { describe, it, expect } from 'vitest';
import { resonanceSchedule, RESONANCE_STEP_MS, RESONANCE_MAX_TILES } from './resonance';

describe('resonanceSchedule', () => {
  it('returns nothing when there are no tiles below the joint', () => {
    expect(resonanceSchedule(0, [])).toEqual([]);
    expect(resonanceSchedule(3, [3, 4, 5])).toEqual([]);
  });

  it('excludes tiles at or above the commit base', () => {
    const hits = resonanceSchedule(5, [3, 4, 5, 6, 7]);
    expect(hits.map((h) => h.pos)).toEqual([4, 3]);
  });

  it('rings nearest-below first with increasing delay', () => {
    const hits = resonanceSchedule(5, [0, 1, 2, 3, 4]);
    expect(hits.map((h) => h.pos)).toEqual([4, 3, 2, 1, 0]);
    expect(hits.map((h) => h.delayMs)).toEqual([0, RESONANCE_STEP_MS, RESONANCE_STEP_MS * 2, RESONANCE_STEP_MS * 3, RESONANCE_STEP_MS * 4]);
  });

  it('caps the wave length so tall towers stay cheap', () => {
    const positions = Array.from({ length: 200 }, (_, i) => i);
    const hits = resonanceSchedule(199, positions);
    expect(hits).toHaveLength(RESONANCE_MAX_TILES);
    expect(hits[0].pos).toBe(198); // still starts at the nearest below
  });

  it('honours a custom step', () => {
    const hits = resonanceSchedule(2, [0, 1], 30);
    expect(hits.map((h) => h.delayMs)).toEqual([0, 30]);
  });
});
