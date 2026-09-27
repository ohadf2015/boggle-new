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

const choc = (row: number, col: number): BlastTileState => ({
  uid: `c-${row}-${col}`, row, col, type: 'chocolate', isCleared: false,
  activationEffect: null, hitsRemaining: 1,
});

const std = (row: number, col: number): BlastTileState => ({
  uid: `s-${row}-${col}`, row, col, type: 'standard', isCleared: false,
  activationEffect: null, hitsRemaining: 1,
});

describe('useBlastObjectives — stop_chocolate', () => {
  it('isComplete=false while chocolate present', () => {
    const objectives: BlastObjective[] = [{ type: 'stop_chocolate', target: 0 }];
    const tileStates = [[choc(0, 0), std(0, 1)]];
    const { result } = renderHook(() => useBlastObjectives({
      gameState: makeGameState(), tileTypeClears: {} as Record<BlastTileType, number>,
      objectives, wordsFound: [], tileStates,
    }));
    expect(result.current.objectiveProgress[0].isComplete).toBe(false);
  });

  it('isComplete=true when all chocolate cleared', () => {
    const objectives: BlastObjective[] = [{ type: 'stop_chocolate', target: 0 }];
    const tileStates = [[std(0, 0), std(0, 1)]];
    const { result } = renderHook(() => useBlastObjectives({
      gameState: makeGameState(), tileTypeClears: {} as Record<BlastTileType, number>,
      objectives, wordsFound: [], tileStates,
    }));
    expect(result.current.objectiveProgress[0].isComplete).toBe(true);
  });
});
