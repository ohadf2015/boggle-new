/**
 * blastWaveConfig - Pure function tests for wave scaling configuration.
 */
import { getWaveConfig, getWaveDistribution, type WaveConfig } from '../blastWaveConfig';

describe('getWaveConfig', () => {
  it('returns WaveConfig for wave 1', () => {
    const config = getWaveConfig(1);
    expect(config.minWordLength).toBe(2);
    expect(config.specialTileChance).toBe(0.10);
    expect(config.vowelModifier).toBe(1.0);
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

  it('increases minWordLength at wave 3', () => {
    expect(getWaveConfig(2).minWordLength).toBe(2);
    expect(getWaveConfig(3).minWordLength).toBe(3);
  });

  it('increases minWordLength at wave 5', () => {
    expect(getWaveConfig(4).minWordLength).toBe(3);
    expect(getWaveConfig(5).minWordLength).toBe(4);
  });

  it('enables lightning at wave 4', () => {
    expect(getWaveConfig(3).lightningEnabled).toBe(false);
    expect(getWaveConfig(4).lightningEnabled).toBe(true);
  });

  it('enables magnet at wave 6', () => {
    expect(getWaveConfig(5).magnetEnabled).toBe(false);
    expect(getWaveConfig(6).magnetEnabled).toBe(true);
  });

  it('enables gems at wave 2', () => {
    expect(getWaveConfig(1).gemEnabled).toBe(false);
    expect(getWaveConfig(2).gemEnabled).toBe(true);
  });

  it('enables prisms at wave 3', () => {
    expect(getWaveConfig(2).prismEnabled).toBe(false);
    expect(getWaveConfig(3).prismEnabled).toBe(true);
  });

  it('enables frozen at wave 4', () => {
    expect(getWaveConfig(3).frozenEnabled).toBe(false);
    expect(getWaveConfig(4).frozenEnabled).toBe(true);
  });

  it('has scoreThreshold starting at wave 4 (wave 3 is threshold-free for learning)', () => {
    expect(getWaveConfig(1).scoreThreshold).toBeUndefined();
    expect(getWaveConfig(2).scoreThreshold).toBeUndefined();
    expect(getWaveConfig(3).scoreThreshold).toBeUndefined();
    expect(getWaveConfig(4).scoreThreshold).toBe(50);
  });

  it('increases scoreThreshold for later waves', () => {
    expect(getWaveConfig(4).scoreThreshold).toBe(50);
    expect(getWaveConfig(5).scoreThreshold).toBe(80);
    expect(getWaveConfig(6).scoreThreshold).toBe(120);
  });

  it('caps scaling at wave 6+ (no further changes)', () => {
    const w6 = getWaveConfig(6);
    const w10 = getWaveConfig(10);

    expect(w10.minWordLength).toBe(w6.minWordLength);
    expect(w10.maxCascadeChain).toBe(w6.maxCascadeChain);
    expect(w10.vowelModifier).toBe(w6.vowelModifier);
    expect(w10.lightningEnabled).toBe(w6.lightningEnabled);
    expect(w10.magnetEnabled).toBe(w6.magnetEnabled);
  });

  it('increases scoreThreshold linearly beyond wave 6', () => {
    const w6 = getWaveConfig(6);
    const w7 = getWaveConfig(7);
    // Beyond wave 6, threshold should continue increasing
    expect(w7.scoreThreshold).toBeGreaterThan(w6.scoreThreshold!);
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

  it('includes gems at wave 2', () => {
    const dist = getWaveDistribution(getWaveConfig(2));
    expect(dist.gem).toBeGreaterThan(0);
    expect(dist.prism).toBe(0);
    expect(dist.frozen).toBe(0);
  });

  it('includes gems + prisms at wave 3', () => {
    const dist = getWaveDistribution(getWaveConfig(3));
    expect(dist.gem).toBeGreaterThan(0);
    expect(dist.prism).toBeGreaterThan(0);
    expect(dist.frozen).toBe(0);
  });

  it('includes lightning at wave 4', () => {
    const dist = getWaveDistribution(getWaveConfig(4));
    expect(dist.lightning).toBeGreaterThan(0);
    expect(dist.magnet).toBe(0);
  });

  it('includes all new tiles at wave 4', () => {
    const dist = getWaveDistribution(getWaveConfig(4));
    expect(dist.gem).toBeGreaterThan(0);
    expect(dist.prism).toBeGreaterThan(0);
    expect(dist.frozen).toBeGreaterThan(0);
  });

  it('includes both lightning and magnet at wave 6', () => {
    const dist = getWaveDistribution(getWaveConfig(6));
    expect(dist.lightning).toBeGreaterThan(0);
    expect(dist.magnet).toBeGreaterThan(0);
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
  it('wave 1: has no wildcard, no advanced tiles (mirror/vortex/frost/prism/lightning/gem/diamond)', () => {
    const dist = getWaveDistribution(getWaveConfig(1));
    // Wildcard must be gone
    expect(dist.wildcard ?? 0).toBe(0);
    // Basic specials all present
    expect(dist.bomb).toBeGreaterThan(0);
    expect(dist.ice).toBeGreaterThan(0);
    expect(dist.gold).toBeGreaterThan(0);
    expect(dist.silver).toBeGreaterThan(0);
    expect(dist.rainbow).toBeGreaterThan(0);
    // Advanced tiles absent in wave 1
    expect(dist.mirror ?? 0).toBe(0);
    expect(dist.vortex ?? dist.magnet ?? 0).toBe(0);
    expect(dist.frost ?? dist.frozen ?? 0).toBe(0);
    expect(dist.prism ?? 0).toBe(0);
    expect(dist.lightning ?? 0).toBe(0);
    expect(dist.gem ?? 0).toBe(0);
    expect(dist.diamond ?? 0).toBe(0);
  });

  it('wave 2: unlocks treasure gem (gem > 0), still no mirror/lightning/prism/frost/vortex/diamond', () => {
    const dist = getWaveDistribution(getWaveConfig(2));
    expect(dist.gem).toBeGreaterThan(0);
    expect(dist.mirror ?? 0).toBe(0);
    expect(dist.lightning ?? 0).toBe(0);
    expect(dist.prism ?? 0).toBe(0);
    expect(dist.frost ?? dist.frozen ?? 0).toBe(0);
    expect(dist.vortex ?? dist.magnet ?? 0).toBe(0);
    expect(dist.diamond ?? 0).toBe(0);
  });

  it('wave 3: unlocks prism + mirror (both > 0), still no lightning/frost/vortex/diamond', () => {
    const dist = getWaveDistribution(getWaveConfig(3));
    expect(dist.prism).toBeGreaterThan(0);
    expect(dist.mirror).toBeGreaterThan(0);
    expect(dist.lightning ?? 0).toBe(0);
    expect(dist.frost ?? dist.frozen ?? 0).toBe(0);
    expect(dist.vortex ?? dist.magnet ?? 0).toBe(0);
    expect(dist.diamond ?? 0).toBe(0);
  });

  it('wave 4: unlocks frost + lightning + diamond (all > 0), still no vortex/magnet', () => {
    const dist = getWaveDistribution(getWaveConfig(4));
    expect(dist.frost ?? dist.frozen ?? 0).toBeGreaterThan(0);
    expect(dist.lightning).toBeGreaterThan(0);
    expect(dist.diamond).toBeGreaterThan(0);
    expect(dist.vortex ?? dist.magnet ?? 0).toBe(0);
  });

  it('wave 5: all tiles except vortex/magnet are > 0', () => {
    const dist = getWaveDistribution(getWaveConfig(5));
    expect(dist.bomb).toBeGreaterThan(0);
    expect(dist.ice).toBeGreaterThan(0);
    expect(dist.gold).toBeGreaterThan(0);
    expect(dist.silver).toBeGreaterThan(0);
    expect(dist.rainbow).toBeGreaterThan(0);
    expect(dist.gem).toBeGreaterThan(0);
    expect(dist.prism).toBeGreaterThan(0);
    expect(dist.mirror).toBeGreaterThan(0);
    expect(dist.lightning).toBeGreaterThan(0);
    expect(dist.frost ?? dist.frozen ?? 0).toBeGreaterThan(0);
    expect(dist.diamond).toBeGreaterThan(0);
    expect(dist.vortex ?? dist.magnet ?? 0).toBe(0);
  });

  it('wave 6+: everything including vortex/magnet is > 0', () => {
    const dist = getWaveDistribution(getWaveConfig(6));
    expect(dist.vortex ?? dist.magnet ?? 0).toBeGreaterThan(0);
    expect(dist.mirror).toBeGreaterThan(0);
    expect(dist.diamond).toBeGreaterThan(0);
  });

  it('all distributions for waves 1-6 sum to 1.0 (within 0.01)', () => {
    for (let wave = 1; wave <= 6; wave++) {
      const dist = getWaveDistribution(getWaveConfig(wave));
      const sum = (Object.values(dist) as number[]).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 2); // within 0.01
    }
  });

  it('silver is present in all waves (basic tier)', () => {
    for (let wave = 1; wave <= 6; wave++) {
      const dist = getWaveDistribution(getWaveConfig(wave));
      expect(dist.silver).toBeGreaterThan(0);
    }
  });

  it('no wildcard in any wave 1-10', () => {
    for (let wave = 1; wave <= 10; wave++) {
      const dist = getWaveDistribution(getWaveConfig(wave));
      expect(dist.wildcard ?? 0).toBe(0);
    }
  });

  it('WaveConfig has mirrorEnabled, silverEnabled, diamondEnabled flags', () => {
    const config = getWaveConfig(1);
    expect(typeof config.mirrorEnabled).toBe('boolean');
    expect(typeof config.silverEnabled).toBe('boolean');
    expect(typeof config.diamondEnabled).toBe('boolean');
  });

  it('mirrorEnabled=false for wave 1-2, true for wave 3+', () => {
    expect(getWaveConfig(1).mirrorEnabled).toBe(false);
    expect(getWaveConfig(2).mirrorEnabled).toBe(false);
    expect(getWaveConfig(3).mirrorEnabled).toBe(true);
  });

  it('diamondEnabled=false for wave 1-3, true for wave 4+', () => {
    expect(getWaveConfig(3).diamondEnabled).toBe(false);
    expect(getWaveConfig(4).diamondEnabled).toBe(true);
  });

  it('silverEnabled=true for all waves', () => {
    for (let wave = 1; wave <= 6; wave++) {
      expect(getWaveConfig(wave).silverEnabled).toBe(true);
    }
  });
});
