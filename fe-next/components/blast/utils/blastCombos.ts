import type { BlastTileState, BlastTileType } from '../types';

// ==================== Types ====================

export type BlastComboType =
  | 'bomb_bomb'
  | 'bomb_lightning'
  | 'bomb_prism'
  | 'lightning_lightning'
  | 'lightning_prism'
  | 'prism_prism'
  | 'gold_special'
  | 'rainbow_special'
  | 'triple_special';

export interface SpecialCombo {
  type: BlastComboType;
  tiles: Array<{ row: number; col: number; tileType: BlastTileType }>;
  /** Bonus score multiplier */
  scoreMultiplier: number;
  /** Translation key shown to player */
  label: string;
}

// ==================== Constants ====================

/** Tiles that have area/column/cross effects (eligible for gold_special and rainbow_special) */
const EFFECT_TILES: ReadonlySet<BlastTileType> = new Set([
  'bomb', 'lightning', 'prism', 'magnet',
]);

/** Combo definitions: [typeA, typeB] → combo config */
const PAIR_COMBOS: Array<{
  a: BlastTileType;
  b: BlastTileType;
  comboType: BlastComboType;
  scoreMultiplier: number;
}> = [
  { a: 'prism',     b: 'prism',     comboType: 'prism_prism',         scoreMultiplier: 10 },
  { a: 'lightning',  b: 'prism',     comboType: 'lightning_prism',     scoreMultiplier: 6 },
  { a: 'bomb',       b: 'prism',     comboType: 'bomb_prism',          scoreMultiplier: 5 },
  { a: 'bomb',       b: 'lightning',  comboType: 'bomb_lightning',      scoreMultiplier: 4 },
  { a: 'lightning',  b: 'lightning',  comboType: 'lightning_lightning',  scoreMultiplier: 4 },
  { a: 'bomb',       b: 'bomb',       comboType: 'bomb_bomb',            scoreMultiplier: 3 },
];

// ==================== Detection ====================

/**
 * Analyze a word path's tile types and return all detected combinations.
 * Pure function — no side effects.
 */
export function detectSpecialCombos(
  path: Array<{ row: number; col: number }>,
  tileStates: BlastTileState[][],
): SpecialCombo[] {
  if (path.length < 2) return [];

  // Collect non-cleared special tiles from the path
  const specialTiles: Array<{ row: number; col: number; tileType: BlastTileType }> = [];
  for (const cell of path) {
    const tile = tileStates[cell.row]?.[cell.col];
    if (!tile || tile.isCleared || tile.type === 'standard') continue;
    specialTiles.push({ row: cell.row, col: cell.col, tileType: tile.type });
  }

  if (specialTiles.length < 2) return [];

  const combos: SpecialCombo[] = [];

  // Check pair combos: for each defined pair, see if path contains both types
  for (const def of PAIR_COMBOS) {
    const tilesA = specialTiles.filter(t => t.tileType === def.a);
    const tilesB = def.a === def.b
      ? tilesA.length >= 2 ? tilesA : []
      : specialTiles.filter(t => t.tileType === def.b);

    if (def.a === def.b) {
      // Same-type pair: need at least 2
      if (tilesA.length >= 2) {
        combos.push({
          type: def.comboType,
          tiles: [tilesA[0], tilesA[1]],
          scoreMultiplier: def.scoreMultiplier,
          label: `blast.combo.${def.comboType}`,
        });
      }
    } else {
      // Different-type pair: need at least 1 of each
      if (tilesA.length > 0 && tilesB.length > 0) {
        combos.push({
          type: def.comboType,
          tiles: [tilesA[0], tilesB[0]],
          scoreMultiplier: def.scoreMultiplier,
          label: `blast.combo.${def.comboType}`,
        });
      }
    }
  }

  // Gold + any effect special
  const goldTiles = specialTiles.filter(t => t.tileType === 'gold');
  const effectTiles = specialTiles.filter(t => EFFECT_TILES.has(t.tileType));
  if (goldTiles.length > 0 && effectTiles.length > 0) {
    combos.push({
      type: 'gold_special',
      tiles: [goldTiles[0], effectTiles[0]],
      scoreMultiplier: 5,
      label: 'blast.combo.gold_special',
    });
  }

  // Rainbow + any effect special
  const rainbowTiles = specialTiles.filter(t => t.tileType === 'rainbow');
  if (rainbowTiles.length > 0 && effectTiles.length > 0) {
    combos.push({
      type: 'rainbow_special',
      tiles: [rainbowTiles[0], effectTiles[0]],
      scoreMultiplier: 3,
      label: 'blast.combo.rainbow_special',
    });
  }

  // Triple special: 3+ special tiles in one word
  if (specialTiles.length >= 3) {
    combos.push({
      type: 'triple_special',
      tiles: specialTiles.slice(0, 3),
      scoreMultiplier: 2,
      label: 'blast.combo.triple_special',
    });
  }

  return combos;
}
