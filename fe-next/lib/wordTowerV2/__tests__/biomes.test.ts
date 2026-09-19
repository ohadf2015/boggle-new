import { describe, expect, it } from 'vitest';
import { BIOMES, biomeAt, floorsAt, lerpColour, skyAt } from '../biomes';

describe('floorsAt', () => {
  it('given 3m storeys, when a height is converted, then it counts floors', () => {
    expect(floorsAt(0)).toBe(0);
    expect(floorsAt(9)).toBeCloseTo(3, 6);
  });

  it('given a jostled stack reading below ground, when converted, then clamps to zero', () => {
    expect(floorsAt(-0.4)).toBe(0);
  });
});

describe('BIOMES', () => {
  it('given the table, when read, then it starts on the ground and climbs strictly', () => {
    expect(BIOMES[0].fromFloor).toBe(0);
    for (let i = 1; i < BIOMES.length; i += 1) expect(BIOMES[i].fromFloor).toBeGreaterThan(BIOMES[i - 1].fromFloor);
  });

  it('given a typical run (~8 floors), when climbed, then at least three skies are seen', () => {
    const seen = new Set<string>();
    for (let f = 0; f <= 8; f += 0.5) seen.add(biomeAt(f).id);
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });

  it('given a great run (30 floors), when climbed, then it reaches the final sky', () => {
    expect(biomeAt(30).id).toBe(BIOMES[BIOMES.length - 1].id);
  });

  it('given every biome, when read, then ids are unique (they are i18n keys)', () => {
    expect(new Set(BIOMES.map((b) => b.id)).size).toBe(BIOMES.length);
  });
});

describe('skyAt', () => {
  it('given the ground, when read, then pure first sky, no blend', () => {
    const s = skyAt(0);
    expect(s.from.id).toBe(BIOMES[0].id);
    expect(s.t).toBe(0);
  });

  it('given a climb across a boundary, when sampled finely, then the sky colour never jumps', () => {
    // The v2 flicker: skies snapped at thresholds. Colour must move continuously.
    let prev = skyAt(0).top;
    for (let f = 0; f <= 35; f += 0.02) {
      const { top } = skyAt(f);
      const jump = Math.max(
        Math.abs(((top >> 16) & 255) - ((prev >> 16) & 255)),
        Math.abs(((top >> 8) & 255) - ((prev >> 8) & 255)),
        Math.abs((top & 255) - (prev & 255)),
      );
      expect(jump).toBeLessThanOrEqual(6);
      prev = top;
    }
  });

  it('given space, when read, then stars are out; on the street they are not', () => {
    expect(skyAt(0).stars).toBe(0);
    expect(skyAt(35).stars).toBeGreaterThan(0.8);
  });
});

describe('lerpColour', () => {
  it('given endpoints, when blended, then exact at 0 and 1 and midway between', () => {
    expect(lerpColour(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(lerpColour(0x000000, 0xffffff, 1)).toBe(0xffffff);
    expect(lerpColour(0x000000, 0x0000ff, 0.5)).toBe(0x000080);
  });
});
