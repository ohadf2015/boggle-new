import type { BlastTileState, BlastTileType } from '../types';
import type { BlastComboType } from '@/shared/types/blast';

export type { BlastComboType };

export interface SpecialCombo {
  type: BlastComboType;
  tiles: Array<{ row: number; col: number; tileType: BlastTileType }>;
  scoreMultiplier: number;
  /** Translation key shown to player */
  label: string;
}

/** Tile types that can take part in a combo (drives the combo hint glow). */
export const COMBO_ELIGIBLE_TILES: ReadonlySet<BlastTileType> = new Set<BlastTileType>(['bomb', 'gold']);

/**
 * Detect special combos on a word path: two bombs (mega blast), a coin with a
 * bomb (amplified blast), and three or more specials of any kind.
 */
export function detectSpecialCombos(
  path: Array<{ row: number; col: number }>,
  tileStates: BlastTileState[][],
): SpecialCombo[] {
  if (path.length < 2) return [];

  const specials: Array<{ row: number; col: number; tileType: BlastTileType }> = [];
  for (const cell of path) {
    const tile = tileStates[cell.row]?.[cell.col];
    if (!tile || tile.isCleared || tile.type === 'standard') continue;
    specials.push({ row: cell.row, col: cell.col, tileType: tile.type });
  }
  if (specials.length < 2) return [];

  const combos: SpecialCombo[] = [];
  const used = new Set<string>();
  const key = (t: { row: number; col: number }) => `${t.row},${t.col}`;
  const unused = (type: BlastTileType) => specials.filter(t => t.tileType === type && !used.has(key(t)));
  const claim = (type: BlastComboType, tiles: SpecialCombo['tiles'], scoreMultiplier: number) => {
    combos.push({ type, tiles, scoreMultiplier, label: `blast.combo.${type}` });
    for (const t of tiles) used.add(key(t));
  };

  const bombs = unused('bomb');
  if (bombs.length >= 2) claim('bomb_bomb', [bombs[0], bombs[1]], 2);

  const coins = unused('gold');
  const freeBombs = unused('bomb');
  if (coins.length > 0 && freeBombs.length > 0) claim('gold_special', [coins[0], freeBombs[0]], 5);

  const rest = specials.filter(t => !used.has(key(t)));
  if (rest.length >= 3) claim('triple_special', rest.slice(0, 3), 4);

  return combos;
}
