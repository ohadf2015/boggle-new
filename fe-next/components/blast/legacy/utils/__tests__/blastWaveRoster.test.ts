import { describe, it, expect } from 'vitest';
import { applyFeaturedRoster, getFeaturedSpecialsForWave, CORE_SPECIALS, FEATURED_MIN_SHARE } from '../blastWaveRoster';
import { getWaveConfig, getWaveDistribution } from '../blastWaveConfig';

describe('applyFeaturedRoster', () => {
  const dist = { gold: 0.2, bomb: 0.22, rainbow: 0.2, ice: 0.25, lightning: 0.05, prism: 0.04, anchor: 0.04 };

  it('zeroes active specials that are neither core nor featured', () => {
    const out = applyFeaturedRoster({ ...dist }, ['prism']);
    expect(out.lightning).toBe(0);
    expect(out.anchor).toBe(0);
    expect(out.prism).toBeGreaterThan(0);
  });

  it('keeps core specials untouched by the filter', () => {
    const out = applyFeaturedRoster({ ...dist }, []);
    for (const core of CORE_SPECIALS) expect(out[core]).toBeGreaterThan(0);
  });

  it('boosts featured share to at least FEATURED_MIN_SHARE', () => {
    const out = applyFeaturedRoster({ ...dist }, ['prism']);
    expect(out.prism).toBeGreaterThanOrEqual(FEATURED_MIN_SHARE);
  });

  it('undefined featured leaves the distribution unchanged (opt-in behavior)', () => {
    const out = applyFeaturedRoster({ ...dist }, undefined);
    expect(out).toEqual(dist);
  });
});

describe('getFeaturedSpecialsForWave', () => {
  it('waves 1-2 feature nothing (core-only teaching waves)', () => {
    expect(getFeaturedSpecialsForWave(1)).toEqual([]);
    expect(getFeaturedSpecialsForWave(2)).toEqual([]);
  });

  it('never features more than 2 specials', () => {
    for (let w = 1; w <= 30; w++) expect(getFeaturedSpecialsForWave(w).length).toBeLessThanOrEqual(2);
  });

  it('is deterministic', () => {
    expect(getFeaturedSpecialsForWave(17)).toEqual(getFeaturedSpecialsForWave(17));
  });
});

describe('wave distribution invariant (the anti-memorization guarantee)', () => {
  it('every wave spawns at most CORE + 2 featured special kinds', () => {
    for (let w = 1; w <= 30; w++) {
      const distW = getWaveDistribution(getWaveConfig(w));
      const nonZeroSpecials = Object.entries(distW)
        .filter(([k, v]) => v > 0 && k !== 'standard' && !CORE_SPECIALS.has(k as never));
      expect(nonZeroSpecials.length, `wave ${w}: ${nonZeroSpecials.map(([k]) => k).join(',')}`).toBeLessThanOrEqual(2);
    }
  });
});
