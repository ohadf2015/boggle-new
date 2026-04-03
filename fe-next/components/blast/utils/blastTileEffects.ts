/**
 * Blast tile effect handlers — pure functions that modify tile state grids.
 * Extracted from useBlastGame.clearTilesForWord to keep the hook under 500 lines.
 */
import {
  BOMB_RADIUS,
  BOMB_AREA_CLEAR_BONUS,
  LIGHTNING_COLUMN_CLEAR_BONUS,
  PRISM_CROSS_BONUS,
  TREASURE_GEM_COMPLETION_BONUS,
  TREASURE_GEM_SPAWN_COUNT,
  VORTEX_PULL_RADIUS,
  VORTEX_EXPLODE_RADIUS,
  VORTEX_PULL_BONUS,
  VORTEX_EXPLODE_BONUS,
  FROST_REVEAL_BONUS,
  CHAIN_BOMB_STAGGER,
  CATALYST_UPGRADE_RADIUS,
  CATALYST_CLEAR_BONUS,
  COUNTDOWN_EXPLOSION_RADIUS,
  COUNTDOWN_EXPLOSION_PENALTY,
  type BlastTileState,
  type BlastTileType,
  type BlastExplosion,
} from '../types';
import { getInitialHitsRemaining } from './blastTileUtils';
import { getWaveConfig, getWaveDistribution } from './blastWaveConfig';

// ── Shared types for effect context ──────────────────────────────────────

export interface TileEffectContext {
  next: BlastTileState[][];
  gridSize: number;
  now: number;
  prev: BlastTileState[][];
  path: Array<{ row: number; col: number }>;
  bombQueue: Array<{ row: number; col: number; depth: number }>;
  processedBombs: Set<string>;
  processedLightning: Set<string>;
  markCleared: (t: BlastTileState) => void;
  isMultiHitAlive: (t: BlastTileState) => boolean;
  hitMultiHitTile: (t: BlastTileState) => void;
}

export interface EffectResult {
  bonusScore: number;
  explosions: BlastExplosion[];
}

// ── Offensive special ranking (shared by Rainbow Boost & Mirror pre-scan) ──

export const OFFENSIVE_RANK: Partial<Record<BlastTileType, number>> = {
  prism: 5,
  lightning: 4,
  bomb: 3,
  gem: 2,
  magnet: 1,
};

/**
 * Pre-scan the path for the best offensive special (Rainbow) or first offensive special (Mirror).
 */
export function scanOffensiveSpecial(
  path: Array<{ row: number; col: number }>,
  tiles: BlastTileState[][],
  mode: 'best' | 'first'
): BlastTileType | null {
  let result: BlastTileType | null = null;
  let bestRank = -1;
  for (const cell of path) {
    const t = tiles[cell.row]?.[cell.col];
    if (!t || t.isCleared) continue;
    // Skip rainbow/mirror themselves
    if (t.type === 'rainbow' || t.type === 'mirror') continue;
    const rank = OFFENSIVE_RANK[t.type] ?? -1;
    if (rank < 0) continue;
    if (mode === 'first') return t.type;
    if (rank > bestRank) {
      bestRank = rank;
      result = t.type;
    }
  }
  return result;
}

/**
 * Re-fire an offensive special's effect from its original position.
 * Used by both Mirror (first special) and Rainbow Boost (best special).
 */
export function reFireOffensiveSpecial(
  specialType: BlastTileType,
  ctx: TileEffectContext,
): number {
  let bonusScore = 0;
  const { prev, path, bombQueue } = ctx;

  switch (specialType) {
    case 'bomb': {
      const bombCell = path.find(c => prev[c.row]?.[c.col]?.type === 'bomb');
      if (bombCell) bombQueue.push({ row: bombCell.row, col: bombCell.col, depth: 0 });
      break;
    }
    case 'lightning': {
      const lCell = path.find(c => prev[c.row]?.[c.col]?.type === 'lightning');
      if (lCell) {
        bonusScore += fireLightningColumn(lCell.row, lCell.col, ctx);
      }
      break;
    }
    case 'prism': {
      const pCell = path.find(c => prev[c.row]?.[c.col]?.type === 'prism');
      if (pCell) {
        bonusScore += firePrismCross(pCell.row, pCell.col, ctx, false);
      }
      break;
    }
    case 'gem': {
      bonusScore += TREASURE_GEM_COMPLETION_BONUS;
      break;
    }
    case 'magnet': {
      const mCell = path.find(c => prev[c.row]?.[c.col]?.type === 'magnet');
      if (mCell) {
        bonusScore += fireMagnetExplode(mCell.row, mCell.col, ctx);
      }
      break;
    }
  }
  return bonusScore;
}

// ── Individual tile effect handlers ──────────────────────────────────────

