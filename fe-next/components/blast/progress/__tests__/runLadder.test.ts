import { describe, it, expect } from 'vitest';
import { buildRunLadder } from '../runLadder';
import { getWaveTheme } from '../waveTheme';

const themeFor = getWaveTheme;

describe('buildRunLadder', () => {
  it('lists the current wave and the next ones with their themes', () => {
    const ladder = buildRunLadder({ currentWave: 3, count: 4, recordWave: 0, themeFor });
    expect(ladder.map((s) => s.wave)).toEqual([3, 4, 5, 6]);
    expect(ladder[0]).toMatchObject({ current: true, theme: { id: getWaveTheme(3).id } });
    expect(ladder[1]).toMatchObject({ current: false, theme: { id: getWaveTheme(4).id } });
  });

  it('marks the wave that beats the player\'s best run', () => {
    const ladder = buildRunLadder({ currentWave: 3, count: 4, recordWave: 4, themeFor });
    expect(ladder.filter((s) => s.newRecord).map((s) => s.wave)).toEqual([5]);
  });

  it('marks no record wave on a first run', () => {
    const ladder = buildRunLadder({ currentWave: 1, count: 3, recordWave: 0, themeFor });
    expect(ladder.some((s) => s.newRecord)).toBe(false);
  });
});
