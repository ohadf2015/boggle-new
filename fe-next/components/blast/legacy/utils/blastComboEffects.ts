import type { BlastTileState, BlastExplosion } from '../types';
import type { SpecialCombo } from './blastCombos';

export interface ComboEffectContext {
  combo: SpecialCombo;
  /** Current tile state grid (mutated in place) */
  next: BlastTileState[][];
  gridSize: number;
  now: number;
  markCleared: (tile: BlastTileState) => void;
}

export interface ComboEffectResult {
  explosions: BlastExplosion[];
  /** Bomb tile keys (`row,col`) consumed by this combo (prevents double-BFS) */
  processedBombKeys: string[];
}

/** Combos blast a fixed 3x3: big enough to feel, small enough to plan around. */
export const COMBO_BLAST_RADIUS = 1;

/** Clears a square around a tile, nearest ring first, so a capped blast still reads as one tidy shape. */
function fireAreaBlast(row: number, col: number, radius: number, ctx: ComboEffectContext): void {
  const { next, gridSize } = ctx;
  for (let ring = 0; ring <= radius; ring++) {
    for (let dr = -ring; dr <= ring; dr++) {
      for (let dc = -ring; dc <= ring; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < gridSize && c >= 0 && c < gridSize && !next[r][c].isCleared) ctx.markCleared(next[r][c]);
      }
    }
  }
}

export function executeComboEffect(ctx: ComboEffectContext): ComboEffectResult {
  const { combo, now } = ctx;
  const result: ComboEffectResult = { explosions: [], processedBombKeys: [] };
  const explode = (id: string, row: number, col: number, type: BlastExplosion['type'] = 'combo') =>
    result.explosions.push({ id, row, col, type, intensity: 4, timestamp: now });

  switch (combo.type) {
    case 'bomb_bomb': {
      // Both bombs go off together (3x3 each) without chaining further: a double, not a wipe.
      const [a, b] = combo.tiles;
      fireAreaBlast(a.row, a.col, COMBO_BLAST_RADIUS, ctx);
      fireAreaBlast(b.row, b.col, COMBO_BLAST_RADIUS, ctx);
      explode(`combo-bb-${now}`, Math.round((a.row + b.row) / 2), Math.round((a.col + b.col) / 2), 'mega_blast');
      result.processedBombKeys.push(`${a.row},${a.col}`, `${b.row},${b.col}`);
      break;
    }
    case 'gold_special': {
      const bomb = combo.tiles.find(t => t.tileType === 'bomb') ?? combo.tiles[1];
      fireAreaBlast(bomb.row, bomb.col, COMBO_BLAST_RADIUS, ctx);
      explode(`combo-gs-${now}`, bomb.row, bomb.col);
      if (bomb.tileType === 'bomb') result.processedBombKeys.push(`${bomb.row},${bomb.col}`);
      break;
    }
    case 'triple_special': {
      const center = combo.tiles[1] ?? combo.tiles[0];
      fireAreaBlast(center.row, center.col, COMBO_BLAST_RADIUS, ctx);
      explode(`combo-ts-${now}`, center.row, center.col);
      break;
    }
  }
  return result;
}
