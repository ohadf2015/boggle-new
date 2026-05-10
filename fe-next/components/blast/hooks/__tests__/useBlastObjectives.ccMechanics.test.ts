import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useBlastObjectives } from '../useBlastObjectives';
import type { BlastGameState, BlastTileType, BlastObjective } from '../../types';
import type { BlastTileState } from '@/shared/types/blast';

const makeGameState = (overrides: Partial<BlastGameState> = {}): BlastGameState => ({
  score: 0, wordsFound: [], tilesCleared: 0, totalTiles: 36,
  comboCount: 0, isComplete: false, isDeadEnd: false, cascadeChainLevel: 0,
  movesRemaining: 25, movesUsed: 0, totalMoves: 25, bonusMoveScore: 0,
  tileTypeClears: {} as Record<BlastTileType, number>, ...overrides,
});

const cell = (overrides: Partial<BlastTileState>): BlastTileState => ({
  uid: 'u', row: 0, col: 0, type: 'standard', isCleared: false,
  activationEffect: null, hitsRemaining: 1, ...overrides,
});

describe('useBlastObjectives — clear_jelly', () => {
  it('current = initialJellyCount - remaining, isComplete when remaining = 0', () => {
    const objectives: BlastObjective[] = [{ type: 'clear_jelly', target: 4 }];
    const tileStates: BlastTileState[][] = [[
      cell({ uid: 'a', jellyLayers: 1 }),
      cell({ uid: 'b', row: 0, col: 1, jellyLayers: 1 }),
    ]];
    const { result } = renderHook(() => useBlastObjectives({
      gameState: makeGameState(), tileTypeClears: {} as Record<BlastTileType, number>,
      objectives, wordsFound: [], tileStates, initialJellyCount: 4,
    }));
    const p = result.current.objectiveProgress[0];
    expect(p.current).toBe(2);
    expect(p.isComplete).toBe(false);
  });

  it('isComplete when no jelly remains', () => {
    const objectives: BlastObjective[] = [{ type: 'clear_jelly', target: 2 }];
    const tileStates: BlastTileState[][] = [[cell({ uid: 'a' })]];
    const { result } = renderHook(() => useBlastObjectives({
      gameState: makeGameState(), tileTypeClears: {} as Record<BlastTileType, number>,
      objectives, wordsFound: [], tileStates, initialJellyCount: 2,
    }));
    expect(result.current.objectiveProgress[0].current).toBe(2);
    expect(result.current.objectiveProgress[0].isComplete).toBe(true);
  });

  it('handles missing tileStates gracefully (current=0)', () => {
    const objectives: BlastObjective[] = [{ type: 'clear_jelly', target: 4 }];
    const { result } = renderHook(() => useBlastObjectives({
      gameState: makeGameState(), tileTypeClears: {} as Record<BlastTileType, number>,
      objectives, wordsFound: [],
    }));
    expect(result.current.objectiveProgress[0].current).toBe(0);
  });
});
