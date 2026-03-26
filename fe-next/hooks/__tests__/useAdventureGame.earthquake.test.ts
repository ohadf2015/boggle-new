/**
 * Tests for useAdventureGame REGENERATE_GRID action
 * Used during earthquake fire-round to replace the grid mid-game.
 */
import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdventureGame } from '../useAdventureGame';
import type { LevelConfig } from '@/types/adventure';

const mockLevelConfig: LevelConfig = {
  world: 1,
  level: 1,
  gridSize: 4,
  timerSeconds: 90,
  objectives: [
    { type: 'wordCount', target: 5, isPrimary: true },
  ],
  specialTiles: [],
  difficulty: 'EASY',
  chapterNumber: 1,
  levelInChapter: 1,
  isBossLevel: false,
};

const mockGrid = [
  ['C', 'A', 'T', 'S'],
  ['D', 'O', 'G', 'E'],
  ['B', 'I', 'R', 'D'],
  ['F', 'I', 'S', 'H'],
];

const newGrid = [
  ['X', 'Y', 'Z', 'W'],
  ['P', 'Q', 'R', 'S'],
  ['L', 'M', 'N', 'O'],
  ['G', 'H', 'I', 'J'],
];

describe('useAdventureGame - REGENERATE_GRID (earthquake)', () => {
  it('should expose regenerateGrid method', () => {
    const { result } = renderHook(() =>
      useAdventureGame({
        levelConfig: mockLevelConfig,
        initialGrid: mockGrid,
      })
    );

    expect(result.current.regenerateGrid).toBeDefined();
    expect(typeof result.current.regenerateGrid).toBe('function');
  });

  it('should replace tiles with new grid letters', () => {
    const { result } = renderHook(() =>
      useAdventureGame({
        levelConfig: mockLevelConfig,
        initialGrid: mockGrid,
      })
    );

    // Verify initial grid
    expect(result.current.tiles[0][0].letter).toBe('C');
    expect(result.current.tiles[1][1].letter).toBe('O');

    // Regenerate grid
    act(() => {
      result.current.regenerateGrid(newGrid);
    });

    // Verify new grid letters
    expect(result.current.tiles[0][0].letter).toBe('X');
    expect(result.current.tiles[0][1].letter).toBe('Y');
    expect(result.current.tiles[1][0].letter).toBe('P');
    expect(result.current.tiles[1][1].letter).toBe('Q');
  });

  it('should increment tilesVersion after regeneration', () => {
    const { result } = renderHook(() =>
      useAdventureGame({
        levelConfig: mockLevelConfig,
        initialGrid: mockGrid,
      })
    );

    const initialVersion = result.current.tilesVersion;

    act(() => {
      result.current.regenerateGrid(newGrid);
    });

    expect(result.current.tilesVersion).toBe(initialVersion + 1);
  });

  it('should preserve score after grid regeneration', () => {
    const { result } = renderHook(() =>
      useAdventureGame({
        levelConfig: mockLevelConfig,
        initialGrid: mockGrid,
      })
    );

    // Start game and submit a word to accumulate score
    act(() => {
      result.current.startGame();
    });
    act(() => {
      result.current.submitWord('CAT', 10);
    });

    const scoreBefore = result.current.gameState.score;
    expect(scoreBefore).toBe(10);

    // Regenerate grid
    act(() => {
      result.current.regenerateGrid(newGrid);
    });

    // Score should be preserved
    expect(result.current.gameState.score).toBe(10);
  });

  it('should preserve wordsFound after grid regeneration', () => {
    const { result } = renderHook(() =>
      useAdventureGame({
        levelConfig: mockLevelConfig,
        initialGrid: mockGrid,
      })
    );

    act(() => {
      result.current.startGame();
    });
    act(() => {
      result.current.submitWord('CAT', 10);
    });

    expect(result.current.gameState.wordsFound).toContain('CAT');

    act(() => {
      result.current.regenerateGrid(newGrid);
    });

    expect(result.current.gameState.wordsFound).toContain('CAT');
  });

  it('should preserve comboCount after grid regeneration', () => {
    vi.useFakeTimers();

    const { result } = renderHook(() =>
      useAdventureGame({
        levelConfig: mockLevelConfig,
        initialGrid: mockGrid,
      })
    );

    act(() => {
      result.current.startGame();
    });
    act(() => {
      result.current.submitWord('CAT', 10);
    });
    act(() => {
      result.current.submitWord('DOG', 10);
    });

    const comboBefore = result.current.gameState.comboCount;
    expect(comboBefore).toBe(2);

    act(() => {
      result.current.regenerateGrid(newGrid);
    });

    expect(result.current.gameState.comboCount).toBe(2);

    vi.useRealTimers();
  });

  it('should create standard tiles (no special types) in regenerated grid', () => {
    const { result } = renderHook(() =>
      useAdventureGame({
        levelConfig: {
          ...mockLevelConfig,
          specialTiles: [{ row: 0, col: 0, type: 'gold' }],
        },
        initialGrid: mockGrid,
      })
    );

    // Initial grid has a gold tile
    expect(result.current.tiles[0][0].type).toBe('gold');

    act(() => {
      result.current.regenerateGrid(newGrid);
    });

    // All regenerated tiles should be standard
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        expect(result.current.tiles[r][c].type).toBe('standard');
        expect(result.current.tiles[r][c].isFrozen).toBe(false);
        expect(result.current.tiles[r][c].isCleared).toBe(false);
      }
    }
  });

  it('should preserve isPlaying state after grid regeneration', () => {
    const { result } = renderHook(() =>
      useAdventureGame({
        levelConfig: mockLevelConfig,
        initialGrid: mockGrid,
      })
    );

    act(() => {
      result.current.startGame();
    });

    expect(result.current.isPlaying).toBe(true);

    act(() => {
      result.current.regenerateGrid(newGrid);
    });

    expect(result.current.isPlaying).toBe(true);
  });
});