/** Lightning: clear entire column from position */
export function fireLightningColumn(
  sourceRow: number,
  col: number,
  ctx: TileEffectContext,
): number {
  const { next, gridSize, processedBombs, bombQueue, markCleared, isMultiHitAlive, hitMultiHitTile } = ctx;
  let bonus = 0;
  for (let r = 0; r < gridSize; r++) {
    if (r === sourceRow) continue;
    const target = next[r][col];
    if (target.isCleared) continue;
    if (isMultiHitAlive(target)) {
      hitMultiHitTile(target);
    } else {
      markCleared(target);
      bonus += LIGHTNING_COLUMN_CLEAR_BONUS;
      if (target.type === 'bomb' && !processedBombs.has(`${r},${col}`)) {
        processedBombs.add(`${r},${col}`);
        bombQueue.push({ row: r, col, depth: 0 });
      }
    }
  }
  return bonus;
}

/** Prism: cross-clear entire row + column, with chain reactions */
export function firePrismCross(
  row: number,
  col: number,
  ctx: TileEffectContext,
  chainLightning: boolean = true,
): number {
  const { next, gridSize, processedBombs, processedLightning, bombQueue, markCleared, isMultiHitAlive, hitMultiHitTile } = ctx;
  let bonus = 0;

  const clearLine = (r: number, c: number) => {
    const target = next[r][c];
    if (target.isCleared) return;
    if (isMultiHitAlive(target)) {
      hitMultiHitTile(target);
    } else {
      markCleared(target);
      if (target.type === 'bomb' && !processedBombs.has(`${r},${c}`)) {
        processedBombs.add(`${r},${c}`);
        bombQueue.push({ row: r, col: c, depth: 0 });
      }
      // BUGF-02: prism cross-clear hitting lightning triggers its column-clear
      if (chainLightning && target.type === 'lightning' && !processedLightning.has(`${r},${c}`)) {
        processedLightning.add(`${r},${c}`);
        bonus += fireLightningColumn(r, c, ctx);
      }
    }
  };

  // Cross-clear row
  for (let c2 = 0; c2 < gridSize; c2++) {
    if (c2 === col) continue;
    clearLine(row, c2);
  }
  // Cross-clear column
  for (let r2 = 0; r2 < gridSize; r2++) {
    if (r2 === row) continue;
    clearLine(r2, col);
  }
  return bonus;
}

/** Magnet explode phase: clear tiles within explode radius */
export function fireMagnetExplode(
  row: number,
  col: number,
  ctx: TileEffectContext,
): number {
  const { next, gridSize, processedBombs, bombQueue, markCleared, isMultiHitAlive, hitMultiHitTile } = ctx;
  let bonus = 0;
  for (let dr = -VORTEX_EXPLODE_RADIUS; dr <= VORTEX_EXPLODE_RADIUS; dr++) {
    for (let dc = -VORTEX_EXPLODE_RADIUS; dc <= VORTEX_EXPLODE_RADIUS; dc++) {
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
        bonus += VORTEX_EXPLODE_BONUS;
        if (target.type === 'bomb' && !processedBombs.has(`${r},${c}`)) {
          processedBombs.add(`${r},${c}`);
          bombQueue.push({ row: r, col: c, depth: 0 });
        }
      }
    }
  }
  return bonus;
}

/**
 * Magnet/Vortex pull phase: move tiles toward vortex center.
 * Returns bonus score and letter swap records.
 */
export function fireVortexPull(
  row: number,
  col: number,
  ctx: TileEffectContext,
): { bonusScore: number; letterSwaps: Array<{ fromR: number; fromC: number; toR: number; toC: number }> } {
  const { next, gridSize } = ctx;
  let bonusScore = 0;
  const letterSwaps: Array<{ fromR: number; fromC: number; toR: number; toC: number }> = [];

  for (let pullRadius = VORTEX_PULL_RADIUS; pullRadius >= 1; pullRadius--) {
    for (let dr = -pullRadius; dr <= pullRadius; dr++) {
      for (let dc = -pullRadius; dc <= pullRadius; dc++) {
        if (Math.abs(dr) + Math.abs(dc) !== pullRadius) continue;
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) continue;
        const sourceTile = next[r][c];
        if (sourceTile.isCleared) continue;

        const stepR = dr === 0 ? 0 : (dr > 0 ? -1 : 1);
        const stepC = dc === 0 ? 0 : (dc > 0 ? -1 : 1);
        let moveR = 0, moveC = 0;
        if (Math.abs(dr) >= Math.abs(dc)) { moveR = stepR; } else { moveC = stepC; }

        const targetR = r + moveR;
        const targetC = c + moveC;
        if (targetR < 0 || targetR >= gridSize || targetC < 0 || targetC >= gridSize) continue;
        const targetTile = next[targetR][targetC];

        if (targetTile.isCleared) {
          // Swap tile properties
          const tmp = { type: sourceTile.type, hitsRemaining: sourceTile.hitsRemaining, activationEffect: sourceTile.activationEffect, innerType: sourceTile.innerType };
          sourceTile.type = targetTile.type;
          sourceTile.hitsRemaining = targetTile.hitsRemaining;
          sourceTile.activationEffect = targetTile.activationEffect;
          sourceTile.innerType = targetTile.innerType;
          targetTile.type = tmp.type;
          targetTile.hitsRemaining = tmp.hitsRemaining;
          targetTile.activationEffect = tmp.activationEffect;
          targetTile.innerType = tmp.innerType;
          targetTile.isCleared = false;
          sourceTile.isCleared = true;
          letterSwaps.push({ fromR: r, fromC: c, toR: targetR, toC: targetC });
          bonusScore += VORTEX_PULL_BONUS;
        }
      }
    }
  }
  return { bonusScore, letterSwaps };
}

