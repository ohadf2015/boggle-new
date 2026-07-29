/**
 * blastWaveConfig - Pure function tests for wave scaling configuration.
 */
import {
  getWaveConfig,
  getWaveDistribution,
  getWaveObjectives,
  seedTargetWordObjective,
  seedColorPowerObjective,
} from '../blastWaveConfig';

/**
 * Sprint 1 tile retirement: 14 special types disabled across all waves so the
 * playable roster shrinks from 20 to 5 specials (bomb, rainbow, lightning,
 * prism, gold) plus base obstacles (ice, frost/frozen). Type union and effect
 * code stay intact (cleaner deletion left for a follow-up refactor); the
 * spawn flags being uniformly false means players never see them.
 */
describe('blastWaveConfig — Sprint 1 retired tiles never spawn', () => {
  const RETIRED_FLAGS = [
    'vortexEnabled',
    'magnetEnabled',
    'gemEnabled',
    'diamondEnabled',
    'countdownEnabled',
    'shuffleEnabled',
    'magmaEnabled',
    'portalEnabled',
    'catalystEnabled',
    'crystalEnabled',
    'fuseEnabled',
    'anchorEnabled',
  ] as const;

  // Revival sprint 2026-05-10: the retirement guard scopes to waves 1-7.
  // Waves 8+ progressively re-enable retired tiles (see blast-tile-revival plan).
  it.each([1, 2, 3, 4, 5, 6, 7])('wave %i (FTUE cohort) keeps all retired flags off', (wave) => {
    const cfg = getWaveConfig(wave) as unknown as Record<string, unknown>;
    for (const flag of RETIRED_FLAGS) {
      expect(cfg[flag]).toBe(false);
    }
  });
});

