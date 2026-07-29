/**
 * Tests for Power-Up Effect Functions (TDD)
 *
 * Tests pure effect functions for Freeze Time, Hint, and Score Multiplier.
 * Each power-up has distinct behavior that modifies game state.
 */

import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  applyFreezeTime,
  applyHint,
  applyScoreMultiplier,
  usePowerUpEffects,
} from '../usePowerUpEffects';
import type { TileState } from '../../types/adventure';

describe('applyFreezeTime', () => {
  it('should extend time by 10 seconds when well below cap', () => {
    // GIVEN
    const timeRemaining = 45;
    const totalTime = 90;

    // WHEN
    const result = applyFreezeTime(timeRemaining, totalTime);

    // THEN
    expect(result).toBe(55);
  });

  it('should cap time at totalTime when extension would exceed', () => {
    // GIVEN
    const timeRemaining = 85;
    const totalTime = 90;

    // WHEN
    const result = applyFreezeTime(timeRemaining, totalTime);

    // THEN
    expect(result).toBe(90); // Capped at totalTime
  });

  it('should not reduce time when already at max', () => {
    // GIVEN
    const timeRemaining = 90;
    const totalTime = 90;

    // WHEN
    const result = applyFreezeTime(timeRemaining, totalTime);

    // THEN
    expect(result).toBe(90); // No change
  });

  it('should handle low time remaining', () => {
    // GIVEN
    const timeRemaining = 5;
    const totalTime = 60;

    // WHEN
    const result = applyFreezeTime(timeRemaining, totalTime);

    // THEN
    expect(result).toBe(15);
  });
});

describe('applyHint', () => {
  // Helper to create simple tile grid
  const createTile = (letter: string, row: number, col: number): TileState => ({
    letter,
    type: 'standard',
    isCleared: false,
  });

  it('should find and return a valid unfound word with tile positions', () => {
    // GIVEN: Simple 3x3 grid with "CAT" horizontally
    const tiles: TileState[][] = [
      [createTile('C', 0, 0), createTile('A', 0, 1), createTile('T', 0, 2)],
      [createTile('X', 1, 0), createTile('Y', 1, 1), createTile('Z', 1, 2)],
      [createTile('Q', 2, 0), createTile('W', 2, 1), createTile('E', 2, 2)],
    ];
    const wordsFound: string[] = [];
    const dictionary = new Set(['CAT', 'AXE']);

    // WHEN
    const result = applyHint(tiles, wordsFound, dictionary);

    // THEN
    expect(result).not.toBeNull();
    expect(result?.word).toBe('CAT');
    expect(result?.tiles).toHaveLength(3);
    expect(result?.tiles[0]).toEqual({ row: 0, col: 0 });
    expect(result?.tiles[1]).toEqual({ row: 0, col: 1 });
    expect(result?.tiles[2]).toEqual({ row: 0, col: 2 });
  });

  it('should exclude already-found words from candidates', () => {
    // GIVEN
    const tiles: TileState[][] = [
      [createTile('C', 0, 0), createTile('A', 0, 1), createTile('T', 0, 2)],
      [createTile('D', 1, 0), createTile('O', 1, 1), createTile('G', 1, 2)],
      [createTile('Q', 2, 0), createTile('W', 2, 1), createTile('E', 2, 2)],
    ];
    const wordsFound = ['CAT']; // CAT already found
    const dictionary = new Set(['CAT', 'DOG']);

    // WHEN
    const result = applyHint(tiles, wordsFound, dictionary);

    // THEN
    expect(result).not.toBeNull();
    expect(result?.word).toBe('DOG'); // Should return DOG, not CAT
  });

  it('should prioritize longer words over shorter words', () => {
    // GIVEN: Grid with both "CAT" (3 letters) and "CATS" (4 letters) as adjacent paths
    // C-A-T horizontally, and C-A-T-S continuing
    const tiles: TileState[][] = [
      [createTile('C', 0, 0), createTile('A', 0, 1), createTile('T', 0, 2), createTile('S', 0, 3)],
      [createTile('X', 1, 0), createTile('Y', 1, 1), createTile('Z', 1, 2), createTile('R', 1, 3)],
      [createTile('Q', 2, 0), createTile('W', 2, 1), createTile('E', 2, 2), createTile('M', 2, 3)],
    ];
    const wordsFound: string[] = [];
    const dictionary = new Set(['CAT', 'CATS']); // Both valid

    // WHEN
    const result = applyHint(tiles, wordsFound, dictionary);

    // THEN
    expect(result).not.toBeNull();
    expect(result?.word).toBe('CATS'); // Should prioritize longer word (4 letters vs 3)
  });

  it('should return null when all words are found', () => {
    // GIVEN
    const tiles: TileState[][] = [
      [createTile('C', 0, 0), createTile('A', 0, 1), createTile('T', 0, 2)],
      [createTile('X', 1, 0), createTile('Y', 1, 1), createTile('Z', 1, 2)],
      [createTile('Q', 2, 0), createTile('W', 2, 1), createTile('E', 2, 2)],
    ];
    const wordsFound = ['CAT']; // All words found
    const dictionary = new Set(['CAT']);

    // WHEN
    const result = applyHint(tiles, wordsFound, dictionary);

    // THEN
    expect(result).toBeNull();
  });

  it('should return null when no valid words exist on board', () => {
    // GIVEN
    const tiles: TileState[][] = [
      [createTile('X', 0, 0), createTile('Y', 0, 1), createTile('Z', 0, 2)],
      [createTile('Q', 1, 0), createTile('W', 1, 1), createTile('R', 1, 2)],
      [createTile('P', 2, 0), createTile('L', 2, 1), createTile('K', 2, 2)],
    ];
    const wordsFound: string[] = [];
    const dictionary = new Set(['CAT', 'DOG']);

    // WHEN
    const result = applyHint(tiles, wordsFound, dictionary);

    // THEN
    expect(result).toBeNull();
  });

  it('should handle diagonal word paths', () => {
    // GIVEN: Grid with "CAT" diagonally
    const tiles: TileState[][] = [
      [createTile('C', 0, 0), createTile('X', 0, 1), createTile('Y', 0, 2)],
      [createTile('Z', 1, 0), createTile('A', 1, 1), createTile('Q', 1, 2)],
      [createTile('W', 2, 0), createTile('R', 2, 1), createTile('T', 2, 2)],
    ];
    const wordsFound: string[] = [];
    const dictionary = new Set(['CAT']);

    // WHEN
    const result = applyHint(tiles, wordsFound, dictionary);

    // THEN
    expect(result).not.toBeNull();
    expect(result?.word).toBe('CAT');
    expect(result?.tiles).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 1 },
      { row: 2, col: 2 },
    ]);
  });

  it('should handle empty grid gracefully', () => {
    // GIVEN
    const tiles: TileState[][] = [];
    const wordsFound: string[] = [];
    const dictionary = new Set(['CAT']);

    // WHEN
    const result = applyHint(tiles, wordsFound, dictionary);

    // THEN
    expect(result).toBeNull();
  });
});

