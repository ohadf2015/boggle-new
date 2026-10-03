import { describe, it, expect, vi } from 'vitest';
import { standingChain, type IdBlock } from '../stability';
import { cleanupDebris } from '../debris';
import { createTowerWorld, spawnBlock } from '../engine';

/** A straight, upright n-floor tower on the street, lowest floor first. */
function tower(n: number): IdBlock[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `r0-b${i}`,
    x: 0,
    y: -17 - i * 34,
    widthPx: 140,
    heightPx: 34,
    angleRad: 0,
  }));
}

describe('standingChain on a tall tower', () => {
  it('Given a 200-floor straight tower, when asked for the chain, then every floor is returned in order', () => {
    const blocks = tower(200);
    const ids = standingChain([...blocks].reverse(), 'r0-b0');
    expect(ids).toEqual(blocks.map((b) => b.id));
  });

  it('Given a 400-floor tower, when computed 20 times (frames), then it stays well under a frame budget each', () => {
    const blocks = tower(400);
    const start = performance.now();
    for (let i = 0; i < 20; i++) standingChain(blocks);
    const perCallMs = (performance.now() - start) / 20;
    // The old O(n^3) walk took tens of ms per call here; a 60fps frame is 16ms.
    expect(perCallMs).toBeLessThan(4);
  });
});

describe('cleanupDebris', () => {
  it('Given every block is inside the playfield, when cleaning up, then the standing chain is never computed', () => {
    const world = createTowerWorld({ seed: 1 });
    spawnBlock(world, { id: 'r0-b0', x: 0, y: -20, widthPx: 140, heightPx: 34, vx: 0, attached: false });
    const chain = vi.fn(() => new Set<string>());
    cleanupDebris(world, chain);
    expect(chain).not.toHaveBeenCalled();
  });

  it('Given a block outside the playfield, when cleaning up, then it is removed unless it is in the chain', () => {
    const world = createTowerWorld({ seed: 1 });
    spawnBlock(world, { id: 'far', x: 9000, y: -20, widthPx: 140, heightPx: 34, vx: 0, attached: false });
    cleanupDebris(world, () => new Set<string>());
    expect(world.blocks.has('far')).toBe(false);
  });
});