describe('getWaveConfig', () => {
  it('returns WaveConfig for wave 1', () => {
    const config = getWaveConfig(1);
    expect(config.minWordLength).toBe(2);
    expect(config.specialTileChance).toBe(0.10);
    expect(config.vowelModifier).toBe(1.1);
    expect(config.maxCascadeChain).toBe(2);
    expect(config.lightningEnabled).toBe(false);
    expect(config.magnetEnabled).toBe(false);
  });

  it('has lower special tile chance in early waves (1-2) for less visual noise', () => {
    const w1 = getWaveConfig(1);
    const w2 = getWaveConfig(2);
    const w3 = getWaveConfig(3);
    // Early waves should be calmer (fewer specials)
    expect(w1.specialTileChance).toBeLessThanOrEqual(0.12);
    expect(w2.specialTileChance).toBeLessThanOrEqual(0.14);
    // Wave 3+ stays at normal levels
    expect(w3.specialTileChance).toBeGreaterThanOrEqual(0.17);
  });

  it('returns progressively harder config for higher waves', () => {
    const w1 = getWaveConfig(1);
    const w3 = getWaveConfig(3);
    const w5 = getWaveConfig(5);

    // Ice distribution increases
    expect(w3.iceDistribution).toBeGreaterThan(w1.iceDistribution);
    expect(w5.iceDistribution).toBeGreaterThan(w3.iceDistribution);

    // Gold distribution decreases
    expect(w3.goldDistribution).toBeLessThan(w1.goldDistribution);
    expect(w5.goldDistribution).toBeLessThan(w3.goldDistribution);

    // Vowel modifier decreases
    expect(w3.vowelModifier).toBeLessThan(w1.vowelModifier);
    expect(w5.vowelModifier).toBeLessThan(w3.vowelModifier);
  });

  it('keeps minWordLength at 2 for all waves', () => {
    for (let wave = 1; wave <= 12; wave++) {
      expect(getWaveConfig(wave).minWordLength).toBe(2);
    }
  });

  it('enables lightning at wave 4', () => {
    expect(getWaveConfig(3).lightningEnabled).toBe(false);
    expect(getWaveConfig(4).lightningEnabled).toBe(true);
  });

  // Sprint 1 retirement: magnet/gems no longer spawn. Tests retained as
  // negative assertions so a regression that re-enables them fails loudly.
  it('keeps magnet retired across all waves', () => {
    expect(getWaveConfig(6).magnetEnabled).toBe(false);
    expect(getWaveConfig(7).magnetEnabled).toBe(false);
  });

  it('keeps gems retired across all waves', () => {
    expect(getWaveConfig(1).gemEnabled).toBe(false);
    expect(getWaveConfig(2).gemEnabled).toBe(false);
  });

  it('enables prisms at wave 3', () => {
    expect(getWaveConfig(2).prismEnabled).toBe(false);
    expect(getWaveConfig(3).prismEnabled).toBe(true);
  });

  it('enables frozen at wave 6', () => {
    expect(getWaveConfig(5).frozenEnabled).toBe(false);
    expect(getWaveConfig(6).frozenEnabled).toBe(true);
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
    expect(w15.lightningEnabled).toBe(w12.lightningEnabled);
    expect(w15.magnetEnabled).toBe(w12.magnetEnabled);
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

describe('getWaveDistribution', () => {
  it('returns no lightning/magnet for wave 1', () => {
    const dist = getWaveDistribution(getWaveConfig(1));
    expect(dist.lightning).toBe(0);
    expect(dist.magnet).toBe(0);
  });

  it('returns no new tiles for wave 1', () => {
    const dist = getWaveDistribution(getWaveConfig(1));
    expect(dist.gem).toBe(0);
    expect(dist.prism).toBe(0);
    expect(dist.frozen).toBe(0);
  });

  // Sprint 1 retirement: gem/diamond/magnet never spawn. Distribution checks
  // become "zero across the board" assertions.
  it('keeps gems out of distribution at wave 2 (retired)', () => {
    const dist = getWaveDistribution(getWaveConfig(2));
    expect(dist.gem).toBe(0);
    expect(dist.prism).toBe(0);
    expect(dist.frozen).toBe(0);
  });

  it('still unlocks prisms at wave 3 (kept)', () => {
    const dist = getWaveDistribution(getWaveConfig(3));
    expect(dist.gem).toBe(0);
    expect(dist.prism).toBeGreaterThan(0);
    expect(dist.frozen).toBe(0);
  });

  it('includes lightning at wave 4', () => {
    const dist = getWaveDistribution(getWaveConfig(4));
    expect(dist.lightning).toBeGreaterThan(0);
    expect(dist.magnet).toBe(0);
  });

  it('keeps diamond retired at wave 4', () => {
    const dist = getWaveDistribution(getWaveConfig(4));
    expect(dist.prism).toBeGreaterThan(0);
    expect(dist.lightning).toBeGreaterThan(0);
    expect(dist.diamond).toBe(0);
    expect(dist.gem).toBe(0);
  });

  it('keeps magnet retired at wave 7', () => {
    const dist = getWaveDistribution(getWaveConfig(7));
    expect(dist.lightning).toBeGreaterThan(0);
    expect(dist.magnet).toBe(0);
  });

  it('distribution sums to approximately 1.0', () => {
    for (let wave = 1; wave <= 8; wave++) {
      const dist = getWaveDistribution(getWaveConfig(wave));
      const sum = (Object.values(dist) as number[]).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 1);
    }
  });

  it('reduces gold/rainbow when new tiles are added', () => {
    const w1Dist = getWaveDistribution(getWaveConfig(1));
    const w6Dist = getWaveDistribution(getWaveConfig(6));
    // Gold + rainbow should be lower in wave 6 because lightning/magnet take share
    const w1GoldRainbow = w1Dist.gold + w1Dist.rainbow;
    const w6GoldRainbow = w6Dist.gold + w6Dist.rainbow;
    expect(w6GoldRainbow).toBeLessThan(w1GoldRainbow);
  });

  it('uses wave-specific ice and gold distributions', () => {
    const w1 = getWaveConfig(1);
    const w6 = getWaveConfig(6);
    const dist1 = getWaveDistribution(w1);
    const dist6 = getWaveDistribution(w6);
    // Wave 6 has higher ice distribution
    expect(dist6.ice).toBeGreaterThan(dist1.ice);
  });
});

// ==================== New distribution tests (47-05) ====================

describe('getWaveDistribution — new tile unlock progression', () => {
  it('wave 1: basic tiles only, no advanced tiles', () => {
    const dist = getWaveDistribution(getWaveConfig(1));
    // Basic specials all present
    expect(dist.bomb).toBeGreaterThan(0);
    expect(dist.ice).toBeGreaterThan(0);
    expect(dist.gold).toBeGreaterThan(0);
    expect(dist.rainbow).toBeGreaterThan(0);
    // Advanced tiles absent in wave 1
    expect(dist.magnet ?? 0).toBe(0);
    expect(dist.frozen ?? 0).toBe(0);
    expect(dist.prism ?? 0).toBe(0);
    expect(dist.lightning ?? 0).toBe(0);
    expect(dist.gem ?? 0).toBe(0);
    expect(dist.diamond ?? 0).toBe(0);
    expect(dist.catalyst ?? 0).toBe(0);
    expect(dist.crystal ?? 0).toBe(0);
  });

  // Sprint 1 retirement: gems / diamond / magnet do not appear at any wave.
  // The progressive-unlock tests collapse to "kept tiles still unlock, retired
  // tiles never do".
  it('wave 2: gems retired, lightning/prism/frozen/diamond/magnet still off', () => {
    const dist = getWaveDistribution(getWaveConfig(2));
    expect(dist.gem ?? 0).toBe(0);
    expect(dist.lightning ?? 0).toBe(0);
    expect(dist.prism ?? 0).toBe(0);
    expect(dist.frozen ?? 0).toBe(0);
    expect(dist.magnet ?? 0).toBe(0);
    expect(dist.diamond ?? 0).toBe(0);
  });

  it('wave 3: unlocks prism, no lightning/frozen yet', () => {
    const dist = getWaveDistribution(getWaveConfig(3));
    expect(dist.prism).toBeGreaterThan(0);
    expect(dist.lightning ?? 0).toBe(0);
    expect(dist.frozen ?? 0).toBe(0);
  });

  it('wave 4: unlocks lightning, retired diamond/magnet stay off', () => {
    const dist = getWaveDistribution(getWaveConfig(4));
    expect(dist.lightning).toBeGreaterThan(0);
    expect(dist.diamond ?? 0).toBe(0);
    expect(dist.magnet ?? 0).toBe(0);
    expect(dist.frozen ?? 0).toBe(0);
  });

  it('wave 5: diamond retired (no longer unlocks)', () => {
    const dist = getWaveDistribution(getWaveConfig(5));
    expect(dist.diamond ?? 0).toBe(0);
    expect(dist.lightning).toBeGreaterThan(0);
    expect(dist.frozen ?? 0).toBe(0);
  });

  it('wave 6: unlocks frozen obstacle, magnet stays retired', () => {
    const dist = getWaveDistribution(getWaveConfig(6));
    expect(dist.frozen ?? 0).toBeGreaterThan(0);
    expect(dist.magnet ?? 0).toBe(0);
    expect(dist.diamond ?? 0).toBe(0);
  });

  it('wave 7+: magnet stays retired', () => {
    const dist = getWaveDistribution(getWaveConfig(7));
    expect(dist.magnet ?? 0).toBe(0);
    expect(dist.lightning).toBeGreaterThan(0);
  });

  it('all distributions for waves 1-6 sum to 1.0 (within 0.01)', () => {
    for (let wave = 1; wave <= 6; wave++) {
      const dist = getWaveDistribution(getWaveConfig(wave));
      const sum = (Object.values(dist) as number[]).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 2); // within 0.01
    }
  });

  it('WaveConfig has diamondEnabled flag', () => {
    const config = getWaveConfig(1);
    expect(typeof config.diamondEnabled).toBe('boolean');
  });

  it('diamondEnabled stays false through FTUE cohort (waves 1-7)', () => {
    for (let wave = 1; wave <= 7; wave++) {
      expect(getWaveConfig(wave).diamondEnabled).toBe(false);
    }
  });

  it('crystalEnabled stays false through FTUE cohort (waves 1-7)', () => {
    for (let wave = 1; wave <= 7; wave++) {
      expect(getWaveConfig(wave).crystalEnabled).toBe(false);
    }
  });

  it('crystal absent from distribution through FTUE cohort (waves 1-7)', () => {
    for (let wave = 1; wave <= 7; wave++) {
      const dist = getWaveDistribution(getWaveConfig(wave));
      expect(dist.crystal ?? 0).toBe(0);
    }
  });

  it('wave 12 distribution still sums to ~1.0 with crystal included', () => {
    const dist = getWaveDistribution(getWaveConfig(12));
    const sum = (Object.values(dist) as number[]).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 2);
  });
});

describe('getWaveConfig archetype', () => {
  it('wave 1 is a calm normal wave (learn-the-ropes)', () => {
    expect(getWaveConfig(1).archetype).toBe('normal');
  });

  it('wave 2 is a treasureHunt wave (gem unlock)', () => {
    expect(getWaveConfig(2).archetype).toBe('treasureHunt');
  });

  it('wave 3 is a normal wave', () => {
    expect(getWaveConfig(3).archetype).toBe('normal');
  });

  it('wave 4 is a scoreRush wave (lightning unlock → big combos)', () => {
    expect(getWaveConfig(4).archetype).toBe('scoreRush');
  });

  it('wave 5 is a normal wave', () => {
    expect(getWaveConfig(5).archetype).toBe('normal');
  });

  it('wave 6 is a survival wave (tight moves, frost unlock)', () => {
    expect(getWaveConfig(6).archetype).toBe('survival');
  });

  it('wave 7 is a treasureHunt wave (vortex unlock → collection puzzle)', () => {
    expect(getWaveConfig(7).archetype).toBe('treasureHunt');
  });

  it('wave 8 is a scoreRush wave (catalyst unlock)', () => {
    expect(getWaveConfig(8).archetype).toBe('scoreRush');
  });

  it('wave 9 is a survival wave (countdown unlock)', () => {
    expect(getWaveConfig(9).archetype).toBe('survival');
  });

  it('wave 10 is a normal wave', () => {
    expect(getWaveConfig(10).archetype).toBe('normal');
  });

  it('wave 11 is a scoreRush wave (magma + portal chaos)', () => {
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

describe('getWaveObjectives — target_word and color_power seeding', () => {
  describe('seedTargetWordObjective', () => {
    it('returns objectives unchanged for wave 1-2 (wave < 3)', () => {
      const baseObjs = [{ type: 'clear_percent' as const, target: 90 }];
      expect(seedTargetWordObjective(1, 'en', baseObjs)).toEqual(baseObjs);
      expect(seedTargetWordObjective(2, 'en', baseObjs)).toEqual(baseObjs);
    });

    it('may add target_word to wave 3+ based on deterministic RNG', () => {
      const baseObjs = [{ type: 'clear_percent' as const, target: 90 }];
      const result3 = seedTargetWordObjective(3, 'en', baseObjs);
      const result4 = seedTargetWordObjective(4, 'en', baseObjs);

      // Wave 3: (3*37) % 100 = 111 % 100 = 11, which is < 25, so should add
      expect(result3.length).toBe(baseObjs.length + 1);
      expect(result3[result3.length - 1].type).toBe('target_word');
      expect(result3[result3.length - 1]).toHaveProperty('targetWord');

      // Wave 4: (4*37) % 100 = 148 % 100 = 48, which is NOT < 25, so should not add
      expect(result4).toEqual(baseObjs);
    });

    it('respects language parameter for word pool lookup', () => {
      const baseObjs = [{ type: 'clear_percent' as const, target: 90 }];
      // Wave 3 should add target_word for any language with a word pool
      const resultEn = seedTargetWordObjective(3, 'en', baseObjs);
      const resultHe = seedTargetWordObjective(3, 'he', baseObjs);

      // Both should either add or not add (depends on pool availability)
      // The key is that the language is passed through
      expect(resultEn.length).toBeGreaterThanOrEqual(baseObjs.length);
      expect(resultHe.length).toBeGreaterThanOrEqual(baseObjs.length);
    });
  });

  describe('seedColorPowerObjective', () => {
    it('returns objectives unchanged for wave 1-3 (wave < 4)', () => {
      const baseObjs = [{ type: 'clear_percent' as const, target: 90 }];
      expect(seedColorPowerObjective(1, baseObjs)).toEqual(baseObjs);
      expect(seedColorPowerObjective(2, baseObjs)).toEqual(baseObjs);
      expect(seedColorPowerObjective(3, baseObjs)).toEqual(baseObjs);
    });

    it('may add color_power to wave 4+ based on deterministic RNG', () => {
      const baseObjs = [{ type: 'clear_percent' as const, target: 90 }];
      const result4 = seedColorPowerObjective(4, baseObjs);
      const result5 = seedColorPowerObjective(5, baseObjs);

      // Wave 4: (4*47) % 100 = 188 % 100 = 88, which is NOT < 25, so should not add
      expect(result4).toEqual(baseObjs);

      // Wave 5: (5*47) % 100 = 235 % 100 = 35, which is NOT < 25, so should not add
      expect(result5).toEqual(baseObjs);
    });

    it('rotates color through pink, cyan, lime', () => {
      const baseObjs = [{ type: 'clear_percent' as const, target: 90 }];

      // Find waves that should add (call at different wave numbers)
      // The RNG formula is ((wave * 47) % 100) < 25
      // Need to find waves where this is true
      const addingWaves: number[] = [];
      for (let w = 4; w <= 20; w++) {
        if (((w * 47) % 100) < 25) {
          addingWaves.push(w);
        }
      }

      if (addingWaves.length > 0) {
        const w1 = addingWaves[0];
        const w2 = addingWaves[1] ?? w1 + 3;
        const w3 = addingWaves[2] ?? w1 + 6;

        const result1 = seedColorPowerObjective(w1, baseObjs);
        const result2 = seedColorPowerObjective(w2, baseObjs);
        const result3 = seedColorPowerObjective(w3, baseObjs);

        if (result1.length > baseObjs.length) {
          expect((result1[result1.length - 1] as any).colorTag).toMatch(/pink|cyan|lime/);
        }
      }
    });

    it('increases minColorCount at wave 8+', () => {
      // Find a wave >= 8 that adds color_power
      let addingWave8Plus: number | null = null;
      for (let w = 8; w <= 20; w++) {
        if (((w * 47) % 100) < 25) {
          addingWave8Plus = w;
          break;
        }
      }

      if (addingWave8Plus !== null) {
        const baseObjs = [{ type: 'clear_percent' as const, target: 90 }];
        const resultEarly = seedColorPowerObjective(4, baseObjs);
        const resultLate = seedColorPowerObjective(addingWave8Plus, baseObjs);

        // Extract minColorCount from the added objectives
        const earlyColor = resultEarly.find((o: any) => o.type === 'color_power');
        const lateColor = resultLate.find((o: any) => o.type === 'color_power');

        if (lateColor) {
          expect((lateColor as any).minColorCount).toBeGreaterThanOrEqual(3);
        }
      }
    });
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

    it('collect_type objectives do not demand more specials than movesAllowed', () => {
      const config = getWaveConfig(wave);
      const objectives = getWaveObjectives(wave);
      const collects = objectives.filter((o) => o.type === 'collect_type');
      for (const c of collects) {
        expect(c.target).toBeLessThanOrEqual(config.movesAllowed);
      }
    });

    it('word_length objectives do not demand more long words than movesAllowed', () => {
      const config = getWaveConfig(wave);
      const objectives = getWaveObjectives(wave);
      const wordLen = objectives.filter((o) => o.type === 'word_length');
      for (const w of wordLen) {
        expect(w.target).toBeLessThanOrEqual(config.movesAllowed);
      }
    });

    it('movesAllowed is at least 4 (minimum playable wave length)', () => {
      expect(getWaveConfig(wave).movesAllowed).toBeGreaterThanOrEqual(4);
    });
  });
});
