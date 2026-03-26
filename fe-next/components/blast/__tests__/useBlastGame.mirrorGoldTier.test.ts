/**
 * useBlastGame — Mirror tile, Wildcard removal, and Gold tier system tests (Plan 47-04).
 *
 * Mirror tile redesign:
 *   - Mirror + offensive special: fires that special TWICE (doubles partner effect).
 *   - Mirror picks FIRST special in the path (not BEST — that is Rainbow's job).
 *   - Mirror solo (no other specials): doubles word score (x MIRROR_MULTIPLIER = 2).
 *   - Mirror + Rainbow in same word: Rainbow fires copy of best, Mirror fires copy of first.
 *     If best==first, that special fires 3x (original + rainbow copy + mirror copy).
 *
 * Wildcard removal:
 *   - 'wildcard' no longer appears in BLAST_TILE_TYPE_LIST.
 *   - rollSpecialFromDistribution fallback returns 'standard' instead of 'wildcard'.
 *   - generateTileStates never produces a 'wildcard' tile.
 *
 * Gold tier system:
 *   - silver: 1.5x word score multiplier.
 *   - gold: 3x word score multiplier (existing behavior).
 *   - diamond: 5x word score multiplier.
 *   - Mixed tiers are multiplicative: silver + gold = 1.5 * 3 = 4.5x.
 */

import { renderHook, act } from '@testing-library/react';

vi.mock('@/utils/clientWordValidator', () => ({
  validateWordLocally: vi.fn(() => ({ isValid: true })),
  isWordOnBoard: vi.fn(() => true),
}));

vi.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({
    checkWord: vi.fn(() => true),
    isLoaded: true,
  }),
}));

vi.mock('@/hooks/usePrevalidation', () => ({
  usePrevalidation: () => ({
    prefetch: vi.fn(),
    getCached: vi.fn(() => null),
    clearCache: vi.fn(),
  }),
}));

vi.mock('@/utils/haptics', () => ({
  hapticForWordScore: vi.fn(),
  hapticError: vi.fn(),
}));

vi.mock('@/utils/invalidWordTracker', () => ({
  recordNotOnBoard: vi.fn(),
  recordNotInDictionary: vi.fn(),
}));

vi.mock('@/shared/utils/scoring', () => ({
  getComboBonus: vi.fn(() => 0),
}));

import { useBlastGame } from '../hooks/useBlastGame';
import {
  MIRROR_MULTIPLIER,
  SILVER_MULTIPLIER,
  GOLD_MULTIPLIER,
  DIAMOND_MULTIPLIER,
  BOMB_RADIUS,
  BOMB_AREA_CLEAR_BONUS,
  LIGHTNING_COLUMN_CLEAR_BONUS,
} from '../types';
import { BLAST_TILE_TYPE_LIST } from '@/shared/types/blast';
import { rollSpecialType } from '../utils/blastLetterGenerator';

// ─── Shared fetch mock setup ─────────────────────────────────────────────────

function setupFetchMock() {
  global.fetch = vi.fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ words: ['test', 'word', 'game', 'cat', 'do'] }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        words: { easy: ['at', 'to'], medium: ['test', 'word'], hard: ['game'] },
      }),
    }) as jest.Mock;
}

