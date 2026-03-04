import type { BlastTileState } from '../types';
import type { BlastExplosion } from '../types';
import type { SpecialCombo } from './blastCombos';
import {
  BOMB_RADIUS,
  VORTEX_PULL_RADIUS,
  VORTEX_EXPLODE_RADIUS,
  VORTEX_PULL_BONUS,
  VORTEX_EXPLODE_BONUS,
  TREASURE_GEM_COMPLETION_BONUS,
  RAINBOW_BOOST_MULTIPLIER,
  FROST_REVEAL_BONUS,
} from '../types';

// ==================== Types ====================

export interface ComboEffectContext {
  /** The combo to execute */
  combo: SpecialCombo;
  /** Current tile state grid (mutated in place) */
  next: BlastTileState[][];
  /** Grid dimension (rows and cols) */
  gridSize: number;
  /** Full word path */
  path: Array<{ row: number; col: number }>;
  /** Current timestamp for explosion IDs */
  now: number;
  /** Mark a tile as cleared (mutates grid) */
  markCleared: (tile: BlastTileState) => void;
  /** Returns true if tile is multi-hit and NOT on its final hit */
  isMultiHitAlive: (tile: BlastTileState) => boolean;
  /** Decrement multi-hit tile's hit counter (mutates grid) */
  hitMultiHitTile: (tile: BlastTileState) => void;
}

export interface ComboEffectResult {
  /** Explosion events to emit */
  explosions: BlastExplosion[];
  /** Bomb tile keys (`row,col`) consumed by this combo (prevents double-BFS) */
  processedBombKeys: string[];
  /** Lightning tile keys consumed by this combo */
  processedLightningKeys: string[];
  /** Additional bonus score from this combo effect */
  bonusScore: number;
}

// ==================== Helpers ====================

function emptyResult(): ComboEffectResult {
  return {
    explosions: [],
    processedBombKeys: [],
    processedLightningKeys: [],
    bonusScore: 0,
  };
}

function applyToTile(
  tile: BlastTileState,
  ctx: ComboEffectContext,
): void {
  if (tile.isCleared) return;
  if (ctx.isMultiHitAlive(tile)) {
    ctx.hitMultiHitTile(tile);
  } else {
    ctx.markCleared(tile);
  }
}

/** Fire row+column cross-clear centered at (centerRow, centerCol) */
function fireCrossClear(
  centerRow: number,
  centerCol: number,
  ctx: ComboEffectContext,
): void {
  const { next, gridSize } = ctx;
  for (let c = 0; c < gridSize; c++) applyToTile(next[centerRow][c], ctx);
  for (let r = 0; r < gridSize; r++) applyToTile(next[r][centerCol], ctx);
}

/** Execute vortex pull+explode centered at (centerRow, centerCol) with given pull radius */
function fireVortex(
  centerRow: number,
  centerCol: number,
  pullRadius: number,
  result: ComboEffectResult,
  ctx: ComboEffectContext,
): void {
  const { next, gridSize } = ctx;
  // Phase 1: Pull — outermost ring inward (axis-preference movement)
  for (let pr = pullRadius; pr >= 1; pr--) {
    for (let dr = -pr; dr <= pr; dr++) {
      for (let dc = -pr; dc <= pr; dc++) {
        if (Math.abs(dr) + Math.abs(dc) !== pr) continue;
        const r = centerRow + dr;
        const c = centerCol + dc;
        if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) continue;
        const sourceTile = next[r][c];
        if (sourceTile.isCleared) continue;
        const stepR = dr === 0 ? 0 : (dr > 0 ? -1 : 1);
        const stepC = dc === 0 ? 0 : (dc > 0 ? -1 : 1);
        let moveR = 0, moveC = 0;
        if (Math.abs(dr) >= Math.abs(dc)) {
          moveR = stepR;
        } else {
          moveC = stepC;
        }
        const targetR = r + moveR;
        const targetC = c + moveC;
        if (targetR < 0 || targetR >= gridSize || targetC < 0 || targetC >= gridSize) continue;
        const targetTile = next[targetR][targetC];
        if (targetTile.isCleared) {
          const tmpType = sourceTile.type;
          const tmpHits = sourceTile.hitsRemaining;
          const tmpEffect = sourceTile.activationEffect;
          const tmpInner = sourceTile.innerType;
          sourceTile.type = targetTile.type;
          sourceTile.hitsRemaining = targetTile.hitsRemaining;
          sourceTile.activationEffect = targetTile.activationEffect;
          sourceTile.innerType = targetTile.innerType;
          targetTile.type = tmpType;
          targetTile.hitsRemaining = tmpHits;
          targetTile.activationEffect = tmpEffect;
          targetTile.innerType = tmpInner;
          targetTile.isCleared = false;
          sourceTile.isCleared = true;
          result.bonusScore += VORTEX_PULL_BONUS;
        }
      }
    }
  }
  // Phase 2: Explode — clear tiles within radius 1 of vortex position
  for (let dr = -VORTEX_EXPLODE_RADIUS; dr <= VORTEX_EXPLODE_RADIUS; dr++) {
    for (let dc = -VORTEX_EXPLODE_RADIUS; dc <= VORTEX_EXPLODE_RADIUS; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = centerRow + dr;
      const c = centerCol + dc;
      if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) continue;
      const etarget = next[r][c];
      if (etarget.isCleared) continue;
      applyToTile(etarget, ctx);
      result.bonusScore += VORTEX_EXPLODE_BONUS;
    }
  }
}

