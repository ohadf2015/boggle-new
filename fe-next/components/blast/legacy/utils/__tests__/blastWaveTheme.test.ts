import { describe, it, expect } from 'vitest';
import {
  getWaveTheme,
  getWaveConfig,
  getWaveDistribution,
  getWaveObjectives,
  getWaveClearReward,
  buildWaveResult,
  totalWaveRewardCoins,
  getWavePassPct,
  BLAST_WAVE_THEME_IDS,
} from '../blastWaveConfig';
import { processTilesForWord } from '../clearTilesProcessor';
import { createSeededRandom } from '../blastLetterGenerator';
import type { BlastTileState } from '../../types';

const ACCENTS = ['neo-lime', 'neo-pink', 'neo-cyan', 'neo-purple', 'neo-orange'];

describe('getWaveTheme', () => {
  it('opens on a warm-up and puts a boss on every 5th wave', () => {
    expect(getWaveTheme(1).id).toBe('warmUp');
    for (const wave of [5, 10, 15, 20]) expect(getWaveTheme(wave).id).toBe('boss');
  });

  it('cycles bomb squad, coin rush, diamond hunt and cascade carnival between bosses', () => {
    expect([2, 3, 4, 6, 7, 8, 9, 11].map(w => getWaveTheme(w).id)).toEqual([
      'bombSquad', 'coinRush', 'diamondHunt', 'cascadeCarnival',
      'bombSquad', 'coinRush', 'diamondHunt', 'cascadeCarnival',
    ]);
  });

  it('uses every theme and gives each one its own keys and a brand accent', () => {
    const seen = new Set(Array.from({ length: 12 }, (_, i) => getWaveTheme(i + 1).id));
    expect([...seen].sort()).toEqual([...BLAST_WAVE_THEME_IDS].sort());
    for (let wave = 1; wave <= 12; wave++) {
      const theme = getWaveTheme(wave);
      expect(theme.nameKey).toBe(`blast.theme.${theme.id}.name`);
      expect(theme.goalKey).toBe(`blast.theme.${theme.id}.goal`);
      expect(theme.flavorKey).toBe(`blast.theme.${theme.id}.flavor`);
      expect(ACCENTS).toContain(theme.accentToken);
    }
  });

  it('escalates the boss reward each time it comes back', () => {
    expect(getWaveTheme(10).params.rewardMultiplier).toBeGreaterThan(getWaveTheme(5).params.rewardMultiplier);
  });
});

describe('themes change the game, not just the label', () => {
  it('bomb squad rolls more bombs than a warm-up', () => {
    const warm = getWaveDistribution(getWaveConfig(1));
    const bombs = getWaveDistribution(getWaveConfig(2));
    expect(bombs.bomb).toBeGreaterThan(warm.bomb);
    expect(getWaveConfig(2).specialTileChance).toBeGreaterThan(getWaveConfig(1).specialTileChance);
  });

  it('coin rush is coin-heavy and doubles coin currency', () => {
    expect(getWaveDistribution(getWaveConfig(3)).gold).toBeGreaterThan(0.7);
    expect(getWaveTheme(3).params.coinMultiplier).toBe(2);
  });

  it('a boss wave gives fewer moves than the wave before it', () => {
    expect(getWaveConfig(5).movesAllowed).toBeLessThan(getWaveConfig(4).movesAllowed);
  });

  it('cascade carnival raises the cascade bonus', () => {
    expect(getWaveConfig(6).cascadeChainBonus).toBeGreaterThan(getWaveConfig(7).cascadeChainBonus);
  });

  it('each themed wave asks for its own goal', () => {
    const goal = (wave: number) => getWaveObjectives(wave, 'en').find(o => o.type !== 'clear_percent');
    expect(goal(2)).toMatchObject({ type: 'collect_type', tileType: 'bomb' });
    expect(goal(3)).toMatchObject({ type: 'collect_type', tileType: 'gold' });
    expect(goal(4)).toMatchObject({ type: 'collect_type', tileType: 'diamond' });
    expect(goal(5)).toMatchObject({ type: 'score_target' });
    expect(goal(6)).toMatchObject({ type: 'word_length', minWordLength: 5 });
  });

  it('diamond hunt lowers the rarity a word needs to earn a diamond', () => {
    const board = (): BlastTileState[][] => Array.from({ length: 6 }, (_, r) =>
      Array.from({ length: 6 }, (_, c) => ({ uid: `${r}-${c}`, row: r, col: c, type: 'standard' as const, isCleared: false, activationEffect: null, hitsRemaining: 0 })));
    const run = (wave: number) => processTilesForWord({
      prev: board(), path: [0, 1, 2, 3, 4, 5].map(col => ({ row: 0, col })), word: 'planet',
      baseScore: 5, gridSize: 6, currentWave: wave, rng: createSeededRandom(3),
    }).diamondsSpawned.length;
    expect(run(2)).toBe(0);
    expect(run(4)).toBeGreaterThan(0);
  });
});

