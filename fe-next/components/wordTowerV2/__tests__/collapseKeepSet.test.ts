import { describe, expect, it } from 'vitest';
import { createTowerWorld, spawnBlock } from '@/lib/wordTowerV2/engine';
import { BLOCK_HEIGHT_PX } from '@/lib/wordTowerV2/scoring';
import { collapseKeepSet } from '../runHelpers';

function standingTower() {
  const world = createTowerWorld({ seed: 1 });
  const w = 300;
  spawnBlock(world, { id: 'r0-b0', x: 0, y: -BLOCK_HEIGHT_PX / 2, widthPx: w, heightPx: BLOCK_HEIGHT_PX, vx: 0, attached: true });
  spawnBlock(world, { id: 'r0-b1', x: 4, y: -(BLOCK_HEIGHT_PX * 3) / 2, widthPx: w - 40, heightPx: BLOCK_HEIGHT_PX, vx: 0, attached: true });
  world.landed.add('r0-b0');
  world.landed.add('r0-b1');
  return world;
}

describe('collapseKeepSet — what survives a partial collapse', () => {
  it('given a standing chain plus the slab on the hook, then both are kept', () => {
    const world = standingTower();
    spawnBlock(world, { id: 'r0-hang', x: 10, y: -600, widthPx: 200, heightPx: BLOCK_HEIGHT_PX, vx: 0, attached: true });
    const keep = collapseKeepSet(world, 'r0-hang', 0);
    expect(keep).toContain('r0-b0');
    expect(keep).toContain('r0-b1');
    expect(keep).toContain('r0-hang');
  });

  it('given a floor still in the air when the tower gave way, then it is rubble — it would lie by the base like a second one', () => {
    const world = standingTower();
    // Released just before the collapse, still falling: never landed.
    spawnBlock(world, { id: 'r0-b2', x: 260, y: -900, widthPx: 200, heightPx: BLOCK_HEIGHT_PX, vx: 0 });
    const keep = collapseKeepSet(world, null, 0);
    expect(keep).toContain('r0-b0');
    expect(keep).not.toContain('r0-b2');
  });

  it('given nothing standing on the base, then the keep-set is empty (the run ends)', () => {
    const world = createTowerWorld({ seed: 1 });
    spawnBlock(world, { id: 'r0-stray', x: 300, y: -BLOCK_HEIGHT_PX / 2, widthPx: 200, heightPx: BLOCK_HEIGHT_PX, vx: 0, attached: true });
    world.landed.add('r0-stray');
    expect(collapseKeepSet(world, null, 0)).toEqual([]);
  });
});
