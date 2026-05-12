'use client';
import { useReducer, useMemo } from 'react';
import type { BlastLevel, CellId } from './types';
import { LOCALE_CONFIGS } from './locale-config';
import { reduceSelection, validateSelection, collapseCells, detectCascade, scoreForWord } from './engine';
import type { SelectionState, SelectionEvent, ValidationResult } from './engine';
import { mechanicsForLevel } from './mechanic-flags';

type State = {
  level: BlastLevel;
  selection: SelectionState;
  foundWords: Set<string>;
  coins: number;
  chestProgress: number;
  status: 'playing' | 'levelComplete';
  hintsUsed: number;
  cascadeCount: number;
  invalidShakeKey: number;
  lastValidation: ValidationResult | null;
};

type Action =
  | { type: 'sel'; event: SelectionEvent }
  | { type: 'shuffle' };

function applyValidatedSubmit(state: State, cells: CellId[]): State {
  const config = LOCALE_CONFIGS[state.level.locale];
  const mechanics = mechanicsForLevel(state.level.levelNumber);
  const ctx = {
    level: state.level,
    config,
    foundWords: state.foundWords,
    bonusDict: new Set<string>(),
    bonusDictEnabled: mechanics.bonusDictionary,
  };
  const res = validateSelection(cells, ctx);
  if (res.kind === 'reject') {
    return { ...state, lastValidation: res, invalidShakeKey: state.invalidShakeKey + 1 };
  }
  const kind = res.kind === 'theme_match' ? 'theme' : 'bonus';
  const outcome = scoreForWord(state.level, cells, kind);
  const newFound = new Set(state.foundWords);
  newFound.add(res.word);
  let newLevel = state.level;
  let newChestProgress = state.chestProgress + outcome.chestProgressDelta;
  let newCascadeCount = state.cascadeCount;
  let newCoins = state.coins + outcome.coinsBase + outcome.coinsFromOverlays;
  if (kind === 'theme') {
    newLevel = collapseCells(state.level, cells).level;
    while (true) {
      const cascade = detectCascade(newLevel, newFound, config);
      if (!cascade) break;
      newFound.add(cascade.word);
      newCascadeCount += 1;
      const cOut = scoreForWord(newLevel, cascade.cells, 'cascade');
      newCoins += cOut.coinsBase + cOut.coinsFromOverlays;
      newChestProgress += cOut.chestProgressDelta;
      newLevel = collapseCells(newLevel, cascade.cells).level;
    }
  }
  const allFound = state.level.words.every((w) => newFound.has(w));
  return {
    ...state,
    level: newLevel,
    foundWords: newFound,
    coins: newCoins,
    chestProgress: Math.min(1, newChestProgress),
    cascadeCount: newCascadeCount,
    lastValidation: res,
    status: allFound ? 'levelComplete' : 'playing',
  };
}

function reducer(state: State, action: Action): State {
  if (action.type === 'sel') {
    const t = reduceSelection(state.selection, action.event);
    if (t.submit) return applyValidatedSubmit({ ...state, selection: t.state }, t.cells);
    return { ...state, selection: t.state };
  }
  if (action.type === 'shuffle') {
    return { ...state, hintsUsed: state.hintsUsed + 1, coins: Math.max(0, state.coins - 50) };
  }
  return state;
}

export function useBlastV2(initialLevel: BlastLevel) {
  const initial: State = {
    level: initialLevel,
    selection: { kind: 'idle' },
    foundWords: new Set(),
    coins: 0,
    chestProgress: 0,
    status: 'playing',
    hintsUsed: 0,
    cascadeCount: 0,
    invalidShakeKey: 0,
    lastValidation: null,
  };
  const [state, dispatch] = useReducer(reducer, initial);
  const handlers = useMemo(
    () => ({
      onPointerDown: (cell: CellId) => dispatch({ type: 'sel', event: { type: 'pointerdown', cell, mode: 'drag' } }),
      onPointerMove: (cell: CellId) => dispatch({ type: 'sel', event: { type: 'pointermove', cell } }),
      onPointerUp: () => dispatch({ type: 'sel', event: { type: 'pointerup' } }),
      onTap: (cell: CellId) => dispatch({ type: 'sel', event: { type: 'tap', cell } }),
      onDoubleTap: (cell: CellId) => dispatch({ type: 'sel', event: { type: 'doubletap', cell } }),
      onCancel: () => dispatch({ type: 'sel', event: { type: 'cancel' } }),
      onShuffle: () => dispatch({ type: 'shuffle' }),
    }),
    []
  );
  return { state, handlers };
}
