import { useCallback, useMemo, useReducer } from 'react';
import { validateAndScoreMove } from '../moveValidator';
import { scoreWordChips } from '../scoring';
import { remaining, type SupportedLocale } from '../tileBag';
import { runReducer, buildInitialRunState } from './runReducer';
import { applyCardEffects, type WordScore } from './cardEffects';
import type { ScoreContext } from './powerCards';

export interface UseWordCraftRunOptions {
  seed?: number;
  dict: Set<string> | null;
  locale?: SupportedLocale;
  boardSize?: 7 | 9;
}

export function useWordCraftRun({
  seed = 1,
  dict,
  locale = 'en',
  boardSize = 7,
}: UseWordCraftRunOptions) {
  const initArg = useMemo(() => ({ seed, locale, boardSize }), [seed, locale, boardSize]);
  const [state, dispatch] = useReducer(runReducer, initArg, buildInitialRunState);

  const isWordValid = useCallback(
    (word: string) => dict?.has(word.toLowerCase()) ?? false,
    [dict],
  );

  const startRun = useCallback(() => dispatch({ type: 'START_RUN' }), []);
  const selectRackTile = useCallback(
    (rackTileId: string | null) => dispatch({ type: 'SELECT_RACK_TILE', rackTileId }),
    [],
  );
  const placeTile = useCallback(
    (rackTileId: string, row: number, col: number) =>
      dispatch({ type: 'PLACE_TILE', rackTileId, row, col }),
    [],
  );
  const recallTile = useCallback(
    (rackTileId: string) => dispatch({ type: 'RECALL_TILE', rackTileId }),
    [],
  );
  const recallAll = useCallback(() => dispatch({ type: 'RECALL_ALL' }), []);
  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);
  const endRound = useCallback(() => dispatch({ type: 'END_ROUND' }), []);
  const proceed = useCallback(() => dispatch({ type: 'PROCEED' }), []);
  const pickCard = useCallback((cardId: string) => dispatch({ type: 'PICK_CARD', cardId }), []);
  const restart = useCallback(() => dispatch({ type: 'RESTART' }), []);

  const submitMove = useCallback(() => {
    const result = validateAndScoreMove(state.board, state.pendingPlacements, isWordValid);
    if (!result.ok || !result.words) {
      dispatch({ type: 'SET_ERROR', message: result.reason ?? 'INVALID_WORD' });
      return;
    }
    let moveTotal = 0;
    let lastWordScore: WordScore = { chips: 0, mult: 1, total: 0 };
    result.words.forEach((word, i) => {
      const { chips, baseMult } = scoreWordChips(word.tiles);
      const ctx: ScoreContext = {
        wordTiles: word.tiles,
        wordLength: word.tiles.length,
        wordIndexInRound: state.round.wordsPlayedThisRound + i,
        baseChips: chips,
        baseMult,
      };
      const score = applyCardEffects(ctx, state.activeCards);
      moveTotal += score.total;
      lastWordScore = score;
    });
    dispatch({
      type: 'COMMIT_MOVE',
      placements: state.pendingPlacements,
      wordScore: moveTotal,
      wordsCount: result.words.length,
      lastWordScore,
    });
  }, [state, isWordValid]);

  const tilesRemaining = remaining(state.bag);

  return {
    state,
    startRun,
    selectRackTile,
    placeTile,
    recallTile,
    recallAll,
    submitMove,
    clearError,
    endRound,
    proceed,
    pickCard,
    restart,
    tilesRemaining,
  };
}
