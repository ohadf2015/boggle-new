import { describe, expect, it } from 'vitest';
import { WORD_TOWER_BIOMES } from '@/shared/constants/wordTowerConstants';
import { BLOCK_HEIGHT_PX } from '../scoring';
import { PX_PER_M } from '../engine';
import { biomeAtHeight, visualAltitudeM } from '../altitude';

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