describe('applyScoreMultiplier', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-30T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return 2x multiplier with 30s expiration', () => {
    // GIVEN
    const now = Date.now(); // 2025-01-30T12:00:00Z

    // WHEN
    const result = applyScoreMultiplier();

    // THEN
    expect(result.multiplier).toBe(2);
    expect(result.expiresAt).toBe(now + 30000); // 30 seconds in future
  });

  it('should create new timestamp on each activation', () => {
    // GIVEN
    const firstActivation = applyScoreMultiplier();

    // Advance time by 5 seconds
    vi.advanceTimersByTime(5000);

    // WHEN
    const secondActivation = applyScoreMultiplier();

    // THEN
    expect(secondActivation.expiresAt).toBeGreaterThan(firstActivation.expiresAt);
    expect(secondActivation.expiresAt - firstActivation.expiresAt).toBe(5000);
  });
});

describe('usePowerUpEffects hook', () => {
  // Mock game state
  const mockGameState = {
    tiles: [
      [
        { letter: 'C', type: 'standard' as const, isCleared: false },
        { letter: 'A', type: 'standard' as const, isCleared: false },
        { letter: 'T', type: 'standard' as const, isCleared: false },
      ],
    ],
    wordsFound: [] as string[],
    cascadeActive: false,
    timeRemaining: 45,
    totalTime: 90,
  };

  const mockDictionary = new Set(['CAT']);

  it('should return effect activation functions', () => {
    // WHEN
    const { result } = renderHook(() =>
      usePowerUpEffects(mockGameState, mockDictionary)
    );

    // THEN
    expect(result.current.activateFreezeTime).toBeDefined();
    expect(result.current.activateHint).toBeDefined();
    expect(result.current.activateScoreMultiplier).toBeDefined();
    expect(typeof result.current.activateFreezeTime).toBe('function');
    expect(typeof result.current.activateHint).toBe('function');
    expect(typeof result.current.activateScoreMultiplier).toBe('function');
  });

  it('should block all effects when cascade is active', () => {
    // GIVEN
    const cascadingState = { ...mockGameState, cascadeActive: true };

    // WHEN
    const { result } = renderHook(() =>
      usePowerUpEffects(cascadingState, mockDictionary)
    );

    // THEN
    expect(result.current.activateFreezeTime()).toBe(false);
    expect(result.current.activateHint()).toBe(false);
    expect(result.current.activateScoreMultiplier()).toBe(false);
  });

  it('should allow effects when cascade is not active', () => {
    // GIVEN
    const activeState = { ...mockGameState, cascadeActive: false };

    // WHEN
    const { result } = renderHook(() =>
      usePowerUpEffects(activeState, mockDictionary)
    );

    // THEN
    const freezeResult = result.current.activateFreezeTime();
    expect(freezeResult).not.toBe(false);
    expect(freezeResult).toHaveProperty('timeRemaining');
  });
});
