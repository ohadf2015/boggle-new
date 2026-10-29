/**
 * blastWaveConfig - Pure function tests for wave scaling configuration.
 */
import {
  getWaveConfig,
  getWaveObjectives,
} from '../blastWaveConfig';

describe('getWaveConfig', () => {
  it('returns WaveConfig for wave 1', () => {
    const config = getWaveConfig(1);
    expect(config.minWordLength).toBe(2);
    expect(config.specialTileChance).toBeCloseTo(0.12);
    expect(config.vowelModifier).toBe(1.1);
    expect(config.maxCascadeChain).toBe(2);
  });

  it('returns progressively harder config for higher waves', () => {
    const w1 = getWaveConfig(1);
    const w3 = getWaveConfig(3);
    const w5 = getWaveConfig(5);

    // Fewer moves as waves climb
    expect(w5.movesAllowed).toBeLessThan(w1.movesAllowed);

    // Vowel modifier decreases
    expect(w3.vowelModifier).toBeLessThan(w1.vowelModifier);
    expect(w5.vowelModifier).toBeLessThan(w3.vowelModifier);
  });

  it('keeps minWordLength at 2 for all waves', () => {
    for (let wave = 1; wave <= 12; wave++) {
      expect(getWaveConfig(wave).minWordLength).toBe(2);
    }
  });

  it('has scoreThreshold starting at wave 3', () => {
    expect(getWaveConfig(1).scoreThreshold).toBeUndefined();
    expect(getWaveConfig(2).scoreThreshold).toBeUndefined();
    expect(getWaveConfig(3).scoreThreshold).toBe(80);
    expect(getWaveConfig(4).scoreThreshold).toBe(180);
  });

  it('increases scoreThreshold for later waves', () => {
    expect(getWaveConfig(4).scoreThreshold).toBe(180);
    expect(getWaveConfig(5).scoreThreshold).toBe(250);
    expect(getWaveConfig(6).scoreThreshold).toBe(350);
    expect(getWaveConfig(7).scoreThreshold).toBe(450);
  });

  it('caps scaling at wave 12+ (no further changes beyond last WAVE_TABLE entry)', () => {
    const w12 = getWaveConfig(12);
    const w15 = getWaveConfig(15);

    expect(w15.minWordLength).toBe(w12.minWordLength);
    expect(w15.maxCascadeChain).toBe(w12.maxCascadeChain);
    expect(w15.vowelModifier).toBe(w12.vowelModifier);
  });

  it('increases scoreThreshold linearly beyond wave 7', () => {
    const w7 = getWaveConfig(7);
    const w8 = getWaveConfig(8);
    // Beyond wave 7, threshold should continue increasing
    expect(w8.scoreThreshold).toBeGreaterThan(w7.scoreThreshold!);
  });

  it('increases cascadeChainBonus with wave', () => {
    const w1 = getWaveConfig(1);
    const w6 = getWaveConfig(6);
    expect(w6.cascadeChainBonus).toBeGreaterThan(w1.cascadeChainBonus);
  });
});

describe('getWaveConfig archetype', () => {
  it('wave 1 is a calm normal wave (learn-the-ropes)', () => {
    expect(getWaveConfig(1).archetype).toBe('normal');
  });

  it('wave 2 is a treasureHunt wave', () => {
    expect(getWaveConfig(2).archetype).toBe('treasureHunt');
  });

  it('wave 3 is a normal wave', () => {
    expect(getWaveConfig(3).archetype).toBe('normal');
  });

  it('wave 4 is a scoreRush wave', () => {
    expect(getWaveConfig(4).archetype).toBe('scoreRush');
  });

  it('wave 5 is a normal wave', () => {
    expect(getWaveConfig(5).archetype).toBe('normal');
  });

  it('wave 6 is a survival wave', () => {
    expect(getWaveConfig(6).archetype).toBe('survival');
  });

  it('wave 7 is a treasureHunt wave', () => {
    expect(getWaveConfig(7).archetype).toBe('treasureHunt');
  });

  it('wave 8 is a scoreRush wave', () => {
    expect(getWaveConfig(8).archetype).toBe('scoreRush');
  });

  it('wave 9 is a survival wave', () => {
    expect(getWaveConfig(9).archetype).toBe('survival');
  });

  it('wave 10 is a normal wave', () => {
    expect(getWaveConfig(10).archetype).toBe('normal');
  });

  it('wave 11 is a scoreRush wave', () => {
    expect(getWaveConfig(11).archetype).toBe('scoreRush');
  });

  it('wave 12 is a survival wave (master tier)', () => {
    expect(getWaveConfig(12).archetype).toBe('survival');
  });

  it('waves beyond 12 inherit the wave 12 archetype', () => {
    expect(getWaveConfig(15).archetype).toBe(getWaveConfig(12).archetype);
    expect(getWaveConfig(99).archetype).toBe(getWaveConfig(12).archetype);
  });

  it('every wave has an archetype from the known set', () => {
    const known = new Set(['normal', 'scoreRush', 'treasureHunt', 'survival', 'silence']);
    for (let wave = 1; wave <= 12; wave++) {
      expect(known.has(getWaveConfig(wave).archetype)).toBe(true);
    }
  });
});

describe('wave completability invariants', () => {
  /**
   * Max sustainable score per move, derived from blast scoring:
   *   base score (5-letter word) = 50, + cascade/gold/combo stacks ≈ 2.4x average
   *   → ~120/move is the ceiling a skilled player can hit EVERY move.
   * Used as a feasibility ceiling: threshold > moves * this => uncompletable in practice.
   */
  const MAX_FEASIBLE_PER_MOVE = 120;

  /**
   * Tiles clearable per move upper bound (word path + cascade refills + 1 bomb chain).
   * Used to verify clear_percent objectives are reachable.
   */
  const MAX_TILES_PER_MOVE = 4;
  const GRID_TILES = 16; // 4x4 default blast board

  const WAVES_UNDER_TEST = Array.from({ length: 30 }, (_, i) => i + 1);

  describe.each(WAVES_UNDER_TEST)('wave %i', (wave) => {
    it('scoreThreshold is reachable within movesAllowed', () => {
      const config = getWaveConfig(wave);
      const threshold = config.scoreThreshold ?? 0;
      expect(threshold).toBeLessThanOrEqual(config.movesAllowed * MAX_FEASIBLE_PER_MOVE);
    });

    it('clear_percent objective is reachable given movesAllowed', () => {
      const config = getWaveConfig(wave);
      const objectives = getWaveObjectives(wave);
      const clearPct = objectives.find((o) => o.type === 'clear_percent');
      if (!clearPct) return;
      const tilesRequired = Math.ceil((GRID_TILES * clearPct.target) / 100);
      expect(tilesRequired).toBeLessThanOrEqual(config.movesAllowed * MAX_TILES_PER_MOVE);
    });



    it('movesAllowed is at least 4 (minimum playable wave length)', () => {
      expect(getWaveConfig(wave).movesAllowed).toBeGreaterThanOrEqual(4);
    });
  });
});
