import { describe, it, expect, beforeEach } from 'vitest';
import { createTowerWorld, spawnBlock, despawnBlock, stepWorld, snapshotWorld } from '../engine';
import { standingChain } from '../stability';

describe('Fallen blocks off the side of the tower', () => {
  let world: ReturnType<typeof createTowerWorld>;

  beforeEach(() => {
    world = createTowerWorld({ seed: 42 });
  });

  it('given a block placed and rested, when it falls off the side of the tower, then it becomes debris (not in standing chain)', () => {
    // Place a base floor at x=0, hanging from crane (attached=true, vx=0)
    const baseId = 'r0-b0';
    spawnBlock(world, { id: baseId, x: 0, y: -200, widthPx: 140, heightPx: 34, vx: 0, attached: true });

    // Release and step until it lands and rests
    spawnBlock(world, { id: baseId, x: 0, y: -200, widthPx: 140, heightPx: 34, vx: 0, attached: false });
    for (let i = 0; i < 200; i++) stepWorld(world, 10);

    let snap = snapshotWorld(world);
    const chain = standingChain(snap.blocks, baseId);
    expect(chain).toContain(baseId);

    // Add a second floor far to the right at the same level (will topple off)
    const debrisId = 'r1-b0';
    spawnBlock(world, { id: debrisId, x: 800, y: -200, widthPx: 140, heightPx: 34, vx: 0, attached: false });

    // Step until it falls and settles
    for (let i = 0; i < 400; i++) stepWorld(world, 10);

    snap = snapshotWorld(world);

    // The debris should exist in the world
    expect(snap.blocks.some((b) => b.id === debrisId)).toBe(true);

    // But it should NOT be in the standing chain (it's not part of the tower)
    const chainAfter = standingChain(snap.blocks, baseId);
    expect(chainAfter).not.toContain(debrisId);
    expect(chainAfter).toContain(baseId);

    // The tower height should only count the base, not the debris
    expect(snap.towerHeightM).toBeLessThan(2); // Just the base floor
  });

  it('given debris blocks off to the sides, when they are removed from world.blocks, then snapshotWorld reflects the removal', () => {
    // Place base
    const baseId = 'r0-b0';
    spawnBlock(world, { id: baseId, x: 0, y: -200, widthPx: 140, heightPx: 34, vx: 0, attached: false });

    // Step to rest
    for (let i = 0; i < 200; i++) stepWorld(world, 10);

    // Add left debris
    const leftDebris = 'r1-b0';
    spawnBlock(world, { id: leftDebris, x: -800, y: -200, widthPx: 140, heightPx: 34, vx: 0, attached: false });

    // Add right debris
    const rightDebris = 'r2-b0';
    spawnBlock(world, { id: rightDebris, x: 800, y: -200, widthPx: 140, heightPx: 34, vx: 0, attached: false });

    // Step to rest both
    for (let i = 0; i < 400; i++) stepWorld(world, 10);

    let snap = snapshotWorld(world);
    expect(snap.blocks.length).toBe(3); // base + left + right

    // Remove both debris
    despawnBlock(world, leftDebris);
    despawnBlock(world, rightDebris);

    snap = snapshotWorld(world);

    // Only base should remain
    expect(snap.blocks.length).toBe(1);
    expect(snap.blocks[0].id).toBe(baseId);
  });
});
