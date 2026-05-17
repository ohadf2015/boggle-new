'use client';
import { useReducer, useMemo, useRef } from 'react';
import type { BlastLevel, CellId } from './types';
import { LOCALE_CONFIGS } from './locale-config';
import {
  reduceSelection, validateSelection, collapseCells, rebuildTileIds, detectAllCascades, scoreForWord,
  type SelectionState, type SelectionEvent, type ValidationResult,
} from './engine';
import { mechanicsForLevel } from './mechanic-flags';
import { trackBlastWordFound, trackBlastWordRejected, trackBlastHintUsed } from './telemetry';

// Snapshot of every field a successful submit mutates. Pushed pre-mutation so
// `undo` can fully restore the prior board, score, found-set, and chain FX
// counters. Selection is excluded — it always reverts to idle after submit.
type HistoryEntry = {
  level: BlastLevel;
  foundWords: Set<string>;
  coins: number;
  chestProgress: number;
  cascadeCount: number;
  lastChainDepth: number;
  chainEventKey: number;
  tileIds: string[][];
  status: 'playing' | 'levelComplete';
};

// Cap so the stack can't grow unbounded over a long session. Five undos is
// plenty to escape a stuck state without enabling full-level rewinds that
// would defeat the puzzle.
const UNDO_STACK_LIMIT = 5;

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
  lastChainDepth: number;
  chainEventKey: number;
  tileIds: string[][];
  history: HistoryEntry[];
};

type Action =
  | { type: 'sel'; event: SelectionEvent; dictionaryCheck?: (word: string) => boolean }
  | { type: 'shuffle' }
  | { type: 'undo' };

type UseBlastV2Options = {
  dictionaryCheck?: (word: string) => boolean;
};

// Base chest contribution per word found. Every word ticks the bar so the
// chest visibly fills during play — without this, levels that ship without
// gem tiles (most curated chain levels in L1–L5) leave the bar stuck at 0%
// the whole game. Scales with word length so longer chains feel more
// rewarding. Gem tiles still stack their own delta on top via scoreForWord.
function baseChestDeltaForWord(cellCount: number, kind: 'theme' | 'bonus'): number {
  const base = kind === 'theme' ? 0.05 : 0.025; // 5% per theme word, 2.5% per bonus
  const lengthBonus = Math.max(0, cellCount - 3) * 0.01; // +1% per letter past 3
  return base + lengthBonus;
}

function applyValidatedSubmit(
  state: State,
  cells: CellId[],
  dictionaryCheck?: (word: string) => boolean,
): State {
  const config = LOCALE_CONFIGS[state.level.locale];
  const mechanics = mechanicsForLevel(state.level.levelNumber);
  const ctx = {
    level: state.level,
    config,
    foundWords: state.foundWords,
    bonusDict: new Set<string>(),
    bonusDictEnabled: mechanics.bonusDictionary,
    dictionaryCheck,
  };
  const res = validateSelection(cells, ctx);
  if (res.kind === 'reject') {
    // Track rejection with reason
    trackBlastWordRejected({
      level: state.level.levelNumber,
      attempted_word: '', // Word not available in reject result
      length: cells.length,
      reason: res.reason,
    });
    return { ...state, lastValidation: res, invalidShakeKey: state.invalidShakeKey + 1 };
  }
  const kind = res.kind === 'theme_match' ? 'theme' : 'bonus';
  const outcome = scoreForWord(state.level, cells, kind);
  const newFound = new Set(state.foundWords);
  newFound.add(res.word);
  let newLevel = state.level;
  let newTileIds = state.tileIds;
  const baseDelta = baseChestDeltaForWord(cells.length, kind);
  let newChestProgress = state.chestProgress + outcome.chestProgressDelta + baseDelta;
  let newCascadeCount = state.cascadeCount;
  let newCoins = state.coins + outcome.coinsBase + outcome.coinsFromOverlays;

  // Track initial word found (not cascade yet)
  trackBlastWordFound({
    level: state.level.levelNumber,
    word: res.word,
    axis: cells[0]?.[0] === 'c' && cells[cells.length - 1]?.[0] === 'c' ? 'H' : 'V', // Heuristic
    length: res.word.length,
    isCascade: false,
    isBonus: kind === 'bonus',
  });

  if (kind === 'theme') {
    // Target words formable on the board BEFORE this collapse (already-found excluded).
    const formableBefore = new Set(
      detectAllCascades(state.level, newFound, config).map((c) => c.word),
    );
    const collapse = collapseCells(state.level, cells);
    newLevel = collapse.level;
    newTileIds = rebuildTileIds(state.level.columns, state.tileIds, collapse);
    // The player still finds these manually — revealed.length feeds chain FX
    // and aggregate submission/completion telemetry, but foundWords is unchanged.
    const revealed = detectAllCascades(newLevel, newFound, config)
      .map((c) => c.word)
      .filter((w) => !formableBefore.has(w));
    newCascadeCount += revealed.length;
  }
  const allFound = state.level.words.every((w) => newFound.has(w));
  const thisChainDepth = newCascadeCount - state.cascadeCount;
  // Snapshot the pre-submit slice so undo can rewind exactly this move.
  const snapshot: HistoryEntry = {
    level: state.level,
    foundWords: new Set(state.foundWords),
    coins: state.coins,
    chestProgress: state.chestProgress,
    cascadeCount: state.cascadeCount,
    lastChainDepth: state.lastChainDepth,
    chainEventKey: state.chainEventKey,
    tileIds: state.tileIds,
    status: state.status,
  };
  const newHistory = [...state.history, snapshot].slice(-UNDO_STACK_LIMIT);
  return {
    ...state,
    level: newLevel,
    foundWords: newFound,
    coins: newCoins,
    chestProgress: Math.min(1, newChestProgress),
    cascadeCount: newCascadeCount,
    lastValidation: res,
    status: allFound ? 'levelComplete' : 'playing',
    lastChainDepth: thisChainDepth,
    chainEventKey: state.chainEventKey + 1,
    tileIds: newTileIds,
    history: newHistory,
  };
}

