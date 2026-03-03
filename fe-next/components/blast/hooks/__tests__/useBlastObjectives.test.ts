/**
 * useBlastObjectives - Tests for objective progress tracking hook.
 */
import { renderHook, act } from '@testing-library/react';
import { useBlastObjectives } from '../useBlastObjectives';
import type { BlastGameState, BlastTileType } from '../../types';

// Helper to create a minimal game state
function makeGameState(overrides: Partial<BlastGameState> = {}): BlastGameState {
  return {
    score: 0,
    wordsFound: [],
    tilesCleared: 0,
    totalTiles: 36,
    comboCount: 0,
    isComplete: false,
    isDeadEnd: false,
    cascadeChainLevel: 0,
    movesRemaining: 20,
    movesUsed: 0,
    totalMoves: 20,
    bonusMoveScore: 0,
    tileTypeClears: {} as Record<BlastTileType, number>,
    ...overrides,
  };
}

describe('useBlastObjectives', () => {
  describe('score_target objective', () => {
    it('tracks score progress toward target', () => {
      const { result, rerender } = renderHook(
        ({ gameState }) => useBlastObjectives({
          gameState,
          tileTypeClears: {} as Record<BlastTileType, number>,
          waveNumber: 1,
          wordsFound: gameState.wordsFound,
        }),
        { initialProps: { gameState: makeGameState({ score: 10 }) } },
      );

      expect(result.current.objectiveProgress[0].current).toBe(10);
      expect(result.current.objectiveProgress[0].isComplete).toBe(false);

      rerender({ gameState: makeGameState({ score: 25 }) });
      expect(result.current.objectiveProgress[0].current).toBe(25);
      expect(result.current.objectiveProgress[0].isComplete).toBe(true);
    });
  });

  describe('collect_type objective', () => {
    it('tracks cleared tile count for specific type', () => {
      const tileTypeClears = { gem: 2 } as Record<BlastTileType, number>;
      const { result } = renderHook(() =>
        useBlastObjectives({
          gameState: makeGameState(),
          tileTypeClears,
          waveNumber: 2,
          wordsFound: [],
        }),
      );

      // Wave 2: collect_type gem target 3
      expect(result.current.objectiveProgress[0].current).toBe(2);
      expect(result.current.objectiveProgress[0].isComplete).toBe(false);
    });

    it('marks complete when target reached', () => {
      const tileTypeClears = { gem: 3 } as Record<BlastTileType, number>;
      const { result } = renderHook(() =>
        useBlastObjectives({
          gameState: makeGameState(),
          tileTypeClears,
          waveNumber: 2,
          wordsFound: [],
        }),
      );

      expect(result.current.objectiveProgress[0].isComplete).toBe(true);
    });
  });

  describe('clear_all_type objective', () => {
    it('uses tileTypeClears for progress and total from initial tile counts', () => {
      const tileTypeClears = { ice: 3 } as Record<BlastTileType, number>;
      const { result } = renderHook(() =>
        useBlastObjectives({
          gameState: makeGameState(),
          tileTypeClears,
          waveNumber: 3,
          wordsFound: [],
          initialTileTypeCounts: { ice: 5 } as Record<BlastTileType, number>,
        }),
      );

      // clear_all_type ice: cleared 3 of 5
      expect(result.current.objectiveProgress[0].current).toBe(3);
      expect(result.current.objectiveProgress[0].objective.target).toBe(5);
      expect(result.current.objectiveProgress[0].isComplete).toBe(false);
    });

    it('marks complete when all tiles of type are cleared', () => {
      const tileTypeClears = { ice: 5 } as Record<BlastTileType, number>;
      const { result } = renderHook(() =>
        useBlastObjectives({
          gameState: makeGameState(),
          tileTypeClears,
          waveNumber: 3,
          wordsFound: [],
          initialTileTypeCounts: { ice: 5 } as Record<BlastTileType, number>,
        }),
      );

      expect(result.current.objectiveProgress[0].isComplete).toBe(true);
    });
  });

  describe('word_length objective', () => {
    it('counts words meeting minimum length', () => {
      const wordsFound = ['hello', 'world', 'cat', 'ab'];
      const { result } = renderHook(() =>
        useBlastObjectives({
          gameState: makeGameState({ wordsFound }),
          tileTypeClears: {} as Record<BlastTileType, number>,
          waveNumber: 4,
          wordsFound,
        }),
      );

      // Wave 4: word_length target 2, minWordLength 5
      // 'hello' (5) and 'world' (5) qualify
      const wordLenObj = result.current.objectiveProgress.find(
        p => p.objective.type === 'word_length',
      )!;
      expect(wordLenObj.current).toBe(2);
      expect(wordLenObj.isComplete).toBe(true);
    });

    it('does not count short words', () => {
      const wordsFound = ['cat', 'dog', 'bat'];
      const { result } = renderHook(() =>
        useBlastObjectives({
          gameState: makeGameState({ wordsFound }),
          tileTypeClears: {} as Record<BlastTileType, number>,
          waveNumber: 4,
          wordsFound,
        }),
      );

      const wordLenObj = result.current.objectiveProgress.find(
        p => p.objective.type === 'word_length',
      )!;
      expect(wordLenObj.current).toBe(0);
      expect(wordLenObj.isComplete).toBe(false);
    });
  });

  describe('allObjectivesComplete', () => {
    it('returns false when not all objectives are met', () => {
      const { result } = renderHook(() =>
        useBlastObjectives({
          gameState: makeGameState({ score: 5 }),
          tileTypeClears: {} as Record<BlastTileType, number>,
          waveNumber: 1,
          wordsFound: [],
        }),
      );

      expect(result.current.allObjectivesComplete).toBe(false);
    });

    it('returns true when all objectives are met', () => {
      const { result } = renderHook(() =>
        useBlastObjectives({
          gameState: makeGameState({ score: 20 }),
          tileTypeClears: {} as Record<BlastTileType, number>,
          waveNumber: 1,
          wordsFound: [],
        }),
      );

      expect(result.current.allObjectivesComplete).toBe(true);
    });

    it('requires all objectives met for multi-objective waves', () => {
      const tileTypeClears = { ice: 5 } as Record<BlastTileType, number>;
      const { result } = renderHook(() =>
        useBlastObjectives({
          gameState: makeGameState({ score: 30 }),
          tileTypeClears,
          waveNumber: 3,
          wordsFound: [],
          initialTileTypeCounts: { ice: 5 } as Record<BlastTileType, number>,
        }),
      );

      // Wave 3: clear_all_type ice (done) + score_target 40 (NOT done, only 30)
      expect(result.current.allObjectivesComplete).toBe(false);
    });
  });

  describe('objectives list', () => {
    it('returns current wave objectives', () => {
      const { result } = renderHook(() =>
        useBlastObjectives({
          gameState: makeGameState(),
          tileTypeClears: {} as Record<BlastTileType, number>,
          waveNumber: 1,
          wordsFound: [],
        }),
      );

      expect(result.current.objectives).toHaveLength(1);
      expect(result.current.objectives[0].type).toBe('score_target');
    });
  });
});
