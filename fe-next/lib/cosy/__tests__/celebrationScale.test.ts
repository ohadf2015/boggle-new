import { describe, it, expect } from 'vitest';
import {
  celebrationScale,
  scaleParticleCount,
  applyCelebrationIntensity,
} from '../celebrationScale';

describe('celebrationScale', () => {
  it('leaves full intensity untouched (multipliers = 1, shake on)', () => {
    const s = celebrationScale('full');
    expect(s.particleMultiplier).toBe(1);
    expect(s.spreadMultiplier).toBe(1);
    expect(s.durationMultiplier).toBe(1);
    expect(s.enableScreenShake).toBe(true);
  });

  it('dials gentle down but keeps it celebratory (reduced, shake off)', () => {
    const s = celebrationScale('gentle');
    expect(s.particleMultiplier).toBeLessThan(1);
    expect(s.particleMultiplier).toBeGreaterThan(0);
    expect(s.spreadMultiplier).toBeLessThan(1);
    expect(s.enableScreenShake).toBe(false);
  });
});

describe('scaleParticleCount', () => {
  it('returns the base count unchanged at full intensity', () => {
    expect(scaleParticleCount(120, 'full')).toBe(120);
  });

  it('reduces the count at gentle intensity', () => {
    expect(scaleParticleCount(120, 'gentle')).toBeLessThan(120);
  });

  it('never drops a celebration to zero particles (payoff survives)', () => {
    // Even a tiny base burst stays visible under gentle.
    expect(scaleParticleCount(3, 'gentle')).toBeGreaterThan(0);
    expect(scaleParticleCount(1, 'gentle')).toBeGreaterThan(0);
  });

  it('returns whole numbers (particle counts are integers)', () => {
    expect(Number.isInteger(scaleParticleCount(123, 'gentle'))).toBe(true);
  });
});

describe('applyCelebrationIntensity', () => {
  it('returns the options untouched at full intensity', () => {
    const opts = { particleCount: 40, spread: 80, scalar: 1.2 };
    expect(applyCelebrationIntensity(opts, 'full')).toEqual(opts);
  });

  it('scales particle count and spread down at gentle intensity', () => {
    const out = applyCelebrationIntensity({ particleCount: 40, spread: 80 }, 'gentle');
    expect(out.particleCount).toBeLessThan(40);
    expect(out.particleCount).toBeGreaterThan(0);
    expect(out.spread).toBeLessThan(80);
  });

  it('leaves options without particleCount/spread alone (no NaN)', () => {
    const out = applyCelebrationIntensity({ scalar: 1.4 }, 'gentle');
    expect(out.scalar).toBe(1.4);
    expect('particleCount' in out).toBe(false);
  });

  it('does not mutate the input object', () => {
    const opts = { particleCount: 40, spread: 80 };
    applyCelebrationIntensity(opts, 'gentle');
    expect(opts.particleCount).toBe(40);
    expect(opts.spread).toBe(80);
  });
});