function reducer(state: State, action: Action): State {
  if (action.type === 'sel') {
    const t = reduceSelection(state.selection, action.event);
    if (t.submit) return applyValidatedSubmit({ ...state, selection: t.state }, t.cells, action.dictionaryCheck);
    return { ...state, selection: t.state };
  }
  if (action.type === 'shuffle') {
    trackBlastHintUsed({
      level: state.level.levelNumber,
      hint_type: 'shuffle',
      coin_cost: 50,
    });
    return { ...state, hintsUsed: state.hintsUsed + 1, coins: Math.max(0, state.coins - 50) };
  }
  if (action.type === 'undo') {
    if (state.history.length === 0) return state;
    const prev = state.history[state.history.length - 1]!;
    const newHistory = state.history.slice(0, -1);
    // Restore the prior snapshot; reset selection so any in-flight drag
    // doesn't carry across, and re-arm the chain event key so FX listeners
    // don't replay the just-undone cascade.
    return {
      ...state,
      level: prev.level,
      foundWords: prev.foundWords,
      coins: prev.coins,
      chestProgress: prev.chestProgress,
      cascadeCount: prev.cascadeCount,
      lastChainDepth: 0,
      chainEventKey: state.chainEventKey + 1,
      tileIds: prev.tileIds,
      status: prev.status,
      selection: { kind: 'idle' },
      lastValidation: null,
      history: newHistory,
    };
  }
  return state;
}

export function useBlastV2(initialLevel: BlastLevel, options: UseBlastV2Options = {}) {
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
    lastChainDepth: 0,
    chainEventKey: 0,
    tileIds: initialLevel.columns.map((col, c) => col.tiles.map((_, r) => `t-${c}-${r}`)),
    history: [],
  };
  const [state, dispatch] = useReducer(reducer, initial);
  // Hold dictionaryCheck in a ref so handlers can stay memoized (stable
  // identity across renders) while still picking up the latest predicate
  // when the locale's dictionary finishes loading.
  const dictRef = useRef(options.dictionaryCheck);
  dictRef.current = options.dictionaryCheck;
  const handlers = useMemo(
    () => ({
      onPointerDown: (cell: CellId) => dispatch({ type: 'sel', event: { type: 'pointerdown', cell, mode: 'drag' }, dictionaryCheck: dictRef.current }),
      onPointerMove: (cell: CellId) => dispatch({ type: 'sel', event: { type: 'pointermove', cell }, dictionaryCheck: dictRef.current }),
      onPointerUp: () => dispatch({ type: 'sel', event: { type: 'pointerup' }, dictionaryCheck: dictRef.current }),
      onTap: (cell: CellId) => dispatch({ type: 'sel', event: { type: 'tap', cell }, dictionaryCheck: dictRef.current }),
      onDoubleTap: (cell: CellId) => dispatch({ type: 'sel', event: { type: 'doubletap', cell }, dictionaryCheck: dictRef.current }),
      onCancel: () => dispatch({ type: 'sel', event: { type: 'cancel' }, dictionaryCheck: dictRef.current }),
      onShuffle: () => dispatch({ type: 'shuffle' }),
      onUndo: () => dispatch({ type: 'undo' }),
    }),
    []
  );
  const stateWithCanUndo = useMemo(
    () => ({ ...state, canUndo: state.history.length > 0 }),
    [state],
  );
  return { state: stateWithCanUndo, handlers };
}