/** Process bomb BFS chain queue */
export function processBombBFS(
  ctx: TileEffectContext,
): EffectResult {
  const { next, gridSize, bombQueue, processedBombs, markCleared, isMultiHitAlive, hitMultiHitTile, now } = ctx;
  let bonusScore = 0;
  const explosions: BlastExplosion[] = [];

  while (bombQueue.length > 0) {
    const bomb = bombQueue.shift()!;
    const staggeredTime = now + bomb.depth * CHAIN_BOMB_STAGGER;
    explosions.push({
      id: `bomb-${staggeredTime}-${bomb.row}-${bomb.col}`,
      row: bomb.row, col: bomb.col, type: 'bomb', intensity: 3, timestamp: staggeredTime,
    });

    for (let dr = -BOMB_RADIUS; dr <= BOMB_RADIUS; dr++) {
      for (let dc = -BOMB_RADIUS; dc <= BOMB_RADIUS; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = bomb.row + dr;
        const c = bomb.col + dc;
        if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
          if (!next[r][c].isCleared) {
            if (isMultiHitAlive(next[r][c])) {
              hitMultiHitTile(next[r][c]);
            } else {
              markCleared(next[r][c]);
              bonusScore += BOMB_AREA_CLEAR_BONUS;
              if (next[r][c].type === 'bomb' && !processedBombs.has(`${r},${c}`)) {
                processedBombs.add(`${r},${c}`);
                bombQueue.push({ row: r, col: c, depth: bomb.depth + 1 });
              }
            }
          }
        }
      }
    }
  }
  return { bonusScore, explosions };
}

/** Handle Frozen tile final hit — activate inner special */
export function handleFrostFinalHit(
  cell: { row: number; col: number },
  tile: BlastTileState,
  ctx: TileEffectContext,
): { bonusScore: number; rainbowBoost: number } {
  const { processedBombs, processedLightning, bombQueue } = ctx;
  let bonusScore = FROST_REVEAL_BONUS;
  let rainbowBoost = 0;
  tile.activationEffect = 'frost-free';

  if (!tile.innerType) return { bonusScore, rainbowBoost };

  switch (tile.innerType) {
    case 'bomb': {
      if (!processedBombs.has(`${cell.row},${cell.col}`)) {
        processedBombs.add(`${cell.row},${cell.col}`);
        bombQueue.push({ row: cell.row, col: cell.col, depth: 0 });
      }
      break;
    }
    case 'lightning': {
      const key = `${cell.row},${cell.col}`;
      if (!processedLightning.has(key)) {
        processedLightning.add(key);
        bonusScore += fireLightningColumn(cell.row, cell.col, ctx);
      }
      break;
    }
    case 'prism': {
      bonusScore += PRISM_CROSS_BONUS;
      bonusScore += firePrismCross(cell.row, cell.col, ctx, false);
      break;
    }
    case 'gem': {
      // Inner gem: un-clear and convert frost to fresh Treasure Gem
      tile.isCleared = false;
      tile.type = 'gem';
      tile.hitsRemaining = getInitialHitsRemaining('gem');
      tile.innerType = undefined;
      tile.activationEffect = 'frost-gem-reveal';
      // Return special marker — caller must decrement newlyClearedCount and fix clearedTypeCounts
      bonusScore = -1; // Special sentinel for "unclear" operation
      break;
    }
    case 'rainbow': {
      rainbowBoost = 2;
      break;
    }
  }
  return { bonusScore, rainbowBoost };
}

/** Spawn special tiles on gem completion.
 *  Pass a seeded `rng` in multiplayer to keep clients in sync. */
