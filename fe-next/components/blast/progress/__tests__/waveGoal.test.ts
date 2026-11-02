import { describe, it, expect } from 'vitest';
import { buildWaveGoal } from '../waveGoal';

const rivals = [{ name: 'Ann', score: 300 }, { name: 'Bo', score: 500 }, { name: 'Cy', score: 900 }];
const base = { runScoreBefore: 200, waveScore: 0, personalBest: 150, rank: 40, total: 120, rivals };

describe('buildWaveGoal', () => {
  it('names the rival to chase and how far along the run is', () => {
    const g = buildWaveGoal({ ...base, waveScore: 50 });
    expect(g.target).toEqual({ kind: 'rival', name: 'Ann', score: 300, gap: 50 });
    expect(g.progress).toBeCloseTo(250 / 300, 2);
    expect(g.justPassed).toEqual([]);
    expect(g.rank).toBe(40);
  });
  it('credits each player this wave passed and moves the rank up', () => {
    const g = buildWaveGoal({ ...base, waveScore: 350 });
    expect(g.justPassed.map((r) => r.name)).toEqual(['Bo', 'Ann']);
    expect(g.rank).toBe(38);
    expect(g.ahead).toBe(82);
    expect(g.target).toMatchObject({ kind: 'rival', name: 'Cy' });
  });
  it('does not re-celebrate players passed in earlier waves', () => {
    const g = buildWaveGoal({ ...base, runScoreBefore: 320, waveScore: 10 });
    expect(g.justPassed).toEqual([]);
    expect(g.rank).toBe(39);
  });
  it('guests get the personal-best chase and no standing', () => {
    const g = buildWaveGoal({ runScoreBefore: 100, waveScore: 20, personalBest: 400, rank: null, total: null, rivals: [] });
    expect(g.target).toMatchObject({ kind: 'best', gap: 280 });
    expect(g.rank).toBeNull();
    expect(g.ahead).toBeNull();
  });
  it('tops out when nothing is left above', () => {
    const g = buildWaveGoal({ ...base, waveScore: 5000 });
    expect(g.target).toEqual({ kind: 'top' });
    expect(g.progress).toBe(1);
    expect(g.rank).toBe(37);
  });
});
