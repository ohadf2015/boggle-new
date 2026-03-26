/**
 * Integration test for ice tile clearing in Adventure Mode
 *
 * This test verifies the complete flow of ice tile clearing:
 * 1. Ice tiles start frozen
 * 2. Selecting tiles adjacent to ice does NOT clear ice until word is submitted
 * 3. Submitting word with path adjacent to ice DOES melt the ice tile
 * 4. Melted ice tiles become standard tiles (type='standard', isFrozen=false)
 *    so they can be selected and used in words
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdventureGame } from '../useAdventureGame';
import type { LevelConfig } from '@/types/adventure';

// ==============================================
// TEST FIXTURES
// ==============================================

function createMockLevelConfig(overrides?: Partial<LevelConfig>): LevelConfig {
  return {
    world: 1,
    level: 1,
    gridSize: 4,
    timerSeconds: 120,
    objectives: [
      { type: 'wordCount', target: 5, isPrimary: true },
      { type: 'clearIce', target: 1, isPrimary: false },
    ],
    specialTiles: [],
    difficulty: 'EASY',
    chapterNumber: 1,
    levelInChapter: 1,
    isBossLevel: false,
    ...overrides,
  };
}

function createMockGrid(size: number = 4): string[][] {
  // Create a simple grid: A B C D / E F G H / I J K L / M N O P
  const letters = 'ABCDEFGHIJKLMNOP';
  const grid: string[][] = [];

  for (let i = 0; i < size; i++) {
    const row: string[] = [];
    for (let j = 0; j < size; j++) {
      row.push(letters[i * size + j]);
    }
    grid.push(row);
  }

  return grid;
}

// ==============================================
// TESTS
// ==============================================

describe('Ice Tile Clearing - Complete Flow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should NOT clear ice tile when just initializing (ice should be frozen)', () => {
    // GIVEN - Grid with ice tile at position (0,1) - adjacent to (0,0)
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 0, col: 1, type: 'ice' }],
    });
    const grid = createMockGrid(4);

    // WHEN
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // THEN - Ice tile should be frozen and NOT cleared
    const iceTile = result.current.tiles[0][1];
    expect(iceTile.type).toBe('ice');
    expect(iceTile.isFrozen).toBe(true);
    expect(iceTile.isCleared).toBe(false);
  });

  it('should clear ice tile when submitting word with adjacent tiles', () => {
    // GIVEN - Grid with ice tile at (0,1)
    // Grid layout:
    //   A  ICE  C   D     <- Ice at (0,1)
    //   E   F   G   H
    //   I   J   K   L
    //   M   N   O   P
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 0, col: 1, type: 'ice' }],
    });
    const grid = createMockGrid(4);

    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // Verify ice is frozen initially
    expect(result.current.tiles[0][1].isFrozen).toBe(true);
    expect(result.current.tiles[0][1].isCleared).toBe(false);

    // WHEN - Submit a word using tile (0,0) which is adjacent to ice at (0,1)
    // Path: (0,0) -> (1,0) -> (2,0) -> (3,0) = A-E-I-M
    act(() => {
      result.current.submitWordWithPath('AEIM', 100, [
        { row: 0, col: 0 }, // A - adjacent to ice at (0,1)
        { row: 1, col: 0 }, // E
        { row: 2, col: 0 }, // I
        { row: 3, col: 0 }, // M
      ]);
    });

    // THEN - Ice tile should become standard (melted) and unfrozen
    const iceTileAfter = result.current.tiles[0][1];
    expect(iceTileAfter.type).toBe('standard'); // Melted ice becomes standard
    expect(iceTileAfter.isFrozen).toBe(false);
    expect(iceTileAfter.isCleared).toBe(false); // NOT cleared - so it's selectable!

    // And clearIce objective should be updated
    const clearIceObjective = result.current.objectives.find(
      (o) => o.type === 'clearIce'
    );
    expect(clearIceObjective?.current).toBe(1);
  });

  it('should clear ice tile when path includes diagonal adjacency', () => {
    // GIVEN - Grid with ice tile at (1,1)
    // Grid layout:
    //   A   B   C   D
    //   E  ICE  G   H     <- Ice at (1,1)
    //   I   J   K   L
    //   M   N   O   P
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 1, col: 1, type: 'ice' }],
    });
    const grid = createMockGrid(4);

    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // WHEN - Submit word using (0,0) which is diagonally adjacent to ice at (1,1)
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 }, // A - diagonal to ice at (1,1)
        { row: 0, col: 1 }, // B
        { row: 0, col: 2 }, // C
        { row: 0, col: 3 }, // D
      ]);
    });

    // THEN - Ice tile should become standard (A is diagonal neighbor of ice at (1,1))
    const iceTileAfter = result.current.tiles[1][1];
    expect(iceTileAfter.type).toBe('standard'); // Melted ice becomes standard
    expect(iceTileAfter.isFrozen).toBe(false);
    expect(iceTileAfter.isCleared).toBe(false); // NOT cleared - so it's selectable!
  });

  it('should NOT clear ice tile when path is NOT adjacent', () => {
    // GIVEN - Grid with ice tile at (3,3) - far corner
    // Grid layout:
    //   A   B   C   D
    //   E   F   G   H
    //   I   J   K   L
    //   M   N   O  ICE    <- Ice at (3,3)
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 3, col: 3, type: 'ice' }],
    });
    const grid = createMockGrid(4);

    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // WHEN - Submit word using tiles NOT adjacent to ice
    // Path: (0,0) -> (0,1) -> (0,2) -> (0,3) = A-B-C-D
    act(() => {
      result.current.submitWordWithPath('ABCD', 100, [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    // THEN - Ice tile should NOT be cleared
    const iceTileAfter = result.current.tiles[3][3];
    expect(iceTileAfter.isCleared).toBe(false);
    expect(iceTileAfter.isFrozen).toBe(true);
  });

  it('should clear multiple ice tiles when path is adjacent to multiple', () => {
    // GIVEN - Grid with two ice tiles at (0,1) and (1,0)
    // Grid layout:
    //   A  ICE   C   D    <- Ice at (0,1)
    //  ICE  F    G   H    <- Ice at (1,0)
    //   I   J    K   L
    //   M   N    O   P
    const levelConfig = createMockLevelConfig({
      specialTiles: [
        { row: 0, col: 1, type: 'ice' },
        { row: 1, col: 0, type: 'ice' },
      ],
      objectives: [
        { type: 'wordCount', target: 5, isPrimary: true },
        { type: 'clearIce', target: 2, isPrimary: false },
      ],
    });
    const grid = createMockGrid(4);

    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // Verify both ice tiles are frozen
    expect(result.current.tiles[0][1].isFrozen).toBe(true);
    expect(result.current.tiles[1][0].isFrozen).toBe(true);

    // WHEN - Submit word using (0,0) which is adjacent to BOTH ice tiles
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 }, // A - adjacent to both ice tiles
        { row: 1, col: 1 }, // F
        { row: 2, col: 2 }, // K
        { row: 3, col: 3 }, // P
      ]);
    });

    // THEN - Both ice tiles should become standard (melted)
    expect(result.current.tiles[0][1].type).toBe('standard');
    expect(result.current.tiles[0][1].isFrozen).toBe(false);
    expect(result.current.tiles[0][1].isCleared).toBe(false); // Selectable!
    expect(result.current.tiles[1][0].type).toBe('standard');
    expect(result.current.tiles[1][0].isFrozen).toBe(false);
    expect(result.current.tiles[1][0].isCleared).toBe(false); // Selectable!

    // And clearIce objective should show 2
    const clearIceObjective = result.current.objectives.find(
      (o) => o.type === 'clearIce'
    );
    expect(clearIceObjective?.current).toBe(2);
  });

  it('should return different tile references after ice is cleared (for React re-render)', () => {
    // GIVEN
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 0, col: 1, type: 'ice' }],
    });
    const grid = createMockGrid(4);

    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // Store references to tiles BEFORE clearing
    const tilesBefore = result.current.tiles;
    const iceTileBefore = tilesBefore[0][1];

    // WHEN
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 },
        { row: 1, col: 0 },
        { row: 2, col: 0 },
        { row: 3, col: 0 },
      ]);
    });

    // THEN - Tile references should be different (new objects created)
    const tilesAfter = result.current.tiles;
    const iceTileAfter = tilesAfter[0][1];

    // The tiles array reference should be different
    expect(tilesAfter).not.toBe(tilesBefore);
    // The ice tile object reference should be different
    expect(iceTileAfter).not.toBe(iceTileBefore);
    // The ice tile should now be standard (melted) and selectable
    expect(iceTileAfter.type).toBe('standard');
    expect(iceTileAfter.isFrozen).toBe(false);
    expect(iceTileAfter.isCleared).toBe(false); // NOT cleared - selectable!
  });
});
