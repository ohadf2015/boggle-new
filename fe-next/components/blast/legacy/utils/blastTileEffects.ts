/**
 * Blast tile effect handlers — pure functions that modify tile state grids.
 */
import {
  BOMB_RADIUS,
  BOMB_AREA_CLEAR_BONUS,
  CHAIN_BOMB_STAGGER,
  type BlastTileState,
  type BlastExplosion,
} from '../types';

export interface TileEffectContext {
  next: BlastTileState[][];
  gridSize: number;
  now: number;
  bombQueue: Array<{ row: number; col: number; depth: number }>;
  processedBombs: Set<string>;
  markCleared: (t: BlastTileState) => void;
  /**
   * Optional runaway-chain budget. When present, the bomb chain stops once
   * `maxDetonations` or `maxCleared` is reached, so one word can't wipe half the board.
   */
  chainBudget?: { detonations: number; cleared: number; suppressed: number; maxDetonations: number; maxCleared: number };
}

function chainAtDetonationCap(ctx: TileEffectContext): boolean {
  return !!ctx.chainBudget && ctx.chainBudget.detonations >= ctx.chainBudget.maxDetonations;
}

function chainAtClearCap(ctx: TileEffectContext): boolean {
  return !!ctx.chainBudget && ctx.chainBudget.cleared >= ctx.chainBudget.maxCleared;
}

function recordSuppressed(ctx: TileEffectContext): void {
  if (ctx.chainBudget) ctx.chainBudget.suppressed++;
}

export interface EffectResult {
  bonusScore: number;
  explosions: BlastExplosion[];
}

/** Detonate every queued bomb (3x3), chaining into bombs caught in the blast. */
export function processBombBFS(ctx: TileEffectContext): EffectResult {
  const { next, gridSize, bombQueue, processedBombs, now } = ctx;
  let bonusScore = 0;
  const explosions: BlastExplosion[] = [];

  while (bombQueue.length > 0) {
    if (chainAtDetonationCap(ctx) || chainAtClearCap(ctx)) { recordSuppressed(ctx); break; }
    const bomb = bombQueue.shift()!;
    if (ctx.chainBudget) ctx.chainBudget.detonations++;
    const staggeredTime = now + bomb.depth * CHAIN_BOMB_STAGGER;
    explosions.push({
      id: `bomb-${staggeredTime}-${bomb.row}-${bomb.col}`,
      row: bomb.row, col: bomb.col, type: 'bomb', intensity: 3, timestamp: staggeredTime,
    });

    bombRadius: for (let dr = -BOMB_RADIUS; dr <= BOMB_RADIUS; dr++) {
      for (let dc = -BOMB_RADIUS; dc <= BOMB_RADIUS; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = bomb.row + dr;
        const c = bomb.col + dc;
        if (r < 0 || r >= gridSize || c < 0 || c >= gridSize || next[r][c].isCleared) continue;
        // `break bombRadius` exits both loops so the cap records ONE suppression, not one per row.
        if (chainAtClearCap(ctx)) { recordSuppressed(ctx); break bombRadius; }
        ctx.markCleared(next[r][c]);
        if (ctx.chainBudget) ctx.chainBudget.cleared++;
        bonusScore += BOMB_AREA_CLEAR_BONUS;
        if (next[r][c].type === 'bomb' && !processedBombs.has(`${r},${c}`)) {
          processedBombs.add(`${r},${c}`);
          bombQueue.push({ row: r, col: c, depth: bomb.depth + 1 });
        }
      }
    }
  }
  return { bonusScore, explosions };
}

/**
 * Turn `count` random live standard tiles (off the word path) into diamonds.
 * Draws only from `rng` so the MP client predicts the server's placement exactly.
 */
export function spawnEarnedDiamonds(
  next: BlastTileState[][],
  pathSet: ReadonlySet<string>,
  count: number,
  rng: () => number,
): Array<{ row: number; col: number }> {
  const spawned: Array<{ row: number; col: number }> = [];
  if (count <= 0) return spawned;
  const candidates: BlastTileState[] = [];
  for (const row of next) {
    for (const t of row) {
      if (!t.isCleared && t.type === 'standard' && !pathSet.has(`${t.row},${t.col}`)) candidates.push(t);
    }
  }
  for (let i = 0; i < count && candidates.length > 0; i++) {
    const [target] = candidates.splice(Math.floor(rng() * candidates.length), 1);
    target.type = 'diamond';
    target.hitsRemaining = 0;
    target.activationEffect = 'diamond-spawn';
    spawned.push({ row: target.row, col: target.col });
  }
  return spawned;
}
