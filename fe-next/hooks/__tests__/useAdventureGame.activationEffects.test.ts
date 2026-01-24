/**
 * useAdventureGame Activation Effects Tests
 *
 * Tests for visual activation effects when special tiles are used.
 * These effects are one-time animations that play when a word is submitted
 * using special tiles.
 */

import { renderHook, act } from '@testing-library/react';
import { useAdventureGame } from '../useAdventureGame';
import type { LevelConfig, TileActivationEffect } from '@/types/adventure';

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
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const grid: string[][] = [];

  for (let i = 0; i < size; i++) {
    const row: string[] = [];
    for (let j = 0; j < size; j++) {
      row.push(letters[(i * size + j) % letters.length]);
    }
    grid.push(row);
  }

  return grid;
}

// ==============================================
// ICE TILE MELT EFFECT TESTS
// ==============================================

describe('Ice Tile Melt Activation Effect', () => {
  it('should set melt activation effect when ice tile is cleared by adjacent word', () => {
    // GIVEN - Ice tile at (0,1) adjacent to standard tile at (0,0)
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 0, col: 1, type: 'ice' }],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // Verify ice tile has no activation effect initially
    expect(result.current.tiles[0][1].activationEffect).toBeUndefined();

    // WHEN - Use tile at (0,0) which is adjacent to ice at (0,1)
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 }, // Adjacent to ice
        { row: 1, col: 0 },
        { row: 2, col: 0 },
        { row: 3, col: 0 },
      ]);
    });

    // THEN - Ice tile should have melt activation effect
    expect(result.current.tiles[0][1].activationEffect).toBe('melt');
    expect(result.current.tiles[0][1].activationTimestamp).toBeDefined();
  });

  it('should set melt effect on ice tiles cleared by bomb row', () => {
    // GIVEN - Bomb and ice in same row
    const levelConfig = createMockLevelConfig({
      gridSize: 4,
      specialTiles: [
        { row: 1, col: 1, type: 'bomb' },
        { row: 1, col: 3, type: 'ice' },
      ],
    });
    const grid = createMockGrid(4);
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // WHEN - Use bomb tile
    act(() => {
      result.current.submitWordWithPath('TE', 50, [
        { row: 1, col: 0 },
        { row: 1, col: 1 }, // Bomb tile
      ]);
    });

    // THEN - Ice tile in bomb row should have melt effect
    expect(result.current.tiles[1][3].activationEffect).toBe('melt');
  });
});

// ==============================================
// BOMB TILE EXPLODE EFFECT TESTS
// ==============================================

describe('Bomb Tile Explode Activation Effect', () => {
  it('should set explode activation effect when bomb tile is used', () => {
    // GIVEN - Level with bomb tile
    const levelConfig = createMockLevelConfig({
      gridSize: 4,
      specialTiles: [{ row: 1, col: 1, type: 'bomb' }],
    });
    const grid = createMockGrid(4);
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // WHEN - Use bomb tile in word
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 1, col: 0 },
        { row: 1, col: 1 }, // Bomb tile
        { row: 1, col: 2 },
        { row: 1, col: 3 },
      ]);
    });

    // THEN - Bomb tile should have explode activation effect
    expect(result.current.tiles[1][1].activationEffect).toBe('explode');
    expect(result.current.tiles[1][1].activationTimestamp).toBeDefined();
  });
});

// ==============================================
// GOLD TILE COLLECT EFFECT TESTS
// ==============================================

describe('Gold Tile Collect Activation Effect', () => {
  it('should set collect activation effect when gold tile is used', () => {
    // GIVEN - Level with gold tile
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 0, col: 0, type: 'gold' }],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // WHEN - Use gold tile in word
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 }, // Gold tile
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    // THEN - Gold tile should have collect activation effect
    expect(result.current.tiles[0][0].activationEffect).toBe('collect');
    expect(result.current.tiles[0][0].activationTimestamp).toBeDefined();
  });
});

// ==============================================
// RAINBOW TILE WILDCARD EFFECT TESTS
// ==============================================

describe('Rainbow Tile Wildcard Activation Effect', () => {
  it('should set wildcard activation effect when rainbow tile is used', () => {
    // GIVEN - Level with rainbow tile
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 0, col: 0, type: 'rainbow' }],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // WHEN - Use rainbow tile in word
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 }, // Rainbow tile
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    // THEN - Rainbow tile should have wildcard activation effect
    expect(result.current.tiles[0][0].activationEffect).toBe('wildcard');
    expect(result.current.tiles[0][0].activationTimestamp).toBeDefined();
  });
});

// ==============================================
// CHAIN TILE LINK EFFECT TESTS
// ==============================================

describe('Chain Tile Link Activation Effect', () => {
  it('should set link activation effect when chain tile is used', () => {
    // GIVEN - Level with chain tile
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 0, col: 0, type: 'chain' }],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // WHEN - Use chain tile in word
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 }, // Chain tile
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    // THEN - Chain tile should have link activation effect
    expect(result.current.tiles[0][0].activationEffect).toBe('link');
    expect(result.current.tiles[0][0].activationTimestamp).toBeDefined();
  });
});

// ==============================================
// TIME TILE TIME BONUS EFFECT TESTS
// ==============================================

