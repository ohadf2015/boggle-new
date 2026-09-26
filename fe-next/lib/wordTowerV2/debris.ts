/**
 * Cleanup of debris blocks that fell outside the playfield.
 * Imported by engine.ts but kept separate to manage line count.
 */
import type { TowerWorld } from './engine';
import { Composite } from 'matter-js';
import { standingChain } from './stability';

const GROUND_WIDTH_PX = 4000;
const GROUND_THICKNESS_PX = 120;
const DESPAWN_MARGIN_PX = 100;

/**
 * Internal: remove a block's body from the world without affecting collapse state.
 * Used by cleanupDebris and despawnBlock to avoid duplication.
 * Does NOT reset peakHeightPx, collapseHeldMs, or runPeakPx.
 */
export function removeBlockBody(world: TowerWorld, id: string): boolean {
  const body = world.blocks.get(id);
  if (!body) return false;

  Composite.remove(world.engine.world, body);
  world.blocks.delete(id);
  world.bodyToId.delete(body.id);
  world.landed.delete(id);
  world.restMs.delete(id);
  world.pendingImpacts = world.pendingImpacts.filter((impact) => impact.id !== id);

  return true;
}

/**
 * Despawn blocks that fell outside the playfield and are not part of the standing chain.
 * Prevents debris from accumulating off-screen indefinitely.
 * Does NOT modify collapse tracking (peakHeightPx, collapseHeldMs).
 */
export function cleanupDebris(world: TowerWorld, chainIds: Set<string>): void {
  const bounds = { left: -world.despawnHalfWidthPx - DESPAWN_MARGIN_PX, right: world.despawnHalfWidthPx + DESPAWN_MARGIN_PX };
  const groundY = GROUND_THICKNESS_PX + DESPAWN_MARGIN_PX;

  for (const [id, body] of world.blocks) {
    // Never despawn chain blocks or hanging blocks (static, not landed)
    if (chainIds.has(id) || (body.isStatic && !world.landed.has(id))) continue;

    const outsideH = body.bounds.max.x < bounds.left || body.bounds.min.x > bounds.right;
    const belowG = body.bounds.min.y > groundY;

    if (outsideH || belowG) removeBlockBody(world, id);
  }
}
