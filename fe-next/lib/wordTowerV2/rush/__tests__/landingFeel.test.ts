import { describe, expect, it } from 'vitest';
import { HITSTOP_MS, perfectLandingFeel, traitTint } from '../landingFeel';
import type { BlockTrait } from '../types';

describe('traitTint', () => {
  it('given a plain block, when tinted, then nothing changes', () => {
    expect(traitTint('plain')).toBeNull();
  });

  it('given gold, when tinted, then it reuses the reward gold paint', () => {
    expect(traitTint('gold')).toBe('gold');
  });

  it('given each special trait, when tinted, then it gets its own facade and a darker trim', () => {
    const special: BlockTrait[] = ['feather', 'anvil', 'magnet', 'lucky'];
    const fills = special.map((t) => {
      const tint = traitTint(t);
      if (!tint || tint === 'gold') throw new Error(t);
      expect(tint[1]).not.toBe(tint[0]);
      return tint[0];
    });
    expect(new Set(fills).size).toBe(special.length);
  });

  it('given anvil and feather, when compared, then anvil reads heavier (darker) than feather', () => {
    const lum = (c: number) => ((c >> 16) & 255) + ((c >> 8) & 255) + (c & 255);
    const anvil = traitTint('anvil') as [number, number];
    const feather = traitTint('feather') as [number, number];
    expect(lum(anvil[0])).toBeLessThan(lum(feather[0]));
  });
});

describe('perfectLandingFeel', () => {
  it('given reduced motion, when a perfect lands, then there is no hitstop or punch', () => {
    expect(perfectLandingFeel(5, true)).toEqual({ hitstopMs: 0, squash: 0, shake: 0, punchPx: 0 });
  });

  it('given a first perfect, when it lands, then it gets the base hitstop and a squash', () => {
    const feel = perfectLandingFeel(1, false);
    expect(feel.hitstopMs).toBe(HITSTOP_MS);
    expect(feel.squash).toBeGreaterThan(0);
    expect(feel.shake).toBeGreaterThan(0);
  });

  it('given a growing combo, when it lands, then shake, squash and punch escalate but stay capped', () => {
    const a = perfectLandingFeel(1, false);
    const b = perfectLandingFeel(4, false);
    const c = perfectLandingFeel(50, false);
    expect(b.shake).toBeGreaterThan(a.shake);
    expect(b.punchPx).toBeGreaterThan(a.punchPx);
    expect(b.squash).toBeGreaterThanOrEqual(a.squash);
    expect(c.shake).toBeLessThanOrEqual(16);
    expect(c.squash).toBeLessThanOrEqual(1);
    expect(c).toEqual(perfectLandingFeel(8, false));
  });
});
