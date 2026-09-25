import { describe, it, expect, beforeEach } from 'vitest';
import { createTowerWorld, spawnBlock, despawnBlock, stepWorld, snapshotWorld, PX_PER_M } from '../engine';
import { standingChain } from '../stability';
import { Body } from 'matter-js';

describe('Fallen blocks off the side of the tower', () => {
  let world: ReturnType<typeof createTowerWorld>;

  beforeEach(() => {
    world = createTowerWorld({ seed: 42 });
  });

  it('when a non-chain block falls off the side of the tower, then it is auto-despawned after leaving bounds', () => {
    // Place a base floor at x=0, so we have a standing chain
    const baseId = 'r0-b0';
    spawnBlock(world, { id: baseId, x: 0, y: -200, widthPx: 140, heightPx: 34, vx: 0, attached: false });

    // Step until it lands and rests (needs ~200 steps at 10ms each)
    for (let i = 0; i < 300; i++) stepWorld(world, 10);

    let snap = snapshotWorld(world);
    const chain = standingChain(snap.blocks, baseId);
    expect(chain).toContain(baseId);
    expect(snap.blocks.length).toBe(1);

    // Capture peak before debris
    const peakHeightPxBefore = world.peakHeightPx;
    const runPeakPxBefore = world.runPeakPx;

    // Add a block that will drift off the side (spawn inside bounds, will slide right)
    const debrisId = 'r1-b0';
    spawnBlock(world, { id: debrisId, x: 2150, y: -300, widthPx: 140, heightPx: 34, vx: 0.5, attached: false });

    // Assert debris is present right after spawning
    let snap2 = snapshotWorld(world);
    expect(snap2.blocks.some((b) => b.id === debrisId)).toBe(true);

    // Step many times to let it slide off the right edge (world bounds are ±2000, margin ~100)
    for (let i = 0; i < 1000; i++) {
      stepWorld(world, 10);
    }

    snap = snapshotWorld(world);

    // The debris block should have been auto-despawned (removed from the world)
    expect(snap.blocks.length).toBe(1);
    expect(snap.blocks[0].id).toBe(baseId);
    expect(snap.blocks.some((b) => b.id === debrisId)).toBe(false);

    // Peak heights should be unchanged by debris cleanup
    expect(world.peakHeightPx).toBe(peakHeightPxBefore);
    expect(world.runPeakPx).toBe(runPeakPxBefore);
  });

  it('when a chain block is in the standing chain, then it is NOT auto-despawned even if far from origin', () => {
    // Place a base at origin
    const baseId = 'r0-b0';
    spawnBlock(world, { id: baseId, x: 0, y: -200, widthPx: 140, heightPx: 34, vx: 0, attached: false });

    for (let i = 0; i < 300; i++) stepWorld(world, 10);

    // Add another block on top of the base (part of the chain)
    const topId = 'r1-b0';
    spawnBlock(world, { id: topId, x: 0, y: -250, widthPx: 140, heightPx: 34, vx: 0, attached: false });

    for (let i = 0; i < 300; i++) stepWorld(world, 10);

    let snap = snapshotWorld(world);
    const chain = standingChain(snap.blocks, baseId);
    expect(chain).toContain(baseId);
    expect(chain).toContain(topId);
    expect(snap.blocks.length).toBe(2);

    // Step many more times
    for (let i = 0; i < 1000; i++) stepWorld(world, 10);

    snap = snapshotWorld(world);

    // Both blocks should still be there (part of the chain)
    expect(snap.blocks.length).toBe(2);
    expect(snap.blocks.some((b) => b.id === baseId)).toBe(true);
    expect(snap.blocks.some((b) => b.id === topId)).toBe(true);
  });

  it('when a non-chain block falls below the ground, then it is auto-despawned', () => {
    // Place a base floor at x=0
    const baseId = 'r0-b0';
    spawnBlock(world, { id: baseId, x: 0, y: -200, widthPx: 140, heightPx: 34, vx: 0, attached: false });

    for (let i = 0; i < 300; i++) stepWorld(world, 10);

    // Add a block spawned well below ground (positive y is down in Matter)
    const debrisId = 'r1-b0';
    spawnBlock(world, { id: debrisId, x: 500, y: 400, widthPx: 140, heightPx: 34, vx: 0, attached: false });

    // Step a few times to let cleanup run
    for (let i = 0; i < 100; i++) stepWorld(world, 10);

    const snap = snapshotWorld(world);

    // The debris should have been auto-despawned
    expect(snap.blocks.length).toBe(1);
    expect(snap.blocks[0].id).toBe(baseId);
    expect(snap.blocks.some((b) => b.id === debrisId)).toBe(false);
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

    // Remove both debris manually (to verify despawnBlock works)
    despawnBlock(world, leftDebris);
    despawnBlock(world, rightDebris);

    snap = snapshotWorld(world);

    // Only base should remain
    expect(snap.blocks.length).toBe(1);
    expect(snap.blocks[0].id).toBe(baseId);
  });

  it('when chain blocks are moved off-screen via forced position, collapse detection still fires', () => {
    // Stack 3 blocks at x=0
    const baseId = 'r0-b0';
    spawnBlock(world, { id: baseId, x: 0, y: -200, widthPx: 140, heightPx: 34, vx: 0, attached: false });

    for (let i = 0; i < 300; i++) stepWorld(world, 10);

    const mid2Id = 'r1-b0';
    spawnBlock(world, { id: mid2Id, x: 0, y: -250, widthPx: 140, heightPx: 34, vx: 0, attached: false });

    for (let i = 0; i < 300; i++) stepWorld(world, 10);

    const topId = 'r2-b0';
    spawnBlock(world, { id: topId, x: 0, y: -300, widthPx: 140, heightPx: 34, vx: 0, attached: false });

    for (let i = 0; i < 300; i++) stepWorld(world, 10);

    let snap = snapshotWorld(world);
    const chain = standingChain(snap.blocks, baseId);
    expect(chain).toContain(baseId);
    expect(chain).toContain(mid2Id);
    expect(chain).toContain(topId);

    const runPeakBefore = world.runPeakPx;
    expect(runPeakBefore).toBeGreaterThan(0);

    // Now move top 2 blocks off-screen to x=3000 and zero their velocity
    const topBody = world.blocks.get(topId)!;
    const mid2Body = world.blocks.get(mid2Id)!;
    Body.setPosition(topBody, { x: 3000, y: -300 });
    Body.setVelocity(topBody, { x: 0, y: 0 });
    Body.setAngularVelocity(topBody, 0);
    Body.setPosition(mid2Body, { x: 3000, y: -250 });
    Body.setVelocity(mid2Body, { x: 0, y: 0 });
    Body.setAngularVelocity(mid2Body, 0);

    // Step to let cleanup remove the off-screen blocks
    for (let i = 0; i < 100; i++) stepWorld(world, 10);

    snap = snapshotWorld(world);

    // Top 2 should be gone (cleanup removed them), base remains
    expect(snap.blocks.some((b) => b.id === topId)).toBe(false);
    expect(snap.blocks.some((b) => b.id === mid2Id)).toBe(false);
    expect(snap.blocks.some((b) => b.id === baseId)).toBe(true);

    // Collapse should have fired (height dropped from 3 blocks to 1 block)
    expect(snap.collapsed).toBe(true);

    // runPeak should be unchanged (it records the best, never decreases)
    expect(world.runPeakPx).toBe(runPeakBefore);
  });

  it('non-chain blocks that drift far off screen are auto-despawned', () => {
    // Build a base at x=0
    const baseId = 'r0-b0';
    spawnBlock(world, { id: baseId, x: 0, y: -200, widthPx: 140, heightPx: 34, vx: 0, attached: false });
    for (let i = 0; i < 300; i++) stepWorld(world, 10);

    // Add a non-chain block (resting to the left, not touching base)
    const debrisLeftId = 'r1-b0';
    spawnBlock(world, { id: debrisLeftId, x: -800, y: -200, widthPx: 140, heightPx: 34, vx: 0, attached: false });
    for (let i = 0; i < 300; i++) stepWorld(world, 10);

    // Add another non-chain block (resting to the right, not touching base)
    const debrisRightId = 'r2-b0';
    spawnBlock(world, { id: debrisRightId, x: 800, y: -200, widthPx: 140, heightPx: 34, vx: 0, attached: false });
    for (let i = 0; i < 300; i++) stepWorld(world, 10);

    let snap = snapshotWorld(world);
    expect(snap.blocks.length).toBe(3); // base + left + right

    // Move both debris blocks far outside the despawn bounds (±2100)
    const leftBody = world.blocks.get(debrisLeftId)!;
    const rightBody = world.blocks.get(debrisRightId)!;
    Body.setPosition(leftBody, { x: -2500, y: -200 });
    Body.setVelocity(leftBody, { x: 0, y: 0 });
    Body.setAngularVelocity(leftBody, 0);
    Body.setPosition(rightBody, { x: 2500, y: -200 });
    Body.setVelocity(rightBody, { x: 0, y: 0 });
    Body.setAngularVelocity(rightBody, 0);

    // Step to trigger cleanup
    for (let i = 0; i < 100; i++) stepWorld(world, 10);

    snap = snapshotWorld(world);

    // Both debris blocks should be despawned (they're not in any chain, just outside bounds)
    expect(snap.blocks.length).toBe(1);
    expect(snap.blocks[0].id).toBe(baseId);
  });
});
