import type { BlastTileState, BlastExplosion } from '../types';
import type { SpecialCombo } from './blastCombos';
import { scaledRadius } from './blastComboScaling';

export interface ComboEffectContext {
  combo: SpecialCombo;
  /** Current tile state grid (mutated in place) */
  next: BlastTileState[][];
  gridSize: number;
  now: number;
  /** Word-length scaling factor (1.0 | 1.5 | 2.0) — applies to radii only, never to score. */
  wordLengthScale: number;
  markCleared: (tile: BlastTileState) => void;
}

export interface ComboEffectResult {
  explosions: BlastExplosion[];
  /** Bomb tile keys (`row,col`) consumed by this combo (prevents double-BFS) */
  processedBombKeys: string[];
}

function fireAreaBlast(row: number, col: number, radius: number, ctx: ComboEffectContext): void {
  const { next, gridSize } = ctx;
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < gridSize && c >= 0 && c < gridSize && !next[r][c].isCleared) ctx.markCleared(next[r][c]);
    }
  }
}

export function executeComboEffect(ctx: ComboEffectContext): ComboEffectResult {
  const { combo, now, wordLengthScale } = ctx;
  const result: ComboEffectResult = { explosions: [], processedBombKeys: [] };
  const explode = (id: string, row: number, col: number, type: BlastExplosion['type'] = 'combo') =>
    result.explosions.push({ id, row, col, type, intensity: 4, timestamp: now });

  switch (combo.type) {
    case 'bomb_bomb': {
      const [a, b] = combo.tiles;
      const midRow = Math.round((a.row + b.row) / 2);
      const midCol = Math.round((a.col + b.col) / 2);
      fireAreaBlast(midRow, midCol, 2, ctx);
      explode(`combo-bb-${now}`, midRow, midCol, 'mega_blast');
      result.processedBombKeys.push(`${a.row},${a.col}`, `${b.row},${b.col}`);
      break;
    }
    case 'gold_special': {
      const bomb = combo.tiles.find(t => t.tileType === 'bomb') ?? combo.tiles[1];
      fireAreaBlast(bomb.row, bomb.col, scaledRadius(2, wordLengthScale), ctx);
      explode(`combo-gs-${now}`, bomb.row, bomb.col);
      if (bomb.tileType === 'bomb') result.processedBombKeys.push(`${bomb.row},${bomb.col}`);
      break;
    }
    case 'triple_special': {
      const center = combo.tiles[1] ?? combo.tiles[0];
      fireAreaBlast(center.row, center.col, scaledRadius(2, wordLengthScale), ctx);
      explode(`combo-ts-${now}`, center.row, center.col);
      break;
    }
  }
  return result;
}
