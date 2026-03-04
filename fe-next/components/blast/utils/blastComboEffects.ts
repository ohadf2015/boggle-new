import type { BlastTileState, BlastTileType } from '../types';
import type { BlastExplosion } from '../types';
import type { SpecialCombo } from './blastCombos';
import { BOMB_RADIUS } from '../types';

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

    default:
      // New combo types (48-02/48-03) — no-op skeleton, returns empty result
      break;
  }

  return result;
}