export function spawnGemSpecials(
  gemsCompleted: number,
  currentWave: number,
  next: BlastTileState[][],
  gridSize: number,
  path: Array<{ row: number; col: number }>,
  rollFn: (roll: number, dist: Record<string, number>) => BlastTileType,
  rng: () => number = Math.random,
): void {
  if (gemsCompleted <= 0) return;

  const waveConfig = getWaveConfig(currentWave);
  const waveDist = getWaveDistribution(waveConfig);
  const spawnDist = { ...waveDist };
  delete spawnDist['standard'];
  delete spawnDist['gem'];

  const spawnTotal = Object.values(spawnDist).reduce((a, b) => a + b, 0);
  if (spawnTotal <= 0) return;
  for (const key of Object.keys(spawnDist)) {
    spawnDist[key] /= spawnTotal;
  }

  const pathSet = new Set(path.map(p => `${p.row},${p.col}`));
  const candidates: BlastTileState[] = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const t = next[r][c];
      if (!t.isCleared && t.type === 'standard' && !pathSet.has(`${r},${c}`)) {
        candidates.push(t);
      }
    }
  }

  // Shuffle (use seeded rng for multiplayer determinism)
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const spawnCount = gemsCompleted * TREASURE_GEM_SPAWN_COUNT;
  for (const candidate of candidates.slice(0, spawnCount)) {
    const roll = rng();
    const newType = rollFn(roll, spawnDist);
    candidate.type = newType;
    candidate.hitsRemaining = getInitialHitsRemaining(newType);
    candidate.activationEffect = null;
  }
}

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
  delete upgradeDist['virus'];    // Don't spawn threats from catalyst
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

// ── Virus spread ──────────────────────────────────────────────────────

/** Spread virus tiles to adjacent standard tiles. Called between turns. */
export function spreadVirus(
  tiles: BlastTileState[][],
  gridSize: number,
): Array<{ row: number; col: number }> {
  const newInfections: Array<{ row: number; col: number }> = [];
  const virusTiles: Array<{ row: number; col: number }> = [];

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (tiles[r][c].type === 'virus' && !tiles[r][c].isCleared) {
        virusTiles.push({ row: r, col: c });
      }
    }
  }

  for (const v of virusTiles) {
    const neighbors: Array<{ row: number; col: number }> = [];
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const r = v.row + dr;
      const c = v.col + dc;
      if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
        const t = tiles[r][c];
        if (!t.isCleared && t.type === 'standard') {
          neighbors.push({ row: r, col: c });
        }
      }
    }
    // Infect one random neighbor per virus tile
    if (neighbors.length > 0) {
      const target = neighbors[Math.floor(Math.random() * neighbors.length)];
      tiles[target.row][target.col].type = 'virus';
      tiles[target.row][target.col].activationEffect = 'virus-spread';
      newInfections.push(target);
    }
  }

  return newInfections;
}

// ── Between-turn effects (called after each word submission) ─────────

export interface BetweenTurnResult {
  /** Tiles modified (mutated in place) */
  tiles: BlastTileState[][];
  /** Score penalty from countdown explosions */
  penalty: number;
  /** Countdown tiles that exploded */
  countdownExplosions: Array<{ row: number; col: number }>;
  /** Tiles newly infected by virus */
  virusInfections: Array<{ row: number; col: number }>;
}

/**
 * Apply between-turn effects: countdown tick + virus spread.
 * Mutates tiles in place for performance. Call after word submission, before gravity.
 */
export function applyBetweenTurnEffects(
  tiles: BlastTileState[][],
  gridSize: number,
): BetweenTurnResult {
  let penalty = 0;
  const countdownExplosions: Array<{ row: number; col: number }> = [];

  // 1. Tick down all uncleared countdown tiles
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const tile = tiles[r][c];
      if (tile.type === 'countdown' && !tile.isCleared && tile.countdown != null && tile.countdown > 0) {
        tile.countdown -= 1;
      }
    }
  }

  // 2. Explode any countdown tiles that reached 0
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const tile = tiles[r][c];
      if (tile.type === 'countdown' && !tile.isCleared && tile.countdown != null && tile.countdown <= 0) {
        // Mark countdown tile as cleared
        tile.isCleared = true;
        countdownExplosions.push({ row: r, col: c });
        penalty += COUNTDOWN_EXPLOSION_PENALTY;

        // Clear adjacent tiles in explosion radius
        for (let dr = -COUNTDOWN_EXPLOSION_RADIUS; dr <= COUNTDOWN_EXPLOSION_RADIUS; dr++) {
          for (let dc = -COUNTDOWN_EXPLOSION_RADIUS; dc <= COUNTDOWN_EXPLOSION_RADIUS; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) continue;
            const target = tiles[nr][nc];
            if (target.isCleared) continue;
            if (target.hitsRemaining > 0) {
              target.hitsRemaining -= 1;
            } else {
              target.isCleared = true;
            }
          }
        }
      }
    }
  }

  // 3. Spread virus
  const virusInfections = spreadVirus(tiles, gridSize);

  return { tiles, penalty, countdownExplosions, virusInfections };
}