describe('Time Tile TimeBonus Activation Effect', () => {
  it('should set timeBonus activation effect when time tile is used', () => {
    // GIVEN - Level with time tile
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 0, col: 0, type: 'time' }],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // WHEN - Use time tile in word
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 }, // Time tile
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    // THEN - Time tile should have timeBonus activation effect
    expect(result.current.tiles[0][0].activationEffect).toBe('timeBonus');
    expect(result.current.tiles[0][0].activationTimestamp).toBeDefined();
  });
});

// ==============================================
// CLEAR ACTIVATION EFFECTS TESTS
// ==============================================

describe('Clear Activation Effects', () => {
  it('should clear all activation effects when clearActivationEffects is called', () => {
    // GIVEN - Level with multiple special tiles
    const levelConfig = createMockLevelConfig({
      specialTiles: [
        { row: 0, col: 0, type: 'gold' },
        { row: 0, col: 2, type: 'time' },
      ],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // Submit word to trigger activation effects
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 }, // Gold
        { row: 0, col: 1 },
        { row: 0, col: 2 }, // Time
        { row: 0, col: 3 },
      ]);
    });

    // Verify effects are set
    expect(result.current.tiles[0][0].activationEffect).toBe('collect');
    expect(result.current.tiles[0][2].activationEffect).toBe('timeBonus');

    // WHEN - Clear activation effects
    act(() => {
      result.current.clearActivationEffects();
    });

    // THEN - All activation effects should be cleared
    expect(result.current.tiles[0][0].activationEffect).toBeNull();
    expect(result.current.tiles[0][2].activationEffect).toBeNull();
    expect(result.current.tiles[0][0].activationTimestamp).toBeUndefined();
    expect(result.current.tiles[0][2].activationTimestamp).toBeUndefined();
  });

  it('should clear previous activation effects when new word is submitted', () => {
    // GIVEN - Level with gold tile
    const levelConfig = createMockLevelConfig({
      specialTiles: [
        { row: 0, col: 0, type: 'gold' },
        { row: 1, col: 0, type: 'rainbow' },
      ],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // Submit first word to trigger gold activation
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 }, // Gold
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    expect(result.current.tiles[0][0].activationEffect).toBe('collect');

    // WHEN - Submit second word with rainbow tile
    act(() => {
      result.current.submitWordWithPath('WORD', 100, [
        { row: 1, col: 0 }, // Rainbow
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 1, col: 3 },
      ]);
    });

    // THEN - Gold tile effect should be cleared, rainbow effect should be set
    expect(result.current.tiles[0][0].activationEffect).toBeNull();
    expect(result.current.tiles[1][0].activationEffect).toBe('wildcard');
  });
});

// ==============================================
// MULTIPLE EFFECTS TESTS
// ==============================================

describe('Multiple Activation Effects', () => {
  it('should set activation effects on all special tiles used in the same word', () => {
    // GIVEN - Level with gold, time, and rainbow in path
    const levelConfig = createMockLevelConfig({
      specialTiles: [
        { row: 0, col: 0, type: 'gold' },
        { row: 0, col: 1, type: 'time' },
        { row: 0, col: 2, type: 'rainbow' },
      ],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // WHEN - Use all special tiles in word
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 }, // Gold
        { row: 0, col: 1 }, // Time
        { row: 0, col: 2 }, // Rainbow
        { row: 0, col: 3 },
      ]);
    });

    // THEN - All special tiles should have their respective activation effects
    expect(result.current.tiles[0][0].activationEffect).toBe('collect');
    expect(result.current.tiles[0][1].activationEffect).toBe('timeBonus');
    expect(result.current.tiles[0][2].activationEffect).toBe('wildcard');

    // All should have the same timestamp (set in same word submission)
    const timestamp = result.current.tiles[0][0].activationTimestamp;
    expect(result.current.tiles[0][1].activationTimestamp).toBe(timestamp);
    expect(result.current.tiles[0][2].activationTimestamp).toBe(timestamp);
  });

  it('should not set activation effects on standard tiles', () => {
    // GIVEN - Level with one gold tile and standard tiles
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 0, col: 0, type: 'gold' }],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // WHEN - Use gold tile and standard tiles in word
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 }, // Gold
        { row: 0, col: 1 }, // Standard
        { row: 0, col: 2 }, // Standard
        { row: 0, col: 3 }, // Standard
      ]);
    });

    // THEN - Only gold tile should have activation effect
    expect(result.current.tiles[0][0].activationEffect).toBe('collect');
    expect(result.current.tiles[0][1].activationEffect).toBeNull();
    expect(result.current.tiles[0][2].activationEffect).toBeNull();
    expect(result.current.tiles[0][3].activationEffect).toBeNull();
  });
});

// ==============================================
// RESET GAME TESTS
// ==============================================

describe('Reset Game Clears Activation Effects', () => {
  it('should clear all activation effects when game is reset', () => {
    // GIVEN - Level with gold tile
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 0, col: 0, type: 'gold' }],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // Submit word to trigger activation effects
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 }, // Gold
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    expect(result.current.tiles[0][0].activationEffect).toBe('collect');

    // WHEN - Reset the game
    act(() => {
      result.current.resetGame();
    });

    // THEN - Activation effects should be cleared (tiles reinitalized)
    expect(result.current.tiles[0][0].activationEffect).toBeUndefined();
    expect(result.current.gameState.score).toBe(0);
  });
});