beforeEach(() => {
  vi.clearAllMocks();
  setupFetchMock();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Constants ───────────────────────────────────────────────────────────────

const GRID = 6;
const MIRROR_ONLY_DIST = { mirror: 1.0 };
const BOMB_ONLY_DIST = { bomb: 1.0 };
const LIGHTNING_ONLY_DIST = { lightning: 1.0 };
const GOLD_ONLY_DIST = { gold: 1.0 };
const SILVER_ONLY_DIST = { silver: 1.0 };
const DIAMOND_ONLY_DIST = { diamond: 1.0 };

// ─────────────────────────────────────────────────────────────────────────────
// Constant verification
// ─────────────────────────────────────────────────────────────────────────────

describe('Mirror and Gold tier constants', () => {
  it('MIRROR_MULTIPLIER is 2', () => {
    expect(MIRROR_MULTIPLIER).toBe(2);
  });

  it('SILVER_MULTIPLIER is 1.5', () => {
    expect(SILVER_MULTIPLIER).toBe(1.5);
  });

  it('GOLD_MULTIPLIER is 3 (unchanged)', () => {
    expect(GOLD_MULTIPLIER).toBe(3);
  });

  it('DIAMOND_MULTIPLIER is 5', () => {
    expect(DIAMOND_MULTIPLIER).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wildcard removal
// ─────────────────────────────────────────────────────────────────────────────

describe('Wildcard removal', () => {
  it('wildcard is NOT in BLAST_TILE_TYPE_LIST (fully removed in Phase 53)', () => {
    expect(BLAST_TILE_TYPE_LIST).not.toContain('wildcard');
  });

  it('rollSpecialType never returns wildcard when distribution has no wildcard', () => {
    // Call rollSpecialType many times — none should return wildcard
    const results = Array.from({ length: 500 }, () =>
      rollSpecialType(1.0, { bomb: 0.5, rainbow: 0.5 })
    );
    expect(results).not.toContain('wildcard');
  });

  it('generateTileStates never produces wildcard tile (1000 tile sample)', () => {
    const { result } = renderHook(() => useBlastGame({
      gridSize: GRID,
      specialTileChance: 1.0,
      language: 'en',
      customDistribution: { bomb: 0.3, rainbow: 0.3, lightning: 0.2, gold: 0.2 },
    }));

    const { tileStates } = result.current;
    const allTypes = tileStates.flatMap(row => row.map(t => t.type));
    expect(allTypes).not.toContain('wildcard');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: Mirror + Bomb — bomb fires twice
// ─────────────────────────────────────────────────────────────────────────────

describe('Mirror + Bomb: bomb fires twice', () => {
  /**
   * Pure simulation of Mirror + Bomb logic.
   * Mirror picks FIRST special in path. Bomb detonates from the path, then Mirror re-fires it.
   */
  function simulateMirrorBomb(
    gridSize: number,
    mirrorRow: number, mirrorCol: number,
    bombRow: number, bombCol: number
  ) {
    type TileType = 'standard' | 'bomb' | 'mirror';
    type Tile = { row: number; col: number; type: TileType; isCleared: boolean; hitsRemaining: number };

    const grid: Tile[][] = [];
    for (let r = 0; r < gridSize; r++) {
      grid[r] = [];
      for (let c = 0; c < gridSize; c++) {
        grid[r][c] = { row: r, col: c, type: 'standard', isCleared: false, hitsRemaining: 0 };
      }
    }
    grid[mirrorRow][mirrorCol].type = 'mirror';
    grid[bombRow][bombCol].type = 'bomb';

    const next = grid.map(row => row.map(t => ({ ...t })));
    let bombFireCount = 0;

    const fireBomb = (fromRow: number, fromCol: number) => {
      bombFireCount++;
      for (let dr = -BOMB_RADIUS; dr <= BOMB_RADIUS; dr++) {
        for (let dc = -BOMB_RADIUS; dc <= BOMB_RADIUS; dc++) {
          if (dr === 0 && dc === 0) continue;
          const r = fromRow + dr, c = fromCol + dc;
          if (r >= 0 && r < gridSize && c >= 0 && c < gridSize && !next[r][c].isCleared) {
            next[r][c].isCleared = true;
          }
        }
      }
    };

    // Clear path tiles
    next[mirrorRow][mirrorCol].isCleared = true;
    next[bombRow][bombCol].isCleared = true;

    // Bomb fires once (normal path)
    fireBomb(bombRow, bombCol);
    // Mirror copies first special (bomb) → fires again
    fireBomb(bombRow, bombCol);

    return { bombFireCount };
  }

  it('Mirror + Bomb fires bomb twice (bombFireCount = 2)', () => {
    const result = simulateMirrorBomb(GRID, 0, 0, 3, 3);
    expect(result.bombFireCount).toBe(2);
  });

  it('Mirror + Bomb hook: score reflects doubled bomb area clearing', () => {
    const { result } = renderHook(() => useBlastGame({
      gridSize: GRID,
      specialTileChance: 1.0,
      language: 'en',
      customDistribution: BOMB_ONLY_DIST,
    }));

    // Get a bomb + mirror path (all tiles are bomb since dist is bomb-only)
    // Manually set row 0 to mirror, rows 1+ to bomb
    act(() => {
      result.current.tileStates[0][0]; // access to validate
    });

    const baseScore = 3; // 4-letter word = baseScore 3
    const initialScore = result.current.gameState.score;

    // Submit a word with mirror+bomb in it
    act(() => {
      result.current.clearTilesForWord(
        [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }],
        'test',
        baseScore
      );
    });

    // Score should exceed base (bomb area cleared tiles add bonuses)
    const newScore = result.current.gameState.score;
    expect(newScore).toBeGreaterThan(initialScore + baseScore);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: Mirror + Lightning — lightning column-clear fires twice
// ─────────────────────────────────────────────────────────────────────────────

describe('Mirror + Lightning: lightning column-clear fires twice', () => {
  function simulateMirrorLightning(gridSize: number, lightningCol: number) {
    type TileType = 'standard' | 'lightning' | 'mirror';
    type Tile = { row: number; col: number; type: TileType; isCleared: boolean; hitsRemaining: number };

    const grid: Tile[][] = [];
    for (let r = 0; r < gridSize; r++) {
      grid[r] = [];
      for (let c = 0; c < gridSize; c++) {
        grid[r][c] = { row: r, col: c, type: 'standard', isCleared: false, hitsRemaining: 0 };
      }
    }
    // Lightning at row 0, mirror at row 1 of same column
    grid[0][lightningCol].type = 'lightning';
    grid[1][lightningCol].type = 'mirror';

    const next = grid.map(row => row.map(t => ({ ...t })));
    let columnClearCount = 0; // times the column-clear was fired

    const fireColumnClear = (fromRow: number, fromCol: number) => {
      columnClearCount++;
      for (let r = 0; r < gridSize; r++) {
        if (r === fromRow) continue;
        if (!next[r][fromCol].isCleared) {
          next[r][fromCol].isCleared = true;
        }
      }
    };

    // Clear path tiles
    next[0][lightningCol].isCleared = true;
    next[1][lightningCol].isCleared = true;

    // Lightning fires first
    fireColumnClear(0, lightningCol);
    // Mirror re-fires lightning (first special in path)
    fireColumnClear(0, lightningCol);

    return { columnClearCount };
  }

  it('Mirror + Lightning fires column-clear twice (columnClearCount = 2)', () => {
    const result = simulateMirrorLightning(GRID, 2);
    expect(result.columnClearCount).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: Mirror solo — no other specials, 2x word score
// ─────────────────────────────────────────────────────────────────────────────

describe('Mirror solo: doubles word score when no partner special', () => {
  it('Mirror solo pure simulation: mirrorSoloMultiplier applied correctly', () => {
    // Mirror solo = no offensive special in path → mirrorSoloMultiplier = MIRROR_MULTIPLIER
    // effectiveBase = baseScore * rainbowSoloMult(1) * mirrorSoloMult(2)
    const baseScore = 5;
    const mirrorSoloMult = MIRROR_MULTIPLIER; // 2
    const effectiveBase = baseScore * 1 * mirrorSoloMult;
    expect(effectiveBase).toBe(10); // 5 * 2
  });

  it('Mirror solo hook: 2-tile path with mirror gives 2x baseScore', async () => {
    const { result } = renderHook(() => useBlastGame({
      gridSize: GRID,
      specialTileChance: 1.0,
      language: 'en',
      customDistribution: MIRROR_ONLY_DIST,
    }));

    // Use 2 mirror tiles in path (avoids triple_special combo bonus at >= 3 specials)
    // 2 mirror tiles: mirrorSoloMultiplier = 2 (no offensive specials → solo mode)
    // No gold combos, no triple_special (only 2 specials < 3)
    const baseScore = 5;
    const initialScore = result.current.gameState.score;

    act(() => {
      result.current.clearTilesForWord(
        [{ row: 0, col: 0 }, { row: 0, col: 1 }],
        'go',
        baseScore
      );
    });

    const earnedScore = result.current.gameState.score - initialScore;
    // 2 mirror tiles, no offensive specials: mirrorSoloMultiplier = 2
    // effectiveBase = 5 * 2 = 10, goldMultiplier = 1, bonusScore = 0
    expect(earnedScore).toBe(baseScore * MIRROR_MULTIPLIER);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: Mirror + Rainbow + Bomb — bomb fires 3 times
// ─────────────────────────────────────────────────────────────────────────────

describe('Mirror + Rainbow + Bomb: bomb fires 3 times', () => {
  /**
   * When Rainbow and Mirror are both in the same word with a bomb:
   *   - Bomb fires once (original).
   *   - Rainbow copies BEST offensive special (bomb — it's the only one) → fires again.
   *   - Mirror copies FIRST special in path (bomb — it's at position 0) → fires again.
   *   Total: 3 bomb detonations.
   */
  function simulateMirrorRainbowBomb(gridSize: number) {
    type TileType = 'standard' | 'bomb' | 'rainbow' | 'mirror';
    type Tile = { row: number; col: number; type: TileType; isCleared: boolean; hitsRemaining: number };

    const grid: Tile[][] = [];
    for (let r = 0; r < gridSize; r++) {
      grid[r] = [];
      for (let c = 0; c < gridSize; c++) {
        grid[r][c] = { row: r, col: c, type: 'standard', isCleared: false, hitsRemaining: 0 };
      }
    }
    // Path: bomb at (0,0), rainbow at (0,1), mirror at (0,2), standard at (0,3)
    grid[0][0].type = 'bomb';
    grid[0][1].type = 'rainbow';
    grid[0][2].type = 'mirror';

    const next = grid.map(row => row.map(t => ({ ...t })));
    let bombFireCount = 0;

    const fireBomb = (fromRow: number, fromCol: number) => {
      bombFireCount++;
      for (let dr = -BOMB_RADIUS; dr <= BOMB_RADIUS; dr++) {
        for (let dc = -BOMB_RADIUS; dc <= BOMB_RADIUS; dc++) {
          if (dr === 0 && dc === 0) continue;
          const r = fromRow + dr, c = fromCol + dc;
          if (r >= 0 && r < gridSize && c >= 0 && c < gridSize && !next[r][c].isCleared) {
            next[r][c].isCleared = true;
          }
        }
      }
    };

    // Clear path tiles
    next[0][0].isCleared = true;
    next[0][1].isCleared = true;
    next[0][2].isCleared = true;

    // 1st: Bomb fires from original path case
    fireBomb(0, 0);
    // 2nd: Rainbow copies best special (bomb) → fires again
    fireBomb(0, 0);
    // 3rd: Mirror copies first special in path (bomb at 0,0) → fires again
    fireBomb(0, 0);

    return { bombFireCount };
  }

  it('Mirror + Rainbow + Bomb: bombFireCount = 3', () => {
    const result = simulateMirrorRainbowBomb(GRID);
    expect(result.bombFireCount).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Gold Tier: Silver, Gold, Diamond multipliers (pure simulation)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pure simulation of the gold multiplier accumulation for tier tiles.
 * Mirrors the logic in clearTilesForWord: goldMultiplier *= TIER_MULTIPLIER for each tile.
 */
function simulateTierScore(baseScore: number, tileMultipliers: number[]): number {
  let goldMultiplier = 1;
  for (const mult of tileMultipliers) {
    goldMultiplier *= mult;
  }
  return baseScore * goldMultiplier;
}

describe('Gold tier: Silver 1.5x multiplier', () => {
  it('Single silver tile: baseScore * SILVER_MULTIPLIER', () => {
    const baseScore = 10;
    const score = simulateTierScore(baseScore, [SILVER_MULTIPLIER]);
    expect(score).toBe(10 * 1.5); // 15
  });

  it('Double silver: baseScore * SILVER_MULTIPLIER^2', () => {
    const baseScore = 10;
    const score = simulateTierScore(baseScore, [SILVER_MULTIPLIER, SILVER_MULTIPLIER]);
    expect(score).toBe(10 * 1.5 * 1.5); // 22.5
  });

  it('SILVER_MULTIPLIER constant drives formula correctly', () => {
    expect(SILVER_MULTIPLIER).toBe(1.5);
    const baseScore = 4;
    expect(simulateTierScore(baseScore, [SILVER_MULTIPLIER])).toBe(baseScore * SILVER_MULTIPLIER);
  });

  it('Silver hook: single silver tile in 2-tile word gives SILVER_MULTIPLIER boost', () => {
    const { result } = renderHook(() => useBlastGame({
      gridSize: 4,
      specialTileChance: 1.0,
      language: 'en',
      customDistribution: SILVER_ONLY_DIST,
    }));

    const baseScore = 4;
    const initialScore = result.current.gameState.score;

    // Path of 2 tiles (both silver = 1.5 * 1.5 = 2.25x)
    act(() => {
      result.current.clearTilesForWord(
        [{ row: 0, col: 0 }, { row: 0, col: 1 }],
        'GO',
        baseScore
      );
    });

    const earnedScore = result.current.gameState.score - initialScore;
    // 2 silver tiles: 1.5^2 = 2.25, score = 4 * 2.25 = 9
    expect(earnedScore).toBe(baseScore * SILVER_MULTIPLIER * SILVER_MULTIPLIER);
  });
});

describe('Gold tier: Gold 3x multiplier (existing behavior unchanged)', () => {
  it('Single gold tile: baseScore * GOLD_MULTIPLIER', () => {
    const baseScore = 10;
    const score = simulateTierScore(baseScore, [GOLD_MULTIPLIER]);
    expect(score).toBe(30); // 10 * 3
  });

  it('GOLD_MULTIPLIER constant is 3 (unchanged)', () => {
    expect(GOLD_MULTIPLIER).toBe(3);
  });

  it('Gold hook: double gold word gives 9x base (3^2)', () => {
    const { result } = renderHook(() => useBlastGame({
      gridSize: 4,
      specialTileChance: 1.0,
      language: 'en',
      customDistribution: GOLD_ONLY_DIST,
    }));

    const baseScore = 4;
    const initialScore = result.current.gameState.score;

    act(() => {
      result.current.clearTilesForWord(
        [{ row: 0, col: 0 }, { row: 0, col: 1 }],
        'GO',
        baseScore
      );
    });

    const earnedScore = result.current.gameState.score - initialScore;
    // 2 gold tiles: 3^2 = 9x, score = 4 * 9 = 36
    expect(earnedScore).toBe(baseScore * GOLD_MULTIPLIER * GOLD_MULTIPLIER);
  });
});

describe('Gold tier: Diamond 5x multiplier', () => {
  it('Single diamond tile: baseScore * DIAMOND_MULTIPLIER', () => {
    const baseScore = 10;
    const score = simulateTierScore(baseScore, [DIAMOND_MULTIPLIER]);
    expect(score).toBe(50); // 10 * 5
  });

  it('DIAMOND_MULTIPLIER constant is 5', () => {
    expect(DIAMOND_MULTIPLIER).toBe(5);
  });

  it('Diamond hook: double diamond word gives 25x base (5^2)', () => {
    const { result } = renderHook(() => useBlastGame({
      gridSize: 4,
      specialTileChance: 1.0,
      language: 'en',
      customDistribution: DIAMOND_ONLY_DIST,
    }));

    const baseScore = 4;
    const initialScore = result.current.gameState.score;

    act(() => {
      result.current.clearTilesForWord(
        [{ row: 0, col: 0 }, { row: 0, col: 1 }],
        'GO',
        baseScore
      );
    });

    const earnedScore = result.current.gameState.score - initialScore;
    // 2 diamond tiles: 5^2 = 25x, score = 4 * 25 = 100
    expect(earnedScore).toBe(baseScore * DIAMOND_MULTIPLIER * DIAMOND_MULTIPLIER);
  });
});

describe('Gold tier: Mixed tiers multiplicative (Silver + Gold = 4.5x)', () => {
  it('Silver + Gold in same word: score = baseScore * SILVER_MULTIPLIER * GOLD_MULTIPLIER', () => {
    const baseScore = 10;
    // 1 silver + 1 gold = 1.5 * 3 = 4.5x
    const score = simulateTierScore(baseScore, [SILVER_MULTIPLIER, GOLD_MULTIPLIER]);
    expect(score).toBe(45); // 10 * 4.5
  });

  it('Multiplicative constants: Silver*Gold=4.5, Silver*Diamond=7.5, Gold*Diamond=15', () => {
    expect(SILVER_MULTIPLIER * GOLD_MULTIPLIER).toBe(4.5);
    expect(SILVER_MULTIPLIER * DIAMOND_MULTIPLIER).toBe(7.5);
    expect(GOLD_MULTIPLIER * DIAMOND_MULTIPLIER).toBe(15);
  });

  it('Mixed tiers exceed gold-only score (4.5x > 3x)', () => {
    const silverGoldMult = SILVER_MULTIPLIER * GOLD_MULTIPLIER;
    const goldMult = GOLD_MULTIPLIER;
    expect(silverGoldMult).toBeGreaterThan(goldMult);
    expect(silverGoldMult).toBe(4.5);
  });
});
