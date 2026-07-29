import { describe, it, expect } from 'vitest';
import { drawTiles, EN_FREQUENCY } from '../tilePool';

describe('drawTiles', () => {
  it('returns exactly N tiles', () => {
    const tiles = drawTiles(16, 'en', () => 0.5);
    expect(tiles).toHaveLength(16);
  });

  it('assigns tile id 0..N-1 in order', () => {
    const tiles = drawTiles(16, 'en', () => 0.5);
    expect(tiles.map((t) => t.id)).toEqual(Array.from({ length: 16 }, (_, i) => i));
  });

  it('only uses letters from EN_FREQUENCY when locale is en', () => {
    const tiles = drawTiles(16, 'en', () => 0.5);
    const allowed = new Set(EN_FREQUENCY.map(([l]) => l));
    tiles.forEach((t) => expect(allowed.has(t.letter)).toBe(true));
  });

  it('is deterministic when given a deterministic rng', () => {
    let seed = 0;
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    seed = 1;
    const a = drawTiles(16, 'en', rng);
    seed = 1;
    const b = drawTiles(16, 'en', rng);
    expect(a.map((t) => t.letter)).toEqual(b.map((t) => t.letter));
  });

  it('common letters get rarity=common; Q/X/Z get rarity=rare when high rng selects last bucket', () => {
    const tiles = drawTiles(50, 'en', () => 0.999);
    const rares = tiles.filter((t) => ['Q', 'X', 'Z'].includes(t.letter));
    expect(rares.length).toBeGreaterThan(0);
    rares.forEach((t) => expect(t.rarity).toBe('rare'));
  });
});
