import type { BlastTileState, BlastTileType } from '../types';
import type { BlastComboType } from '@/shared/types/blast';

// ==================== Types ====================

// BlastComboType is now canonical in @/shared/types/blast (single source of truth
// for both UI components and the SubmitWordSchema enum validator). Re-exported
// here so existing imports from this file keep working.
export type { BlastComboType };

export interface SpecialCombo {
  type: BlastComboType;
  tiles: Array<{ row: number; col: number; tileType: BlastTileType }>;
  /** Bonus score multiplier */
  scoreMultiplier: number;
  /** Translation key shown to player */
  label: string;
}

// ==================== Constants ====================

/** Tiles that have area/column/cross effects (eligible for gold_special and rainbow_special fallback) */
const EFFECT_TILES: ReadonlySet<BlastTileType> = new Set<BlastTileType>([
  'bomb', 'lightning', 'prism', 'magnet', 'rainbow', 'gem', 'frozen',
]);

/** All tile types that can participate in a combo (used for combo hint glow) */
export const COMBO_ELIGIBLE_TILES: ReadonlySet<BlastTileType> = new Set<BlastTileType>([
  'bomb', 'lightning', 'prism', 'magnet', 'rainbow', 'gem', 'frozen', 'gold',
]);

/** Combo definitions: [typeA, typeB] → combo config (ordered highest priority first) */
const PAIR_COMBOS: Array<{
  a: BlastTileType;
  b: BlastTileType;
  comboType: BlastComboType;
  scoreMultiplier: number;
}> = [
  // Compressed range: 2×–6× (was 3×–10×) for better balance perception
  { a: 'prism',     b: 'prism',     comboType: 'prism_prism',         scoreMultiplier: 6  },
  { a: 'prism',     b: 'rainbow',   comboType: 'prism_rainbow',       scoreMultiplier: 5  },
  { a: 'lightning', b: 'prism',     comboType: 'lightning_prism',     scoreMultiplier: 5  },
  { a: 'prism',     b: 'magnet',    comboType: 'prism_magnet',        scoreMultiplier: 5  },
  { a: 'bomb',      b: 'prism',     comboType: 'bomb_prism',          scoreMultiplier: 4  },
  { a: 'prism',     b: 'gem',       comboType: 'prism_gem',           scoreMultiplier: 4  },
  { a: 'bomb',      b: 'magnet',    comboType: 'bomb_magnet',         scoreMultiplier: 4  },
  { a: 'lightning', b: 'rainbow',   comboType: 'lightning_rainbow',   scoreMultiplier: 4  },
  { a: 'lightning', b: 'magnet',    comboType: 'lightning_magnet',    scoreMultiplier: 4  },
  { a: 'magnet',    b: 'gem',       comboType: 'magnet_gem',          scoreMultiplier: 4  },
  { a: 'bomb',      b: 'lightning', comboType: 'bomb_lightning',      scoreMultiplier: 3  },
  { a: 'lightning', b: 'lightning', comboType: 'lightning_lightning', scoreMultiplier: 3  },
  { a: 'bomb',      b: 'rainbow',   comboType: 'bomb_rainbow',        scoreMultiplier: 3  },
  { a: 'bomb',      b: 'gem',       comboType: 'bomb_gem',            scoreMultiplier: 3  },
  { a: 'lightning', b: 'gem',       comboType: 'lightning_gem',       scoreMultiplier: 3  },
  { a: 'rainbow',   b: 'magnet',    comboType: 'rainbow_magnet',      scoreMultiplier: 3  },
  { a: 'rainbow',   b: 'gem',       comboType: 'rainbow_gem',         scoreMultiplier: 3  },
  { a: 'prism',     b: 'frozen',    comboType: 'prism_frozen',        scoreMultiplier: 3  },
  { a: 'magnet',    b: 'frozen',    comboType: 'magnet_frozen',       scoreMultiplier: 3  },
  { a: 'gem',       b: 'frozen',    comboType: 'gem_frozen',          scoreMultiplier: 3  },
  { a: 'bomb',      b: 'bomb',      comboType: 'bomb_bomb',           scoreMultiplier: 2  },
  { a: 'bomb',      b: 'frozen',    comboType: 'bomb_frozen',         scoreMultiplier: 2  },
  { a: 'lightning', b: 'frozen',    comboType: 'lightning_frozen',    scoreMultiplier: 2  },
  { a: 'rainbow',   b: 'frozen',    comboType: 'rainbow_frozen',      scoreMultiplier: 2  },
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

  // Collect non-cleared special tiles from the path.
  // Skip multi-hit tiles that aren't on their final hit — their effect won't fire this turn.
  const MULTI_HIT_TYPES: ReadonlySet<BlastTileType> = new Set(['ice', 'prism', 'frozen', 'gem']);
  const specialTiles: Array<{ row: number; col: number; tileType: BlastTileType }> = [];
  for (const cell of path) {
    const tile = tileStates[cell.row]?.[cell.col];
    if (!tile || tile.isCleared || tile.type === 'standard') continue;
    if (MULTI_HIT_TYPES.has(tile.type) && tile.hitsRemaining > 1) continue;
    specialTiles.push({ row: cell.row, col: cell.col, tileType: tile.type });
  }

  if (specialTiles.length < 2) return [];

  const combos: SpecialCombo[] = [];

  // Track which tile coords have been claimed by a specific pair combo
  // (prevents generic rainbow_special/gold_special fallbacks for the same tile)
  const usedTileKeys = new Set<string>();
  const tileKey = (t: { row: number; col: number }) => `${t.row},${t.col}`;

  // Check pair combos: for each defined pair, see if path contains both types.
  // Each tile can only participate in one pair combo (checked via usedTileKeys).
  for (const def of PAIR_COMBOS) {
    const tilesA = specialTiles.filter(t => t.tileType === def.a && !usedTileKeys.has(tileKey(t)));
    const tilesB = def.a === def.b
      ? tilesA.length >= 2 ? tilesA : []
      : specialTiles.filter(t => t.tileType === def.b && !usedTileKeys.has(tileKey(t)));

    if (def.a === def.b) {
      if (tilesA.length >= 2) {
        combos.push({
          type: def.comboType,
          tiles: [tilesA[0], tilesA[1]],
          scoreMultiplier: def.scoreMultiplier,
          label: `blast.combo.${def.comboType}`,
        });
        usedTileKeys.add(tileKey(tilesA[0]));
        usedTileKeys.add(tileKey(tilesA[1]));
      }
    } else {
      if (tilesA.length > 0 && tilesB.length > 0) {
        combos.push({
          type: def.comboType,
          tiles: [tilesA[0], tilesB[0]],
          scoreMultiplier: def.scoreMultiplier,
          label: `blast.combo.${def.comboType}`,
        });
        usedTileKeys.add(tileKey(tilesA[0]));
        usedTileKeys.add(tileKey(tilesB[0]));
      }
    }
  }

  // Gold + any effect special (gold is not in the 28-pair matrix)
  const goldTiles = specialTiles.filter(t => t.tileType === 'gold');
  const effectTilesForGold = specialTiles.filter(t => EFFECT_TILES.has(t.tileType) && !usedTileKeys.has(`${t.row},${t.col}`));
  if (goldTiles.length > 0 && effectTilesForGold.length > 0) {
    combos.push({
      type: 'gold_special',
      tiles: [goldTiles[0], effectTilesForGold[0]],
      scoreMultiplier: 5,
      label: 'blast.combo.gold_special',
    });
    usedTileKeys.add(tileKey(goldTiles[0]));
    usedTileKeys.add(tileKey(effectTilesForGold[0]));
  }

  // Rainbow + any effect special (fallback — only if rainbow not already used in a specific pair)
  const rainbowTilesUnused = specialTiles.filter(
    t => t.tileType === 'rainbow' && !usedTileKeys.has(`${t.row},${t.col}`)
  );
  const effectTilesForRainbow = specialTiles.filter(
    t => EFFECT_TILES.has(t.tileType) && t.tileType !== 'rainbow' && !usedTileKeys.has(`${t.row},${t.col}`)
  );
  if (rainbowTilesUnused.length > 0 && effectTilesForRainbow.length > 0) {
    combos.push({
      type: 'rainbow_special',
      tiles: [rainbowTilesUnused[0], effectTilesForRainbow[0]],
      scoreMultiplier: 3,
      label: 'blast.combo.rainbow_special',
    });
    usedTileKeys.add(tileKey(rainbowTilesUnused[0]));
    usedTileKeys.add(tileKey(effectTilesForRainbow[0]));
  }

  // Triple special: 3+ unclaimed special tiles in one word
  const unclaimedSpecials = specialTiles.filter(t => !usedTileKeys.has(`${t.row},${t.col}`));
  if (unclaimedSpecials.length >= 3) {
    combos.push({
      type: 'triple_special',
      tiles: unclaimedSpecials.slice(0, 3),
      scoreMultiplier: 4,
      label: 'blast.combo.triple_special',
    });
  }

  return combos;
}
