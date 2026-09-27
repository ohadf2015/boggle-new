/**
 * Between-turn blast effects: catalyst upgrade, countdown explosion,
 * and the applyBetweenTurnEffects orchestrator.
 * Extracted from blastTileEffects.ts to keep files under 500 lines.
 */
import {
  CATALYST_UPGRADE_RADIUS,
  CATALYST_CLEAR_BONUS,
  COUNTDOWN_EXPLOSION_RADIUS,
  COUNTDOWN_EXPLOSION_PENALTY,
  CRYSTAL_START_MULTIPLIER,
  CRYSTAL_MAX_MULTIPLIER,
  FUSE_EXPLOSION_RADIUS,
  FUSE_EXPLOSION_PENALTY,
  type BlastTileState,
  type BlastTileType,
  type BlastExplosion,
} from '../types';
import { getInitialHitsRemaining } from './blastTileUtils';
import { getWaveConfig, getWaveDistribution } from './blastWaveConfig';
import { processBombBFS, type TileEffectContext } from './blastTileEffects';

// ── Catalyst effect ──────────────────────────────────────────────────

/** Upgrade adjacent standard tiles to random specials when catalyst is cleared */
export function fireCatalystUpgrade(
  row: number,
  col: number,
  ctx: TileEffectContext,
  currentWave: number,
  rollFn: (roll: number, dist: Record<string, number>) => BlastTileType,
  rng: () => number = Math.random,
): number {
  const { next, gridSize } = ctx;
  let upgradedCount = 0;

  const waveConfig = getWaveConfig(currentWave);
  const waveDist = getWaveDistribution(waveConfig);
  // Remove non-upgradeable types from distribution
  const upgradeDist = { ...waveDist };
  delete upgradeDist['standard'];
  delete upgradeDist['catalyst']; // Don't spawn more catalysts
  // Don't spawn threats from catalyst
  delete upgradeDist['countdown'];
  const total = Object.values(upgradeDist).reduce((a, b) => a + b, 0);
  if (total <= 0) return CATALYST_CLEAR_BONUS;
  for (const k of Object.keys(upgradeDist)) upgradeDist[k] /= total;

  for (let dr = -CATALYST_UPGRADE_RADIUS; dr <= CATALYST_UPGRADE_RADIUS; dr++) {
    for (let dc = -CATALYST_UPGRADE_RADIUS; dc <= CATALYST_UPGRADE_RADIUS; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) continue;
      const tile = next[r][c];
      if (tile.isCleared || tile.type !== 'standard') continue;
      const newType = rollFn(rng(), upgradeDist);
      tile.type = newType;
      tile.hitsRemaining = getInitialHitsRemaining(newType);
      tile.activationEffect = 'catalyst-upgrade';
      upgradedCount++;
    }
  }
  return CATALYST_CLEAR_BONUS + upgradedCount;
}

// ── Countdown explosion ──────────────────────────────────────────────

/** Explode a countdown tile that reached 0 — damages adjacent tiles, penalty score */
export function fireCountdownExplosion(
  row: number,
  col: number,
  ctx: TileEffectContext,
): { penalty: number; explosions: BlastExplosion[] } {
  const { next, gridSize, now, processedBombs, bombQueue, markCleared, isMultiHitAlive, hitMultiHitTile } = ctx;
  const explosions: BlastExplosion[] = [];

  explosions.push({
    id: `countdown-explode-${now}-${row}-${col}`,
    row, col, type: 'bomb', intensity: 4, timestamp: now,
  });

  // Clear tiles in explosion radius (same as bomb)
  for (let dr = -COUNTDOWN_EXPLOSION_RADIUS; dr <= COUNTDOWN_EXPLOSION_RADIUS; dr++) {
    for (let dc = -COUNTDOWN_EXPLOSION_RADIUS; dc <= COUNTDOWN_EXPLOSION_RADIUS; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) continue;
      const target = next[r][c];
      if (target.isCleared) continue;
      if (isMultiHitAlive(target)) {
        hitMultiHitTile(target);
      } else {
        markCleared(target);
        if (target.type === 'bomb' && !processedBombs.has(`${r},${c}`)) {
          processedBombs.add(`${r},${c}`);
          bombQueue.push({ row: r, col: c, depth: 0 });
        }
      }
    }
  }

  // Mark the countdown tile itself as cleared
  const tile = next[row][col];
  if (!tile.isCleared) markCleared(tile);

  return { penalty: COUNTDOWN_EXPLOSION_PENALTY, explosions };
}

// ── Between-turn effects (called after each word submission) ─────────

export interface BetweenTurnResult {
  /** Tiles modified (mutated in place) */
  tiles: BlastTileState[][];
  /** Score penalty from countdown + fuse explosions */
  penalty: number;
  /** Countdown tiles that exploded */
  countdownExplosions: Array<{ row: number; col: number }>;
  /** Fuse tiles that detonated (timer reached 0) */
  fuseExplosions: Array<{ row: number; col: number }>;
}

