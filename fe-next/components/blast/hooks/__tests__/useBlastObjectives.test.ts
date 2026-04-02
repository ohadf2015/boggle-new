/**
 * useBlastObjectives - Tests for objective progress tracking hook.
 *
 * Current wave objectives (from blastWaveConfig.ts):
 * Wave 1: word_length(3, min=3)
 * Wave 2: word_length(2, min=4) + score_target(50)
 * Wave 3: collect_type(bomb, 2) + score_target(80)
 * Wave 4: collect_type(lightning, 2) + word_length(1, min=5)
 * Wave 5: collect_type(diamond, 1) + score_target(120)
 * Wave 6: clear_all_type(frozen) + score_target(150)
 * Wave 7: collect_type(prism, 2) + word_length(2, min=5)
 */
import { renderHook } from '@testing-library/react';
import { useBlastObjectives } from '../useBlastObjectives';
import type { BlastGameState, BlastTileType } from '../../types';

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
    movesRemaining: 25,
    movesUsed: 0,
    totalMoves: 25,
    bonusMoveScore: 0,
    tileTypeClears: {} as Record<BlastTileType, number>,
    ...overrides,
  };
}

describe('useBlastObjectives', () => {
  describe('score_target objective', () => {
    it('tracks score progress toward target', () => {
      // Wave 2 has score_target(50) as second objective
      const wordsFound = ['test'];
      const { result, rerender } = renderHook(
        ({ gameState }) => useBlastObjectives({
          gameState,
          tileTypeClears: {} as Record<BlastTileType, number>,
          waveNumber: 2,
          wordsFound,
        }),
        { initialProps: { gameState: makeGameState({ score: 10, wordsFound }) } },
      );

      const scoreObj = result.current.objectiveProgress.find(p => p.objective.type === 'score_target')!;
      expect(scoreObj.current).toBe(10);
      expect(scoreObj.isComplete).toBe(false);

      rerender({ gameState: makeGameState({ score: 55, wordsFound }) });
      const updated = result.current.objectiveProgress.find(p => p.objective.type === 'score_target')!;
      expect(updated.current).toBe(55);
      expect(updated.isComplete).toBe(true);
    });
  });

  describe('collect_type objective', () => {
    it('tracks cleared tile count for specific type', () => {
      // Wave 3: collect_type bomb target 2
      const tileTypeClears = { bomb: 1 } as Record<BlastTileType, number>;
      const { result } = renderHook(() =>
        useBlastObjectives({
          gameState: makeGameState(),
          tileTypeClears,
          waveNumber: 3,
          wordsFound: [],
        }),
      );

      const collectObj = result.current.objectiveProgress.find(p => p.objective.type === 'collect_type')!;
      expect(collectObj.current).toBe(1);
      expect(collectObj.isComplete).toBe(false);
    });

    it('marks complete when target reached', () => {
      // Wave 3: collect_type bomb target 2
      const tileTypeClears = { bomb: 2 } as Record<BlastTileType, number>;
      const { result } = renderHook(() =>
        useBlastObjectives({
          gameState: makeGameState(),
          tileTypeClears,
          waveNumber: 3,
          wordsFound: [],
        }),
      );

      const collectObj = result.current.objectiveProgress.find(p => p.objective.type === 'collect_type')!;
      expect(collectObj.isComplete).toBe(true);
    });
  });

  describe('clear_all_type objective', () => {
    it('uses tileTypeClears for progress and total from initial tile counts', () => {
      // Wave 6: clear_all_type frozen
      const tileTypeClears = { frozen: 3 } as Record<BlastTileType, number>;
      const { result } = renderHook(() =>
        useBlastObjectives({
          gameState: makeGameState(),
          tileTypeClears,
          waveNumber: 6,
          wordsFound: [],
          initialTileTypeCounts: { frozen: 5 } as Record<BlastTileType, number>,
        }),
      );

      const clearObj = result.current.objectiveProgress.find(p => p.objective.type === 'clear_all_type')!;
      expect(clearObj.current).toBe(3);
      expect(clearObj.objective.target).toBe(5);
      expect(clearObj.isComplete).toBe(false);
    });

    it('marks complete when all tiles of type are cleared', () => {
      const tileTypeClears = { frozen: 5 } as Record<BlastTileType, number>;
      const { result } = renderHook(() =>
        useBlastObjectives({
          gameState: makeGameState(),
          tileTypeClears,
          waveNumber: 6,
          wordsFound: [],
          initialTileTypeCounts: { frozen: 5 } as Record<BlastTileType, number>,
        }),
      );

      const clearObj = result.current.objectiveProgress.find(p => p.objective.type === 'clear_all_type')!;
      expect(clearObj.isComplete).toBe(true);
    });
  });

  describe('word_length objective', () => {
    it('counts words meeting minimum length', () => {
      // Wave 4: collect_type(lightning, 2) + word_length(1, min=5)
      const wordsFound = ['hello', 'world', 'cat', 'ab'];
      const { result } = renderHook(() =>
        useBlastObjectives({
          gameState: makeGameState({ wordsFound }),
          tileTypeClears: {} as Record<BlastTileType, number>,
          waveNumber: 4,
          wordsFound,
        }),
      );

      // 'hello' (5) and 'world' (5) qualify, target is 1
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
      // Wave 1: word_length(3, min=3) — no words found
      const { result } = renderHook(() =>
        useBlastObjectives({
          gameState: makeGameState(),
          tileTypeClears: {} as Record<BlastTileType, number>,
          waveNumber: 1,
          wordsFound: [],
        }),
      );

      expect(result.current.allObjectivesComplete).toBe(false);
    });

    it('returns true when all objectives are met', () => {
      // Wave 1: word_length(3, min=3) — need 3 words of 3+ letters
      const wordsFound = ['cat', 'dog', 'bat'];
      const { result } = renderHook(() =>
        useBlastObjectives({
          gameState: makeGameState({ wordsFound }),
          tileTypeClears: {} as Record<BlastTileType, number>,
          waveNumber: 1,
          wordsFound,
        }),
      );

      expect(result.current.allObjectivesComplete).toBe(true);
    });

    it('requires all objectives met for multi-objective waves', () => {
      // Wave 3: collect_type(bomb, 2) + score_target(80)
      const tileTypeClears = { bomb: 2 } as Record<BlastTileType, number>;
      const { result } = renderHook(() =>
        useBlastObjectives({
          gameState: makeGameState({ score: 30 }),
          tileTypeClears,
          waveNumber: 3,
          wordsFound: [],
        }),
      );

      // bomb objective done, but score 30 < 80
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
      expect(result.current.objectives[0].type).toBe('word_length');
    });
  });
});
