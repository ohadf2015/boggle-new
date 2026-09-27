import { describe, expect, it } from 'vitest';
import { Graphics } from 'pixi.js';
import { BIOMES, type SkyFx } from '@/lib/wordTowerV2/biomes';
import { FX_DRAW } from '../skyArt';

/**
 * Every sky's backdrop effect must actually put geometry on the screen. A kind
 * that silently draws nothing looks exactly like "this sky has no effect", which
 * is the bug the per-altitude effects were added to fix — and it would only show
 * up 15 floors into a run, where nobody reviews.
 */
describe('sky backdrop effects', () => {
  const KINDS = Object.keys(FX_DRAW) as SkyFx[];

  for (const kind of KINDS) {
    it(`given the ${kind} effect, when drawn at phone size, then it covers real screen area`, () => {
      const g = new Graphics();
      FX_DRAW[kind](g, 390, 844);
      const b = g.getLocalBounds();
      expect(b.width).toBeGreaterThan(100);
      expect(b.height).toBeGreaterThan(100);
    });
  }

  it('given the biome table, when its effects are read, then every one is drawable', () => {
    for (const biome of BIOMES) expect(FX_DRAW[biome.fx]).toBeTypeOf('function');
  });
});
