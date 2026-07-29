/**
 * useBlastMultiplayerBridge Tests
 * Converts Zustand multiplayer state into BlastGame-compatible props.
 */

import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBlastMultiplayerBridge } from '../useBlastMultiplayerBridge';
import type { BlastTileOverlay } from '@/shared/types/game';

// Mock Zustand selectors
const mockBlastTileOverlay: BlastTileOverlay[] = [];
const mockBlastSeed: number | null = 42;
const mockBlastWave = 1;
const mockGameLanguage = 'en';
const mockLetterGrid = [
  ['A', 'B', 'C', 'D'],
  ['E', 'F', 'G', 'H'],
  ['I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P'],
];

vi.mock('@/hooks/gameState/store', () => ({
  useBlastTileOverlay: () => mockBlastTileOverlay,
  useBlastSeed: () => mockBlastSeed,
  useBlastWave: () => mockBlastWave,
  useGameLanguage: () => mockGameLanguage,
}));

describe('useBlastMultiplayerBridge', () => {
  it('should return a BlastGameConfig with grid size derived from letter grid', () => {
    const { result } = renderHook(() =>
      useBlastMultiplayerBridge({ letterGrid: mockLetterGrid, gridSize: 4 })
    );

    expect(result.current.config).toBeDefined();
    expect(result.current.config.gridSize).toBe(4);
    expect(result.current.config.language).toBe('en');
  });

  it('should convert BlastTileOverlay[] to BlastTileState[][] initialTileStates', () => {
    const overlay: BlastTileOverlay[] = [
      { row: 0, col: 1, type: 'gold' },
      { row: 2, col: 3, type: 'bomb' },
    ];

    // Temporarily set mock
    (mockBlastTileOverlay as any).length = 0;
    mockBlastTileOverlay.push(...overlay);

    const { result } = renderHook(() =>
      useBlastMultiplayerBridge({ letterGrid: mockLetterGrid, gridSize: 4 })
    );

    const tileStates = result.current.initialTileStates;
    expect(tileStates).not.toBeNull();
    expect(tileStates!.length).toBe(4);
    expect(tileStates![0].length).toBe(4);

    // Gold tile at (0,1)
    expect(tileStates![0][1].type).toBe('gold');
    expect(tileStates![0][1].isCleared).toBe(false);

    // Bomb tile at (2,3)
    expect(tileStates![2][3].type).toBe('bomb');

    // Standard tiles elsewhere
    expect(tileStates![0][0].type).toBe('standard');
    expect(tileStates![1][1].type).toBe('standard');
  });

  it('should pass through blastSeed from store', () => {
    const { result } = renderHook(() =>
      useBlastMultiplayerBridge({ letterGrid: mockLetterGrid, gridSize: 4 })
    );

    expect(result.current.blastSeed).toBe(42);
  });

  it('should return null initialTileStates when letterGrid is null', () => {
    const { result } = renderHook(() =>
      useBlastMultiplayerBridge({ letterGrid: null, gridSize: 4 })
    );

    expect(result.current.initialTileStates).toBeNull();
  });

  it('should assign innerType to frozen tiles using seeded random', () => {
    // GIVEN: overlay with a frozen tile
    const overlay: BlastTileOverlay[] = [
      { row: 1, col: 2, type: 'frozen' },
    ];

    (mockBlastTileOverlay as any).length = 0;
    mockBlastTileOverlay.push(...overlay);

    // WHEN
    const { result } = renderHook(() =>
      useBlastMultiplayerBridge({ letterGrid: mockLetterGrid, gridSize: 4 })
    );

    const frozenTile = result.current.initialTileStates![1][2];

    // THEN: frozen tile should have an innerType from the valid candidates
    expect(frozenTile.type).toBe('frozen');
    expect(frozenTile.innerType).toBeDefined();
    expect(['bomb', 'lightning', 'prism', 'gem', 'rainbow']).toContain(frozenTile.innerType);
  });

  it('should produce deterministic innerType for same seed', () => {
    // GIVEN: overlay with frozen tiles and seed = 42
    const overlay: BlastTileOverlay[] = [
      { row: 0, col: 0, type: 'frozen' },
      { row: 1, col: 1, type: 'frozen' },
    ];

    (mockBlastTileOverlay as any).length = 0;
    mockBlastTileOverlay.push(...overlay);

    // WHEN: render twice with same seed
    const { result: result1 } = renderHook(() =>
      useBlastMultiplayerBridge({ letterGrid: mockLetterGrid, gridSize: 4 })
    );
    const { result: result2 } = renderHook(() =>
      useBlastMultiplayerBridge({ letterGrid: mockLetterGrid, gridSize: 4 })
    );

    // THEN: same innerType values (deterministic)
    expect(result1.current.initialTileStates![0][0].innerType)
      .toBe(result2.current.initialTileStates![0][0].innerType);
    expect(result1.current.initialTileStates![1][1].innerType)
      .toBe(result2.current.initialTileStates![1][1].innerType);
  });

  it('should NOT assign innerType to non-frozen special tiles', () => {
    // GIVEN: overlay with non-frozen specials
    const overlay: BlastTileOverlay[] = [
      { row: 0, col: 0, type: 'bomb' },
      { row: 1, col: 1, type: 'gold' },
    ];

    (mockBlastTileOverlay as any).length = 0;
    mockBlastTileOverlay.push(...overlay);

    // WHEN
    const { result } = renderHook(() =>
      useBlastMultiplayerBridge({ letterGrid: mockLetterGrid, gridSize: 4 })
    );

    // THEN: no innerType on non-frozen tiles
    expect(result.current.initialTileStates![0][0].innerType).toBeUndefined();
    expect(result.current.initialTileStates![1][1].innerType).toBeUndefined();
  });
});
