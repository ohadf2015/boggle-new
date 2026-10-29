import { describe, it, expect } from 'vitest';
import { buildRunJourney } from '../runJourneyModel';
import type { WaveResult } from '../../legacy/types';

const cleared = (waveNumber: number, stars: 1 | 2 | 3): WaveResult => ({
  waveNumber, score: 100, wordsFound: 4, clearPercentage: 92, reward: { stars, coins: 20, chestBonus: 0 },
});
const final = (waveNumber: number, clearPercentage: number): WaveResult => ({
  waveNumber, score: 40, wordsFound: 2, clearPercentage,
});

describe('buildRunJourney', () => {
  it('Given two cleared waves and a failed third, Then nodes carry real wave numbers, stars and the failed state', () => {
    const j = buildRunJourney([cleared(1, 3), cleared(2, 2), final(3, 70)], 90);
    expect(j.nodes.map((n) => [n.wave, n.status, n.stars])).toEqual([
      [1, 'cleared', 3],
      [2, 'cleared', 2],
      [3, 'failed', 0],
    ]);
    expect(j.reachedWave).toBe(3);
    expect(j.wavesCleared).toBe(2);
    expect(j.runStars).toBe(5);
    expect(j.nodes[0].themeId).toBe('warmUp');
  });

  it('Given a checkpoint run that started at wave 4, Then the track starts at wave 4', () => {
    const j = buildRunJourney([cleared(4, 1), final(5, 50)], 90);
    expect(j.nodes.map((n) => n.wave)).toEqual([4, 5]);
    expect(j.nodes[1].themeId).toBe('boss');
  });

  it('Given the next boss is ahead, Then it is the milestone with its distance', () => {
    const j = buildRunJourney([cleared(1, 2), final(2, 40)], 85);
    expect(j.milestone).toMatchObject({ wave: 5, themeId: 'boss', wavesAway: 3 });
  });

  it('Given the run died on a boss wave, Then the milestone is the following boss', () => {
    const j = buildRunJourney([cleared(4, 2), final(5, 60)], 90);
    expect(j.milestone).toMatchObject({ wave: 10, wavesAway: 5 });
  });

  it('Given a long run, Then only the last nodes show and the hidden count is reported', () => {
    const waves = [1, 2, 3, 4, 5, 6, 7].map((w) => cleared(w, 1));
    const j = buildRunJourney([...waves, final(8, 30)], 90, 5);
    expect(j.nodes.map((n) => n.wave)).toEqual([4, 5, 6, 7, 8]);
    expect(j.hiddenBefore).toBe(3);
    expect(j.runStars).toBe(7);
  });

  it('Given a final wave at or above the bar, Then it counts as cleared', () => {
    const j = buildRunJourney([final(1, 80)], 75);
    expect(j.nodes[0].status).toBe('cleared');
    expect(j.wavesCleared).toBe(1);
  });

  it('Given no wave history, Then there is no journey to draw', () => {
    expect(buildRunJourney([], 90).nodes).toEqual([]);
  });
});