/** Fuse detonation — 3x3 bomb-style blast, penalty, inline (no shared helper yet) */
function fireFuseDetonation(
  row: number,
  col: number,
  ctx: TileEffectContext,
): { penalty: number } {
  const { next, gridSize, markCleared, isMultiHitAlive, hitMultiHitTile, processedBombs, bombQueue } = ctx;
  for (let dr = -FUSE_EXPLOSION_RADIUS; dr <= FUSE_EXPLOSION_RADIUS; dr++) {
    for (let dc = -FUSE_EXPLOSION_RADIUS; dc <= FUSE_EXPLOSION_RADIUS; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) continue;
      const target = next[r][c];
      if (target.isCleared) continue;
      if (isMultiHitAlive(target)) {
        hitMultiHitTile(target);
      } else {
        markCleared(target);
        if (target.type === 'bomb' && !processedBombs.has(`${r},${c}`)) {
          processedBombs.add(`${r},${c}`);
          bombQueue.push({ row: r, col: c, depth: 0 });
        }
      }
    }
  }
  const tile = next[row][col];
  if (!tile.isCleared) markCleared(tile);
  return { penalty: FUSE_EXPLOSION_PENALTY };
}

/**
 * Apply between-turn effects: countdown tick.
 * Mutates tiles in place for performance. Call after word submission, before gravity.
 */
export function applyBetweenTurnEffects(
  tiles: BlastTileState[][],
  gridSize: number,
): BetweenTurnResult {
  let penalty = 0;
  const countdownExplosions: Array<{ row: number; col: number }> = [];
  const fuseExplosions: Array<{ row: number; col: number }> = [];

  // 1. Tick down all uncleared countdown tiles
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const tile = tiles[r][c];
      if (tile.type === 'countdown' && !tile.isCleared && tile.countdown != null && tile.countdown > 0) {
        tile.countdown -= 1;
      }
    }
  }

  // 1a. Tick down lit fuses (unlit fuses have fuseTimer === undefined and are skipped)
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const tile = tiles[r][c];
      if (tile.type === 'fuse' && !tile.isCleared && typeof tile.fuseTimer === 'number' && tile.fuseTimer > 0) {
        tile.fuseTimer -= 1;
      }
    }
  }

  // 1b. Grow unused crystal tiles (capped at CRYSTAL_MAX_MULTIPLIER).
  // Crystals that sat on the board this turn gain +1 to their word multiplier,
  // rewarding patient players who plan to use them later.
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const tile = tiles[r][c];
      if (tile.type === 'crystal' && !tile.isCleared) {
        const current = tile.crystalMultiplier ?? CRYSTAL_START_MULTIPLIER;
        tile.crystalMultiplier = Math.min(current + 1, CRYSTAL_MAX_MULTIPLIER);
      }
    }
  }

  // 2. Explode any countdown tiles that reached 0
  // Use the dedicated fireCountdownExplosion which properly chain-reacts bombs
  // and handles multi-hit tiles (avoids zombie tiles at hitsRemaining=0)
  const processedBombs = new Set<string>();
  const bombQueue: Array<{ row: number; col: number; depth: number }> = [];
  const markCleared = (t: BlastTileState) => { t.isCleared = true; };
  const isMultiHitAlive = (t: BlastTileState) =>
    t.hitsRemaining > 1 && (t.type === 'ice' || t.type === 'prism' || t.type === 'frozen' || t.type === 'gem');
  const hitMultiHitTile = (t: BlastTileState) => { t.hitsRemaining--; };
  const processedLightning = new Set<string>();

  const betweenCtx: TileEffectContext = {
    next: tiles, gridSize, now: Date.now(), prev: tiles, path: [],
    bombQueue, processedBombs, processedLightning,
    markCleared, isMultiHitAlive, hitMultiHitTile,
  };

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const tile = tiles[r][c];
      if (tile.type === 'countdown' && !tile.isCleared && tile.countdown != null && tile.countdown <= 0) {
        const result = fireCountdownExplosion(r, c, betweenCtx);
        countdownExplosions.push({ row: r, col: c });
        penalty += result.penalty;
      }
    }
  }

  // 3. Detonate any lit fuses whose timer reached 0 (player failed to defuse)
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const tile = tiles[r][c];
      if (
        tile.type === 'fuse' &&
        !tile.isCleared &&
        typeof tile.fuseTimer === 'number' &&
        tile.fuseTimer <= 0
      ) {
        const result = fireFuseDetonation(r, c, betweenCtx);
        fuseExplosions.push({ row: r, col: c });
        penalty += result.penalty;
      }
    }
  }

  // Process any bombs chain-reacted by countdown / fuse explosions
  if (bombQueue.length > 0) {
    processBombBFS(betweenCtx);
  }

  return { tiles, penalty, countdownExplosions, fuseExplosions };
}
