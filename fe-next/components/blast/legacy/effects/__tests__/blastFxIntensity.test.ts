import { describe, it, expect } from 'vitest';
import { wordFxIntensity, chainFxStep, coinChimeFreq, CHAIN_EDGE_COLORS } from '../blastFxIntensity';

describe('wordFxIntensity', () => {
  it('treats a 3-letter, low-score word as a tap: no shake, small burst, no banner', () => {
    const fx = wordFxIntensity(3, 3);
    expect(fx.shake).toBe('none');
    expect(fx.power).toBeLessThan(0.15);
    expect(fx.particleScale).toBeLessThan(0.8);
    expect(fx.bigWord).toBe(false);
  });

  it('makes a 7-letter word an event: heavy-ish shake, big burst, banner flourish', () => {
    const fx = wordFxIntensity(7, 30);
    expect(['medium', 'heavy']).toContain(fx.shake);
    expect(fx.particleScale).toBeGreaterThan(1.4);
    expect(fx.bigWord).toBe(true);
  });

  it('rises monotonically with word length at a fixed score', () => {
    const powers = [3, 4, 5, 6, 7, 8, 9].map((n) => wordFxIntensity(n, 10).power);
    for (let i = 1; i < powers.length; i++) expect(powers[i]).toBeGreaterThanOrEqual(powers[i - 1]);
  });

  it('lets a high score lift a short word without making it a big word', () => {
    const plain = wordFxIntensity(4, 4);
    const rich = wordFxIntensity(4, 60);
    expect(rich.power).toBeGreaterThan(plain.power);
    expect(rich.bigWord).toBe(false);
  });

  it('caps power at 1 and pitch at 1.4 for absurd inputs', () => {
    const fx = wordFxIntensity(16, 9999);
    expect(fx.power).toBe(1);
    expect(fx.pitch).toBeLessThanOrEqual(1.4);
  });

  it('survives zero / negative / NaN input', () => {
    for (const fx of [wordFxIntensity(0, 0), wordFxIntensity(-2, -5), wordFxIntensity(Number.NaN, Number.NaN)]) {
      expect(fx.power).toBe(0);
      expect(fx.shake).toBe('none');
      expect(fx.pitch).toBe(1);
    }
  });
});

describe('chainFxStep', () => {
  it('climbs a pentatonic ladder: each level is higher than the last', () => {
    const f = [1, 2, 3, 4, 5, 6].map((l) => chainFxStep(l).freq);
    for (let i = 1; i < f.length; i++) expect(f[i]).toBeGreaterThan(f[i - 1]);
  });

  it('adds one flare ring per level, capped at 4', () => {
    expect(chainFxStep(1).rings).toBe(1);
    expect(chainFxStep(3).rings).toBe(3);
    expect(chainFxStep(9).rings).toBe(4);
  });

  it('tints the board edge with an escalating neo color per level', () => {
    expect(chainFxStep(1).edgeColor).toBe(CHAIN_EDGE_COLORS[0]);
    expect(chainFxStep(4).edgeColor).toBe(CHAIN_EDGE_COLORS[3]);
    expect(chainFxStep(20).edgeColor).toBe(CHAIN_EDGE_COLORS[CHAIN_EDGE_COLORS.length - 1]);
  });

  it('returns a silent step for level 0', () => {
    expect(chainFxStep(0).rings).toBe(0);
  });
});

describe('coinChimeFreq', () => {
  it('rises with each coin in a stack and never repeats a pitch for the first 8', () => {
    const f = Array.from({ length: 8 }, (_, i) => coinChimeFreq(i));
    for (let i = 1; i < f.length; i++) expect(f[i]).toBeGreaterThan(f[i - 1]);
  });

  it('stays in an audible, non-piercing range', () => {
    expect(coinChimeFreq(0)).toBeGreaterThanOrEqual(800);
    expect(coinChimeFreq(40)).toBeLessThanOrEqual(3200);
  });
});
