import { describe, expect, it } from 'vitest';
import { WORD_TOWER_BIOMES } from '@/shared/constants/wordTowerConstants';
import { BLOCK_HEIGHT_PX } from '../scoring';
import { PX_PER_M } from '../engine';
import { biomeAtHeight, publishHeightM, visualAltitudeM } from '../altitude';

const blocksToM = (n: number) => (n * BLOCK_HEIGHT_PX) / PX_PER_M;
const biomeIndex = (id: string) => WORD_TOWER_BIOMES.findIndex((b) => b.id === id);

describe('visualAltitudeM', () => {
  it('given the ground, when mapped, then zero', () => {
    expect(visualAltitudeM(0)).toBe(0);
  });

  it('given a taller tower, when mapped, then the visual altitude is higher', () => {
    expect(visualAltitudeM(10)).toBeGreaterThan(visualAltitudeM(5));
  });

  it('given a negative height from a jostled stack, when mapped, then clamps to zero', () => {
    expect(visualAltitudeM(-1)).toBe(0);
  });
});

describe('biomeAtHeight', () => {
  it('given a fresh run, when resolved, then the city', () => {
    expect(biomeAtHeight(0)).toBe('city');
  });

  it('given a typical first run (~6 blocks, observed 6.3m peak), when resolved, then it reached the stratosphere', () => {
    // Pinned to OBSERVED play, not a guess: with a x10 map real runs (6-10m)
    // only ever saw city and sky, and 4 of 6 skies were dead content.
    expect(biomeIndex(biomeAtHeight(blocksToM(6)))).toBeGreaterThanOrEqual(biomeIndex('stratosphere'));
  });

  it('given a great run of 30 blocks, when resolved, then the final biome', () => {
    expect(biomeAtHeight(blocksToM(30))).toBe('galaxy');
  });

  it('given one block, when resolved, then still the city (the first change is earned)', () => {
    expect(biomeAtHeight(blocksToM(1))).toBe('city');
  });

  it('given an enormous tower, when resolved, then the top biome', () => {
    expect(biomeAtHeight(10_000)).toBe('galaxy');
  });
});

describe('publishHeightM', () => {
  it('given a settled stack jittering in the 3rd decimal, when polled, then the published height does not move', () => {
    // The backdrop eases over 700-1000ms; a value that changes every 100ms
    // restarts every transition forever and the sky tears (the v2 flicker).
    let shown = 4.2;
    for (const raw of [4.2013, 4.1987, 4.2031, 4.1969, 4.2008]) shown = publishHeightM(shown, raw);
    expect(shown).toBe(4.2);
  });

  it('given a new block settles, when polled, then the published height follows it', () => {
    expect(publishHeightM(4.2, 5.64)).toBe(5.64);
  });

  it('given a collapse, when polled, then the drop is published', () => {
    expect(publishHeightM(5.64, 1.1)).toBe(1.1);
  });
});
