import {
  type BlastTileState,
  type BlastExplosion,
  BOMB_RADIUS,
  VORTEX_PULL_RADIUS,
  VORTEX_EXPLODE_RADIUS,
  VORTEX_PULL_BONUS,
  VORTEX_EXPLODE_BONUS,
  TREASURE_GEM_COMPLETION_BONUS,
} from '../types';
import type { SpecialCombo } from './blastCombos';
import { executeTacticalCombo } from './blastComboEffectsTactical';
import { scaledRadius } from './blastComboScaling';

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
  /**
   * Word-length scaling factor (1.0 | 1.5 | 2.0).
   * Apply to area/radius parameters ONLY — NOT to score multipliers.
   * Use getWordLengthScaleFactor(path.length) from blastComboScaling.
   */
  wordLengthScale: number;
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
  /** Optional: number of specials to spawn after this combo (e.g. mirror_gem doubles output) */
  spawnCount?: number;
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

export function applyToTile(
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

/** Fire row+column cross-clear centered at (row, col) */
export function fireCrossClear(row: number, col: number, ctx: ComboEffectContext): void {
  const { next, gridSize } = ctx;
  for (let c = 0; c < gridSize; c++) applyToTile(next[row][c], ctx);
  for (let r = 0; r < gridSize; r++) applyToTile(next[r][col], ctx);
}

/** Clear tiles in a square radius area centered at (row, col) */
export function fireAreaBlast(row: number, col: number, radius: number, ctx: ComboEffectContext): void {
  const { next, gridSize } = ctx;
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) applyToTile(next[r][c], ctx);
    }
  }
}

/**
 * Execute vortex pull+explode centered at (centerRow, centerCol) with given pull radius.
 * The explode radius is derived from VORTEX_EXPLODE_RADIUS scaled by ctx.wordLengthScale.
 */
