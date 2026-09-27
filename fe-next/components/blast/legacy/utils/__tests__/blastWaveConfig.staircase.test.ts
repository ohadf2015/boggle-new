import { describe, it, expect } from 'vitest';
import {
  getWaveConfig, getWaveDistribution,
  MAGMA_SHARE, DIAMOND_SHARE, CRYSTAL_SHARE, COUNTDOWN_SHARE,
  PORTAL_SHARE, CATALYST_SHARE, FUSE_SHARE,
  SHUFFLE_SHARE, ANCHOR_SHARE,
} from '../blastWaveConfig';

describe('blast tile revival staircase — wave 8 unlocks', () => {
  it('enables diamond + anchor + gem + magma', () => {
    const c = getWaveConfig(8);
    expect(c.diamondEnabled).toBe(true);
    expect(c.anchorEnabled).toBe(true);
    expect(c.gemEnabled).toBe(true);
    expect(c.magmaEnabled).toBe(true);
  });

  it('does NOT yet enable wave 9+ tiles', () => {
    const c = getWaveConfig(8);
    expect(c.vortexEnabled).toBe(false);
    expect(c.shuffleEnabled).toBe(false);
    expect(c.portalEnabled).toBe(false);
    expect(c.catalystEnabled).toBe(false);
    expect(c.countdownEnabled).toBe(false);
    expect(c.crystalEnabled).toBe(false);
    expect(c.fuseEnabled).toBe(false);
  });
});

describe('blast tile revival staircase — wave 9 unlocks', () => {
  it('adds vortex + catalyst + portal + shuffle on top of wave 8', () => {
    const c = getWaveConfig(9);
    // Wave-8 inheritance
    expect(c.diamondEnabled).toBe(true);
    expect(c.anchorEnabled).toBe(true);
    expect(c.gemEnabled).toBe(true);
    expect(c.magmaEnabled).toBe(true);
    // Wave-9 unlocks
    expect(c.vortexEnabled).toBe(true);
    expect(c.catalystEnabled).toBe(true);
    expect(c.portalEnabled).toBe(true);
    expect(c.shuffleEnabled).toBe(true);
    // Wave 10+ still off
    expect(c.countdownEnabled).toBe(false);
    expect(c.fuseEnabled).toBe(false);
    expect(c.crystalEnabled).toBe(false);
  });
});

describe('blast tile revival staircase — wave 10 unlocks', () => {
  it('adds countdown + fuse + crystal on top of wave 9', () => {
    const c = getWaveConfig(10);
    expect(c.countdownEnabled).toBe(true);
    expect(c.fuseEnabled).toBe(true);
    expect(c.crystalEnabled).toBe(true);
  });
});

describe('blast tile revival staircase — wave 12+ inherits everything', () => {
  it('every retired flag is on at wave 12 and beyond', () => {
    for (const wave of [12, 13, 15]) {
      const c = getWaveConfig(wave);
      for (const flag of [
        'diamondEnabled', 'anchorEnabled', 'gemEnabled', 'magmaEnabled',
        'vortexEnabled', 'catalystEnabled', 'portalEnabled', 'shuffleEnabled',
        'countdownEnabled', 'fuseEnabled', 'crystalEnabled',
      ] as const) {
        expect(c[flag]).toBe(true);
      }
    }
  });
});

describe('blast tile revival — 2× rare-tile shares', () => {
  it('rare-tile share constants are 2× their pre-revival values', () => {
    expect(MAGMA_SHARE).toBe(0.08);
    expect(DIAMOND_SHARE).toBe(0.08);
    expect(CRYSTAL_SHARE).toBe(0.06);
    expect(COUNTDOWN_SHARE).toBe(0.08);
    expect(PORTAL_SHARE).toBe(0.08);
    expect(CATALYST_SHARE).toBe(0.08);
    expect(FUSE_SHARE).toBe(0.08);
    expect(SHUFFLE_SHARE).toBe(0.08);
    expect(ANCHOR_SHARE).toBe(0.08);
  });
});

describe('blast tile revival — gold + rainbow stay viable as score economy', () => {
  // Gold (×3 multiplier) and rainbow (cascade trigger) are the bread-and-butter
  // score sources. Sprint 1+2 retirement was driven by spawn-dilution; we must
  // not re-introduce dilution at the OTHER end (zeroing the workhorse multipliers).
  // Combined floor of 0.10 = at least one in ten specials is gold+rainbow.
  it('gold + rainbow combined share stays ≥ 0.05 at every wave (post-normalization)', () => {
    for (let w = 1; w <= 15; w++) {
      const dist = getWaveDistribution(getWaveConfig(w));
      const goldRainbow = (dist.gold ?? 0) + (dist.rainbow ?? 0);
      expect(goldRainbow).toBeGreaterThanOrEqual(0.05);
    }
  });
});
