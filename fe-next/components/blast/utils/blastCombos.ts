import type { BlastTileState, BlastTileType } from '../types';

// ==================== Types ====================

export type BlastComboType =
  | 'bomb_bomb'
  | 'bomb_lightning'
  | 'bomb_prism'
  | 'bomb_rainbow'
  | 'bomb_mirror'
  | 'bomb_magnet'
  | 'bomb_gem'
  | 'bomb_frozen'
  | 'lightning_lightning'
  | 'lightning_prism'
  | 'lightning_rainbow'
  | 'lightning_mirror'
  | 'lightning_magnet'
  | 'lightning_gem'
  | 'lightning_frozen'
  | 'prism_prism'
  | 'prism_rainbow'
  | 'prism_mirror'
  | 'prism_magnet'
  | 'prism_gem'
  | 'prism_frozen'
  | 'rainbow_mirror'
  | 'rainbow_magnet'
  | 'rainbow_gem'
  | 'rainbow_frozen'
  | 'mirror_magnet'
  | 'mirror_gem'
  | 'mirror_frozen'
  | 'magnet_gem'
  | 'magnet_frozen'
  | 'gem_frozen'
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

/** Tiles that have area/column/cross effects (eligible for gold_special and rainbow_special fallback) */
const EFFECT_TILES: ReadonlySet<BlastTileType> = new Set([
  'bomb', 'lightning', 'prism', 'magnet', 'rainbow', 'mirror', 'gem', 'frozen',
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
  { a: 'prism',     b: 'mirror',    comboType: 'prism_mirror',        scoreMultiplier: 5  },
  { a: 'prism',     b: 'magnet',    comboType: 'prism_magnet',        scoreMultiplier: 5  },
  { a: 'bomb',      b: 'prism',     comboType: 'bomb_prism',          scoreMultiplier: 4  },
  { a: 'prism',     b: 'gem',       comboType: 'prism_gem',           scoreMultiplier: 4  },
  { a: 'bomb',      b: 'magnet',    comboType: 'bomb_magnet',         scoreMultiplier: 4  },
  { a: 'lightning', b: 'rainbow',   comboType: 'lightning_rainbow',   scoreMultiplier: 4  },
  { a: 'lightning', b: 'magnet',    comboType: 'lightning_magnet',    scoreMultiplier: 4  },
  { a: 'mirror',    b: 'magnet',    comboType: 'mirror_magnet',       scoreMultiplier: 4  },
  { a: 'mirror',    b: 'gem',       comboType: 'mirror_gem',          scoreMultiplier: 4  },
  { a: 'magnet',    b: 'gem',       comboType: 'magnet_gem',          scoreMultiplier: 4  },
  { a: 'bomb',      b: 'lightning', comboType: 'bomb_lightning',      scoreMultiplier: 3  },
  { a: 'lightning', b: 'lightning', comboType: 'lightning_lightning', scoreMultiplier: 3  },
  { a: 'bomb',      b: 'rainbow',   comboType: 'bomb_rainbow',        scoreMultiplier: 3  },
  { a: 'bomb',      b: 'mirror',    comboType: 'bomb_mirror',         scoreMultiplier: 3  },
  { a: 'bomb',      b: 'gem',       comboType: 'bomb_gem',            scoreMultiplier: 3  },
  { a: 'lightning', b: 'mirror',    comboType: 'lightning_mirror',    scoreMultiplier: 3  },
  { a: 'lightning', b: 'gem',       comboType: 'lightning_gem',       scoreMultiplier: 3  },
  { a: 'rainbow',   b: 'mirror',    comboType: 'rainbow_mirror',      scoreMultiplier: 4  },
  { a: 'rainbow',   b: 'magnet',    comboType: 'rainbow_magnet',      scoreMultiplier: 3  },
  { a: 'rainbow',   b: 'gem',       comboType: 'rainbow_gem',         scoreMultiplier: 3  },
  { a: 'prism',     b: 'frozen',    comboType: 'prism_frozen',        scoreMultiplier: 3  },
  { a: 'mirror',    b: 'frozen',    comboType: 'mirror_frozen',       scoreMultiplier: 3  },
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

  // Collect non-cleared special tiles from the path
  const specialTiles: Array<{ row: number; col: number; tileType: BlastTileType }> = [];
  for (const cell of path) {
    const tile = tileStates[cell.row]?.[cell.col];
    if (!tile || tile.isCleared || tile.type === 'standard') continue;
    specialTiles.push({ row: cell.row, col: cell.col, tileType: tile.type });
  }

  if (specialTiles.length < 2) return [];

  const combos: SpecialCombo[] = [];

  // Track which tile coords have been claimed by a specific pair combo
  // (prevents generic rainbow_special/gold_special fallbacks for the same tile)
  const usedTileKeys = new Set<string>();

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
        usedTileKeys.add(`${tilesA[0].row},${tilesA[0].col}`);
        usedTileKeys.add(`${tilesA[1].row},${tilesA[1].col}`);
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
        usedTileKeys.add(`${tilesA[0].row},${tilesA[0].col}`);
        usedTileKeys.add(`${tilesB[0].row},${tilesB[0].col}`);
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
  }

  // Triple special: 3+ special tiles in one word
  if (specialTiles.length >= 3) {
    combos.push({
      type: 'triple_special',
      tiles: specialTiles.slice(0, 3),
      scoreMultiplier: 4,
      label: 'blast.combo.triple_special',
    });
  }

  return combos;
}