describe('getWaveClearReward', () => {
  it('pays more coins for more stars and a chest bonus only on three stars', () => {
    const one = getWaveClearReward(2, 1);
    const three = getWaveClearReward(2, 3);
    expect(three.coins).toBeGreaterThan(one.coins);
    expect(one.chestBonus).toBe(0);
    expect(three.chestBonus).toBeGreaterThan(0);
    expect(three.stars).toBe(3);
  });

  it('pays a boss clear more than an ordinary wave', () => {
    expect(getWaveClearReward(5, 3).coins).toBeGreaterThan(getWaveClearReward(4, 3).coins);
  });
});

describe('buildWaveResult', () => {
  it('stamps a cleared wave with its stars and reward', () => {
    const result = buildWaveResult(4, 300, 6, 95);
    expect(result).toMatchObject({ waveNumber: 4, score: 300, wordsFound: 6, clearPercentage: 95 });
    expect(result.reward).toEqual(getWaveClearReward(4, 3));
  });

  it('totals the coins and chest bonuses across a run', () => {
    const a = buildWaveResult(1, 100, 3, 95);
    const b = buildWaveResult(2, 100, 3, 60);
    expect(totalWaveRewardCoins([a, b])).toBe(a.reward!.coins + a.reward!.chestBonus + b.reward!.coins + b.reward!.chestBonus);
    expect(totalWaveRewardCoins([{ waveNumber: 1, score: 0, wordsFound: 0, clearPercentage: 0 }])).toBe(0);
  });
});

describe('wave theme text', () => {
  it('has a name, goal and flavor for every theme in all six languages', async () => {
    const locales = await Promise.all(['en', 'es', 'he', 'sv', 'ja', 'ru'].map(async (l) => [l, (await import(`@/translations/${l}`))[l]] as const));
    const get = (obj: unknown, key: string) => key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj);
    const missing: string[] = [];
    for (const [lang, catalogue] of locales) {
      for (let wave = 1; wave <= 6; wave++) {
        const theme = getWaveTheme(wave);
        for (const key of [theme.nameKey, theme.goalKey, theme.flavorKey]) {
          if (typeof get(catalogue, key) !== 'string') missing.push(`${lang}:${key}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('wave 1 is winnable for a new player', () => {
  it('passes the warm-up at 75% cleared, ordinary early waves at 85%, bosses and later waves at 90%', () => {
    expect(getWavePassPct(1)).toBe(75);
    expect(getWavePassPct(2)).toBe(85);
    expect(getWavePassPct(4)).toBe(85);
    expect(getWavePassPct(5)).toBe(90);
    expect(getWavePassPct(7)).toBe(90);
  });

  it('uses the wave pass bar as the clear-the-board objective', () => {
    for (let wave = 1; wave <= 12; wave++) {
      expect(getWaveObjectives(wave, 'en').find(o => o.type === 'clear_percent')?.target).toBe(getWavePassPct(wave));
    }
  });

  it('seeds the warm-up with enough bombs to break up a stuck board (about 2-3 on 6x6)', () => {
    const cfg = getWaveConfig(1);
    const dist = getWaveDistribution(cfg);
    expect(cfg.specialTileChance).toBeGreaterThanOrEqual(0.11);
    expect(dist.bomb).toBeGreaterThanOrEqual(0.6);
    const expectedBombs = 36 * cfg.specialTileChance * dist.bomb;
    expect(expectedBombs).toBeGreaterThanOrEqual(2);
    expect(expectedBombs).toBeLessThanOrEqual(3.5);
  });
});