export function fireVortex(
  centerRow: number,
  centerCol: number,
  pullRadius: number,
  result: ComboEffectResult,
  ctx: ComboEffectContext,
): void {
  const { next, gridSize, wordLengthScale } = ctx;
  const explodeRadius = scaledRadius(VORTEX_EXPLODE_RADIUS, wordLengthScale);
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
  // Phase 2: Explode — clear tiles within scaled explode radius of vortex position
  for (let dr = -explodeRadius; dr <= explodeRadius; dr++) {
    for (let dc = -explodeRadius; dc <= explodeRadius; dc++) {
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

/** Push a combo explosion at the given position */
export function pushExplosion(id: string, row: number, col: number, result: ComboEffectResult, now: number, type: BlastExplosion['type'] = 'combo'): void {
  result.explosions.push({ id, row, col, type, intensity: 4, timestamp: now });
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
  const { combo, next, gridSize, path, now, wordLengthScale } = ctx;
  const result = emptyResult();

  switch (combo.type) {
    case 'bomb_bomb': {
      const midRow = Math.round((combo.tiles[0].row + combo.tiles[1].row) / 2);
      const midCol = Math.round((combo.tiles[0].col + combo.tiles[1].col) / 2);
      fireAreaBlast(midRow, midCol, 2, ctx);
      pushExplosion(`combo-bb-${now}`, midRow, midCol, result, now, 'mega_blast');
      result.processedBombKeys.push(
        `${combo.tiles[0].row},${combo.tiles[0].col}`,
        `${combo.tiles[1].row},${combo.tiles[1].col}`,
      );
      break;
    }

    case 'bomb_lightning': {
      const bt = combo.tiles.find(t => t.tileType === 'bomb')!;
      const blRadius = scaledRadius(BOMB_RADIUS, wordLengthScale);
      for (let dc = -blRadius; dc <= blRadius; dc++) {
        const col = bt.col + dc;
        if (col < 0 || col >= gridSize) continue;
        for (let r = 0; r < gridSize; r++) {
          applyToTile(next[r][col], ctx);
        }
      }
      pushExplosion(`combo-bl-${now}`, bt.row, bt.col, result, now);
      result.processedBombKeys.push(`${bt.row},${bt.col}`);
      break;
    }

    case 'bomb_prism': {
      // Cross-clear from bomb center + area blast (not 9 separate cross-clears)
      const bt = combo.tiles.find(t => t.tileType === 'bomb')!;
      fireCrossClear(bt.row, bt.col, ctx);
      fireAreaBlast(bt.row, bt.col, scaledRadius(BOMB_RADIUS, wordLengthScale), ctx);
      pushExplosion(`combo-bp-${now}`, bt.row, bt.col, result, now);
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
      pushExplosion(`combo-ll-${now}`, combo.tiles[0].row, combo.tiles[0].col, result, now);
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
      pushExplosion(`combo-lp-${now}`, combo.tiles[0].row, combo.tiles[0].col, result, now);
      break;
    }

    case 'prism_prism': {
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (!next[r][c].isCleared) ctx.markCleared(next[r][c]);
        }
      }
      pushExplosion(`combo-pp-${now}`, 3, 3, result, now, 'total_destruction');
      break;
    }


    // ── 48-02: Bomb cross-type combos ───────────────────────────────────────

    case 'bomb_rainbow': {
      // Prism Bomb: cross-clear (row+col) from bomb + scaled area around bomb
      const bt = combo.tiles.find(t => t.tileType === 'bomb')!;
      fireCrossClear(bt.row, bt.col, ctx);
      fireAreaBlast(bt.row, bt.col, scaledRadius(BOMB_RADIUS, wordLengthScale), ctx);
      pushExplosion(`combo-br-${now}`, bt.row, bt.col, result, now);
      result.processedBombKeys.push(`${bt.row},${bt.col}`);
      break;
    }

    case 'bomb_magnet': {
      // Gravity Bomb: vortex pull toward magnet then scaled blast around magnet
      const mg = combo.tiles.find(t => t.tileType === 'magnet') ?? combo.tiles[1];
      if (!mg) break;
      fireVortex(mg.row, mg.col, scaledRadius(VORTEX_PULL_RADIUS, wordLengthScale), result, ctx);
      // 5x5 blast (radius 2) scaled by word length
      fireAreaBlast(mg.row, mg.col, scaledRadius(2, wordLengthScale), ctx);
      pushExplosion(`combo-bmg-${now}`, mg.row, mg.col, result, now);
      const bt2 = combo.tiles.find(t => t.tileType === 'bomb')!;
      result.processedBombKeys.push(`${bt2.row},${bt2.col}`);
      break;
    }

    case 'bomb_gem': {
      // Gem Burst: instantly complete gem + bomb 3x3 blast
      const bt3 = combo.tiles.find(t => t.tileType === 'bomb') ?? combo.tiles[0];
      if (!bt3) break;
      const gt = combo.tiles.find(t => t.tileType === 'gem');
      if (gt) {
        const gemTile = next[gt.row]?.[gt.col];
        if (gemTile) {
          gemTile.hitsRemaining = 0;
          ctx.markCleared(gemTile);
          result.bonusScore += TREASURE_GEM_COMPLETION_BONUS;
        }
      }
      fireAreaBlast(bt3.row, bt3.col, scaledRadius(BOMB_RADIUS, wordLengthScale), ctx);
      pushExplosion(`combo-bg-${now}`, bt3.row, bt3.col, result, now);
      result.processedBombKeys.push(`${bt3.row},${bt3.col}`);
      break;
    }

    case 'bomb_frozen': {
      // Cryo Blast: crack all frost tiles on board + bomb 3x3 blast
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const tile = next[r][c];
          if (tile.type === 'frozen' && !tile.isCleared) {
            applyToTile(tile, ctx);
          }
        }
      }
      const bt4 = combo.tiles.find(t => t.tileType === 'bomb') ?? combo.tiles[0];
      if (!bt4) break;
      fireAreaBlast(bt4.row, bt4.col, scaledRadius(BOMB_RADIUS, wordLengthScale), ctx);
      pushExplosion(`combo-bfz-${now}`, bt4.row, bt4.col, result, now);
      result.processedBombKeys.push(`${bt4.row},${bt4.col}`);
      break;
    }

    // ── 48-02: Lightning cross-type combos ───────────────────────────────────

    case 'lightning_rainbow': {
      // Rainbow Strike: clear column for each rainbow tile on board + lightning column
      const lt = combo.tiles.find(t => t.tileType === 'lightning') ?? combo.tiles[0];
      if (!lt) break;
      const clearedCols = new Set<number>();
      clearedCols.add(lt.col);
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (next[r][c].type === 'rainbow' && !next[r][c].isCleared) {
            clearedCols.add(c);
          }
        }
      }
      for (const col of clearedCols) {
        for (let r = 0; r < gridSize; r++) applyToTile(next[r][col], ctx);
      }
      pushExplosion(`combo-lr-${now}`, lt.row, lt.col, result, now);
      result.processedLightningKeys.push(`${lt.row},${lt.col}`);
      break;
    }

    case 'lightning_magnet': {
      // Magnetic Storm: vortex pull toward magnet, then clear columns of pulled tiles
      const lt3 = combo.tiles.find(t => t.tileType === 'lightning') ?? combo.tiles[0];
      const mg2 = combo.tiles.find(t => t.tileType === 'magnet') ?? combo.tiles[1];
      if (!lt3 || !mg2) break;
      const lmVortexRadius = scaledRadius(VORTEX_PULL_RADIUS, wordLengthScale);
      fireVortex(mg2.row, mg2.col, lmVortexRadius, result, ctx);
      // Clear the magnet column (and nearby columns from pull area)
      const colsToBlast = new Set<number>();
      for (let dr = -lmVortexRadius; dr <= lmVortexRadius; dr++) {
        const r = mg2.row + dr;
        if (r >= 0 && r < gridSize) {
          for (let dc = -lmVortexRadius; dc <= lmVortexRadius; dc++) {
            const c = mg2.col + dc;
            if (c >= 0 && c < gridSize && !next[r][c].isCleared) {
              colsToBlast.add(c);
            }
          }
        }
      }
      colsToBlast.add(mg2.col);
      for (const col of colsToBlast) {
        for (let r = 0; r < gridSize; r++) applyToTile(next[r][col], ctx);
      }
      pushExplosion(`combo-lmg-${now}`, mg2.row, mg2.col, result, now);
      result.processedLightningKeys.push(`${lt3.row},${lt3.col}`);
      break;
    }

    case 'lightning_gem': {
      // Shatter Strike: complete gem + column clear
      const lt4 = combo.tiles.find(t => t.tileType === 'lightning') ?? combo.tiles[0];
      if (!lt4) break;
      const gt2 = combo.tiles.find(t => t.tileType === 'gem');
      if (gt2) {
        const gemTile2 = next[gt2.row]?.[gt2.col];
        if (gemTile2) {
          gemTile2.hitsRemaining = 0;
          ctx.markCleared(gemTile2);
          result.bonusScore += TREASURE_GEM_COMPLETION_BONUS;
        }
      }
      for (let r = 0; r < gridSize; r++) applyToTile(next[r][lt4.col], ctx);
      pushExplosion(`combo-lg-${now}`, lt4.row, lt4.col, result, now);
      result.processedLightningKeys.push(`${lt4.row},${lt4.col}`);
      break;
    }

    case 'lightning_frozen': {
      // Permafrost: column clear + advance all frost tiles by 1 hit
      const lt5 = combo.tiles.find(t => t.tileType === 'lightning') ?? combo.tiles[0];
      if (!lt5) break;
      for (let r = 0; r < gridSize; r++) applyToTile(next[r][lt5.col], ctx);
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const tile = next[r][c];
          if (tile.type === 'frozen' && !tile.isCleared) {
            applyToTile(tile, ctx);
          }
        }
      }
      pushExplosion(`combo-lfz-${now}`, lt5.row, lt5.col, result, now);
      result.processedLightningKeys.push(`${lt5.row},${lt5.col}`);
      break;
    }

    // ── 48-02: Prism + Rainbow combos ────────────────────────────────────────

    case 'prism_rainbow': {
      // Aurora: cross-clear from EVERY cell in the word path
      const pathCells = path.length > 0 ? path : combo.tiles.map(t => ({ row: t.row, col: t.col }));
      for (const cell of pathCells) {
        fireCrossClear(cell.row, cell.col, ctx);
      }
      pushExplosion(`combo-pr-${now}`, combo.tiles[0].row, combo.tiles[0].col, result, now);
      break;
    }

    default:
      // Tactical combos (magnet/gem/frozen) — delegated to keep this file under 500 lines
      executeTacticalCombo(ctx, result);
      break;
  }

  return result;
}
