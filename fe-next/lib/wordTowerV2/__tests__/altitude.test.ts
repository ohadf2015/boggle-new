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

  it('given a 30-block tower, when resolved, then it has left the lower atmosphere', () => {
    // v1 biome thresholds (50/150/300m) sit on a scale where one word was worth
    // metres; a v2 block is ~1m. Ported literally, every run stayed in `city`
    // forever and the whole backdrop system was invisible.
    expect(biomeIndex(biomeAtHeight(blocksToM(30)))).toBeGreaterThanOrEqual(biomeIndex('orbit'));
  });

  it('given a 10-block tower, when resolved, then the sky has already changed once', () => {
    expect(biomeIndex(biomeAtHeight(blocksToM(10)))).toBeGreaterThanOrEqual(biomeIndex('sky'));
  });

  it('given an enormous tower, when resolved, then the top biome', () => {
    expect(biomeAtHeight(10_000)).toBe('galaxy');
  });
});
