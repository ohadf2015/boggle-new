import { describe, it, expect } from 'vitest';
import { GEM_DEFS, rollGemsForWord, gemOfTile, getWaveGemSeeds, seedWaveGems } from '../blastGems';
import { processTilesForWord } from '../clearTilesProcessor';
import { predictBlastClears } from '../blastPredictClears';
import { createSeededRandom } from '../blastLetterGenerator';
import type { BlastTileState } from '../../types';

function grid(size = 6): BlastTileState[][] {
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => ({
      uid: `t-${r}-${c}`, row: r, col: c, type: 'standard' as const, isCleared: false, hitsRemaining: 0, activationEffect: null,
    })),
  );
}
const row = (r: number, len: number) => Array.from({ length: len }, (_, col) => ({ row: r, col }));

describe('rollGemsForWord', () => {
  it('gives nothing for common words and never touches the rng', () => {
    const rng = () => { throw new Error('rng used'); };
    expect(rollGemsForWord('common', rng)).toEqual([]);
  });
  it('maps rarity to colors, rubies replace the top gem on a lucky roll', () => {
    expect(rollGemsForWord('rare', () => 0.99)).toEqual(['sapphire']);
    expect(rollGemsForWord('rare', () => 0.01)).toEqual(['ruby']);
    expect(rollGemsForWord('epic', () => 0.99)).toEqual(['amethyst', 'sapphire']);
    expect(rollGemsForWord('epic', () => 0.01)).toEqual(['ruby', 'sapphire']);
    expect(rollGemsForWord('uncommon', () => 0.01)).toEqual(['emerald']);
    expect(rollGemsForWord('uncommon', () => 0.99)).toEqual([]);
  });
  it('treats a gemless diamond as sapphire', () => {
    expect(gemOfTile({})).toBe('sapphire');
  });
});

describe('gem payoffs in processTilesForWord', () => {
  const play = (gem: 'emerald' | 'sapphire' | 'amethyst' | 'ruby') => {
    const prev = grid();
    prev[0][0] = { ...prev[0][0], type: 'diamond', gem };
    return processTilesForWord({ prev, path: row(0, 3), word: 'cat', baseScore: 10, gridSize: 6, currentWave: 1, rng: createSeededRandom(1) });
  };
  it('multiplies the word by the gem and counts it by color', () => {
    expect(play('emerald').totalScore).toBe(10 * GEM_DEFS.emerald.wordMult + GEM_DEFS.emerald.clearBonus);
    expect(play('ruby').gemsCollected).toEqual({ ruby: 1 });
  });
  it('only cross-blasts for gems that carry a cross', () => {
    expect(play('emerald').gemCrossCount).toBe(0);
    expect(play('sapphire').gemCrossCount).toBeGreaterThan(0);
  });
  it('pays rarer gems more', () => {
    const scores = (['emerald', 'sapphire', 'amethyst', 'ruby'] as const).map(g => play(g).totalScore);
    expect([...scores].sort((a, b) => a - b)).toEqual(scores);
  });
});

describe('predictBlastClears', () => {
  it('lists the neighbours a bomb takes down, matching the real clear', () => {
    const prev = grid();
    prev[2][2] = { ...prev[2][2], type: 'bomb' };
    const path = [{ row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 }];
    const predicted = predictBlastClears(prev, path, 'cat', 6);
    const real = processTilesForWord({ prev, path, word: 'cat', baseScore: 0, gridSize: 6, currentWave: 1, rng: () => 0.5 }).next;
    const realCleared = real.flat().filter(t => t.isCleared).length;
    expect(predicted).toHaveLength(realCleared);
    expect(predicted.length).toBeGreaterThan(path.length);
  });
});

import { generateTileStates, seededRandom } from '../blastTileGeneration';

describe('wave gem seeding', () => {
  it('keeps the warm-up clean and climbs in rarity', () => {
    expect(getWaveGemSeeds(1)).toEqual([]);
    expect(getWaveGemSeeds(2)).toEqual(['emerald']);
    expect(getWaveGemSeeds(5)).toContain('amethyst');
    expect(getWaveGemSeeds(5)).not.toContain('ruby');
    expect(getWaveGemSeeds(10)).toContain('ruby');
  });
  it('hunt waves hide more than a normal wave beside them', () => {
    expect(getWaveGemSeeds(4).length).toBeGreaterThan(getWaveGemSeeds(3).length);
  });
  it('places each gem on its own standard tile, deterministically', () => {
    const make = () => seedWaveGems(generateTileStates(6, 0, 11), 10, seededRandom(5));
    const a = make();
    const gems = a.flat().filter(t => t.type === 'diamond');
    expect(gems.map(t => t.gem).sort()).toEqual([...getWaveGemSeeds(10)].sort());
    expect(make().flat().map(t => t.gem)).toEqual(a.flat().map(t => t.gem));
  });
});
