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

const cakeAnchor = (uid: string, hp: number): BlastTileState => ({
  uid: `${uid}-anchor`, row: 0, col: 0, type: 'cake', isCleared: false,
  activationEffect: null, hitsRemaining: 1, cakeAnchorUid: uid, cakeHp: hp,
});

describe('useBlastObjectives — kill_cake', () => {
  it('current = maxHp - hp; isComplete when hp=0', () => {
    const objectives: BlastObjective[] = [{ type: 'kill_cake', target: 5 }];
    const tileStates: BlastTileState[][] = [[cakeAnchor('cake-1', 3)]];
    const { result } = renderHook(() => useBlastObjectives({
      gameState: makeGameState(), tileTypeClears: {} as Record<BlastTileType, number>,
      objectives, wordsFound: [], tileStates,
    }));
    const p = result.current.objectiveProgress[0];
    expect(p.current).toBe(2);
    expect(p.isComplete).toBe(false);
  });

  it('isComplete when hp reaches 0', () => {
    const objectives: BlastObjective[] = [{ type: 'kill_cake', target: 5 }];
    const tileStates: BlastTileState[][] = [[cakeAnchor('cake-1', 0)]];
    const { result } = renderHook(() => useBlastObjectives({
      gameState: makeGameState(), tileTypeClears: {} as Record<BlastTileType, number>,
      objectives, wordsFound: [], tileStates,
    }));
    expect(result.current.objectiveProgress[0].isComplete).toBe(true);
  });

  it('current=0 when no cake on board', () => {
    const objectives: BlastObjective[] = [{ type: 'kill_cake', target: 5 }];
    const { result } = renderHook(() => useBlastObjectives({
      gameState: makeGameState(), tileTypeClears: {} as Record<BlastTileType, number>,
      objectives, wordsFound: [],
    }));
    expect(result.current.objectiveProgress[0].current).toBe(0);
  });
});