// ==================== executeComboEffect ====================

/**
 * Execute a single detected combo, mutating grid state and returning
 * explosion events + metadata for the caller to accumulate.
 *
 * Unknown combo types (new pairs not yet implemented) return an empty result
 * so useBlastGame.ts doesn't crash when new pairs are detected.
 */
export function executeComboEffect(ctx: ComboEffectContext): ComboEffectResult {
  const { combo, next, gridSize, path, now } = ctx;
  const result = emptyResult();

  switch (combo.type) {
    case 'bomb_bomb': {
      const midRow = Math.round((combo.tiles[0].row + combo.tiles[1].row) / 2);
      const midCol = Math.round((combo.tiles[0].col + combo.tiles[1].col) / 2);
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const r = midRow + dr;
          const c = midCol + dc;
          if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
            applyToTile(next[r][c], ctx);
          }
        }
      }
      result.explosions.push({
        id: `combo-bb-${now}`,
        row: midRow,
        col: midCol,
        type: 'mega_blast',
        intensity: 4,
        timestamp: now,
      });
      result.processedBombKeys.push(
        `${combo.tiles[0].row},${combo.tiles[0].col}`,
        `${combo.tiles[1].row},${combo.tiles[1].col}`,
      );
      break;
    }

    case 'bomb_lightning': {
      const bt = combo.tiles.find(t => t.tileType === 'bomb')!;
      for (let dc = -BOMB_RADIUS; dc <= BOMB_RADIUS; dc++) {
        const col = bt.col + dc;
        if (col < 0 || col >= gridSize) continue;
        for (let r = 0; r < gridSize; r++) {
          applyToTile(next[r][col], ctx);
        }
      }
      result.explosions.push({
        id: `combo-bl-${now}`,
        row: bt.row,
        col: bt.col,
        type: 'combo',
        intensity: 4,
        timestamp: now,
      });
      result.processedBombKeys.push(`${bt.row},${bt.col}`);
      break;
    }

    case 'bomb_prism': {
      const bt = combo.tiles.find(t => t.tileType === 'bomb')!;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const cR = bt.row + dr;
          const cC = bt.col + dc;
          if (cR < 0 || cR >= gridSize || cC < 0 || cC >= gridSize) continue;
          for (let r = 0; r < gridSize; r++) applyToTile(next[r][cC], ctx);
          for (let c = 0; c < gridSize; c++) applyToTile(next[cR][c], ctx);
        }
      }
      result.explosions.push({
        id: `combo-bp-${now}`,
        row: bt.row,
        col: bt.col,
        type: 'combo',
        intensity: 4,
        timestamp: now,
      });
      result.processedBombKeys.push(`${bt.row},${bt.col}`);
      break;
    }

    case 'lightning_lightning': {
      const cols = new Set(path.map(p => p.col));
      for (const col of cols) {
        for (let r = 0; r < gridSize; r++) {
          applyToTile(next[r][col], ctx);
        }
      }
      result.explosions.push({
        id: `combo-ll-${now}`,
        row: combo.tiles[0].row,
        col: combo.tiles[0].col,
        type: 'combo',
        intensity: 4,
        timestamp: now,
      });
      break;
    }

    case 'lightning_prism': {
      for (const tile of combo.tiles) {
        for (let d = -1; d <= 1; d++) {
          const row = tile.row + d;
          const col = tile.col + d;
          if (row >= 0 && row < gridSize) {
            for (let c = 0; c < gridSize; c++) applyToTile(next[row][c], ctx);
          }
          if (col >= 0 && col < gridSize) {
            for (let r = 0; r < gridSize; r++) applyToTile(next[r][col], ctx);
          }
        }
      }
      result.explosions.push({
        id: `combo-lp-${now}`,
        row: combo.tiles[0].row,
        col: combo.tiles[0].col,
        type: 'combo',
        intensity: 4,
        timestamp: now,
      });
      break;
    }

    case 'prism_prism': {
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (!next[r][c].isCleared) ctx.markCleared(next[r][c]);
        }
      }
      result.explosions.push({
        id: `combo-pp-${now}`,
        row: 3,
        col: 3,
        type: 'total_destruction',
        intensity: 4,
        timestamp: now,
      });
      break;
    }

    // ── 48-03: Prism cross-type combos ──────────────────────────────────────

    case 'prism_magnet': {
      // Vortex Lattice: pull toward magnet position + cross-clear from magnet
      const mt = combo.tiles.find(t => t.tileType === 'magnet') ?? combo.tiles[1];
      if (!mt) break;
      fireVortex(mt.row, mt.col, VORTEX_PULL_RADIUS, result, ctx);
      fireCrossClear(mt.row, mt.col, ctx);
      result.explosions.push({
        id: `combo-pm-${now}`,
        row: mt.row,
        col: mt.col,
        type: 'combo',
        intensity: 4,
        timestamp: now,
      });
      break;
    }

    case 'prism_gem': {
      // Crystal Lattice: complete gem + cross-clear from prism
      const pt = combo.tiles.find(t => t.tileType === 'prism') ?? combo.tiles[0];
      const gt = combo.tiles.find(t => t.tileType === 'gem') ?? combo.tiles[1];
      if (!pt) break;
      if (gt) {
        const gemTile = next[gt.row]?.[gt.col];
        if (gemTile) {
          gemTile.hitsRemaining = 0;
          ctx.markCleared(gemTile);
          result.bonusScore += TREASURE_GEM_COMPLETION_BONUS;
        }
      }
      fireCrossClear(pt.row, pt.col, ctx);
      result.explosions.push({
        id: `combo-pg-${now}`,
        row: pt.row,
        col: pt.col,
        type: 'combo',
        intensity: 4,
        timestamp: now,
      });
      break;
    }

    case 'prism_frozen': {
      // Frost Lattice: free ALL frost tiles on board + cross-clear from prism
      const pft = combo.tiles.find(t => t.tileType === 'prism') ?? combo.tiles[0];
      if (!pft) break;
      const { next: grid, gridSize } = ctx;
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const tile = grid[r][c];
          if (tile.type === 'frozen' && !tile.isCleared) {
            tile.hitsRemaining = 0;
            ctx.markCleared(tile);
          }
        }
      }
      fireCrossClear(pft.row, pft.col, ctx);
      result.explosions.push({
        id: `combo-pf-${now}`,
        row: pft.row,
        col: pft.col,
        type: 'combo',
        intensity: 4,
        timestamp: now,
      });
      break;
    }

    // ── 48-03: Rainbow cross-type combos ──────────────────────────────────

    case 'rainbow_mirror': {
      // Kaleidoscope: score-only — mirror triples rainbow's amplification → +3 * baseScore
      // baseScore defaults to 1 (caller multiplies by word score)
      const baseScore = 1;
      result.bonusScore += baseScore * 3;
      const rbt = combo.tiles.find(t => t.tileType === 'rainbow') ?? combo.tiles[0];
      result.explosions.push({
        id: `combo-rm-${now}`,
        row: rbt.row,
        col: rbt.col,
        type: 'combo',
        intensity: 4,
        timestamp: now,
      });
      break;
    }

    case 'rainbow_magnet': {
      // Whirlwind: enhanced vortex pull (radius +1) + explode
      const rmt = combo.tiles.find(t => t.tileType === 'magnet') ?? combo.tiles[1];
      if (!rmt) break;
      const boostedRadius = VORTEX_PULL_RADIUS + 1;
      fireVortex(rmt.row, rmt.col, boostedRadius, result, ctx);
      result.explosions.push({
        id: `combo-rma-${now}`,
        row: rmt.row,
        col: rmt.col,
        type: 'combo',
        intensity: 4,
        timestamp: now,
      });
      break;
    }

    case 'rainbow_gem': {
      // Lucky Boost: bonus score for boosted gem completion (gem NOT auto-completed)
      result.bonusScore += RAINBOW_BOOST_MULTIPLIER * TREASURE_GEM_COMPLETION_BONUS;
      const rgt = combo.tiles.find(t => t.tileType === 'rainbow') ?? combo.tiles[0];
      result.explosions.push({
        id: `combo-rg-${now}`,
        row: rgt.row,
        col: rgt.col,
        type: 'combo',
        intensity: 4,
        timestamp: now,
      });
      break;
    }

    case 'rainbow_frozen': {
      // Frost Bloom: advance ALL frost tiles by 1 hit (mass reveal)
      const { next: rFGrid, gridSize: rFSize } = ctx;
      for (let r = 0; r < rFSize; r++) {
        for (let c = 0; c < rFSize; c++) {
          const tile = rFGrid[r][c];
          if (tile.type === 'frozen' && !tile.isCleared) {
            ctx.hitMultiHitTile(tile);
            // If tile is now at 0 hits, mark cleared
            if (tile.hitsRemaining <= 0) {
              ctx.markCleared(tile);
            }
          }
        }
      }
      const rfbt = combo.tiles.find(t => t.tileType === 'rainbow') ?? combo.tiles[0];
      result.explosions.push({
        id: `combo-rfz-${now}`,
        row: rfbt.row,
        col: rfbt.col,
        type: 'combo',
        intensity: 4,
        timestamp: now,
      });
      break;
    }

    default:
      // Unknown combo types — no-op skeleton, returns empty result
      break;
  }

  return result;
}
