'use client';
import { useReducer, useMemo, useRef } from 'react';
import type { BlastLevel, CellId } from './types';
import { LOCALE_CONFIGS } from './locale-config';
import {
  reduceSelection, validateSelection, collapseCells, rebuildTileIds, detectAllCascades, scoreForWord,
  computeCompletion,
  type SelectionState, type SelectionEvent, type ValidationResult, type CompletionReason,
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
  completionReason: CompletionReason | null;
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
  // Why the level ended. Snapshotted at the moment status flips to
  // 'levelComplete' so a later cascade/collapse can't retroactively change the
  // headline the result card already showed. Null while playing.
  completionReason: CompletionReason | null;
  hintsUsed: number;
  cascadeCount: number;
  invalidShakeKey: number;
  // Count of confirmed wrong attempts this level — deterministic rejections
  // plus dictionary-confirmed non-words. Feeds the star rating. A pending
  // `unknown` reject does NOT count until the dictionary verdict lands, so a
  // valid off-theme bonus word is never punished as a miss.
  wrongAttempts: number;
  lastValidation: ValidationResult | null;
  // Cells of the most recently rejected submit. BlastGame uses this to retry
  // an async dictionary lookup for free-form (non-theme) word validation when
  // the local validator rejects with `reason: 'unknown'`.
  lastRejectedCells: CellId[];
  // True while an `unknown` rejection is awaiting the async /api/dictionary/check
  // verdict. During this window we DON'T shake — the word may be a valid
  // off-theme bonus word. BlastGame shows a subtle "checking" state instead,
  // then either credits it (onForceBonus) or confirms the reject
  // (onRejectConfirmed → shake fires). Deterministic rejections skip this.
  dictCheckPending: boolean;
  // Number of free undos the player has consumed this level. Drives the
  // rewarded-ad gate: the first two undos cost nothing; further undos require
  // confirming a rewarded ad via `markRewardedUndo`.
  freeUndosUsed: number;
  lastChainDepth: number;
  chainEventKey: number;
  tileIds: string[][];
  history: HistoryEntry[];
};

type Action =
  | { type: 'sel'; event: SelectionEvent; dictionaryCheck?: (word: string) => boolean }
  | { type: 'shuffle' }
  | { type: 'undo' }
  | { type: 'forceBonus'; cells: CellId[]; word: string }
  | { type: 'rejectConfirmed' }
  | { type: 'markRewardedUndo' };

type UseBlastV2Options = {
  dictionaryCheck?: (word: string) => boolean;
};

// Free undos before the rewarded-ad gate. The fix-level-11 brief asks for
// two free reverses; further undos require the player confirm a rewarded ad.
export const FREE_UNDO_LIMIT = 2;

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
    // `unknown` is the retryable path: the letters form a real run that simply
    // isn't a theme word. It may be a valid off-theme bonus word, so we DEFER
    // the shake — BlastGame asks /api/dictionary/check, then either credits the
    // word (onForceBonus) or confirms the reject (onRejectConfirmed → shake).
    // Firing the shake now would flash a false "wrong!" before the word lands.
    if (res.reason === 'unknown') {
      return {
        ...state,
        lastValidation: res,
        lastRejectedCells: cells,
        dictCheckPending: true,
      };
    }
    // Deterministic rejections (length/axis/gap/frozen/duplicate) are terminal
    // — no dictionary can rescue them, so shake immediately. A duplicate isn't
    // a skill miss (the word was real), so it doesn't count against stars.
    const countsAsMiss = res.reason !== 'duplicate';
    return {
      ...state,
      lastValidation: res,
      invalidShakeKey: state.invalidShakeKey + 1,
      wrongAttempts: state.wrongAttempts + (countsAsMiss ? 1 : 0),
      lastRejectedCells: [],
      dictCheckPending: false,
    };
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

  // Collapse on BOTH theme and bonus matches. Bonus covers the free-form
  // dictionary path — without removing the consumed tiles a player who
  // claims a non-target real word would still see the board unchanged and
  // could remain stuck. Theme + bonus share the same collapse + cascade
  // accounting so the chain FX work for either.
  // Target words formable on the board BEFORE this collapse (already-found excluded).
  const formableBefore = new Set(
    detectAllCascades(state.level, newFound, config).map((c) => c.word),
  );
  const collapse = collapseCells(state.level, cells);
  newLevel = collapse.level;
  newTileIds = rebuildTileIds(state.level.columns, state.tileIds, collapse);
  const revealed = detectAllCascades(newLevel, newFound, config)
    .map((c) => c.word)
    .filter((w) => !formableBefore.has(w));
  newCascadeCount += revealed.length;
  // Completion check runs on the POST-collapse board (newLevel) so it can tell
  // a clean win from a soft-lock — a collapse that strands the last theme word
  // now finishes the level as a `partial` instead of trapping the player.
  const completion = computeCompletion(newLevel, newFound, config);
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
    completionReason: state.completionReason,
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
    status: completion.complete ? 'levelComplete' : 'playing',
    completionReason: completion.complete ? completion.reason : null,
    lastChainDepth: thisChainDepth,
    chainEventKey: state.chainEventKey + 1,
    tileIds: newTileIds,
    history: newHistory,
    dictCheckPending: false,
  };
}

/**
 * Apply a bonus-word submit that has already been confirmed by an async
 * dictionary lookup. Skips the local validator (the word isn't in `level.words`
 * and the bonusDict feature flag may be off) but still runs the full
 * collapse/cascade/snapshot pipeline so undo and FX behave identically.
 */
function applyForceBonus(state: State, cells: CellId[], word: string): State {
  const config = LOCALE_CONFIGS[state.level.locale];
  // Duplicate guard — engine validation would normally catch this, but we
  // are bypassing it. Player can't re-claim the same dictionary word.
  if (state.foundWords.has(word)) {
    return { ...state, invalidShakeKey: state.invalidShakeKey + 1 };
  }
  const outcome = scoreForWord(state.level, cells, 'bonus');
  const newFound = new Set(state.foundWords);
  newFound.add(word);
  const baseDelta = baseChestDeltaForWord(cells.length, 'bonus');
  const newChestProgress = state.chestProgress + outcome.chestProgressDelta + baseDelta;
  const newCoins = state.coins + outcome.coinsBase + outcome.coinsFromOverlays;

  trackBlastWordFound({
    level: state.level.levelNumber,
    word,
    axis: cells[0]?.[0] === 'c' && cells[cells.length - 1]?.[0] === 'c' ? 'H' : 'V',
    length: word.length,
    isCascade: false,
    isBonus: true,
  });

  const formableBefore = new Set(
    detectAllCascades(state.level, newFound, config).map((c) => c.word),
  );
  const collapse = collapseCells(state.level, cells);
  const newLevel = collapse.level;
  const newTileIds = rebuildTileIds(state.level.columns, state.tileIds, collapse);
  const revealed = detectAllCascades(newLevel, newFound, config)
    .map((c) => c.word)
    .filter((w) => !formableBefore.has(w));
  const newCascadeCount = state.cascadeCount + revealed.length;
  // A bonus word can strand the last theme word too — run the same completion
  // check on the post-collapse board so the player isn't soft-locked.
  const completion = computeCompletion(newLevel, newFound, config);
  const thisChainDepth = newCascadeCount - state.cascadeCount;

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
    completionReason: state.completionReason,
  };
  const newHistory = [...state.history, snapshot].slice(-UNDO_STACK_LIMIT);

  return {
    ...state,
    level: newLevel,
    foundWords: newFound,
    coins: newCoins,
    chestProgress: Math.min(1, newChestProgress),
    cascadeCount: newCascadeCount,
    lastValidation: { kind: 'bonus', word },
    status: completion.complete ? 'levelComplete' : 'playing',
    completionReason: completion.complete ? completion.reason : null,
    lastChainDepth: thisChainDepth,
    chainEventKey: state.chainEventKey + 1,
    tileIds: newTileIds,
    history: newHistory,
    lastRejectedCells: [],
    dictCheckPending: false,
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
  if (action.type === 'forceBonus') {
    return applyForceBonus(state, action.cells, action.word);
  }
  if (action.type === 'rejectConfirmed') {
    // The async dictionary check came back negative for a pending `unknown`
    // word. NOW fire the shake (it was deferred at submit time) and clear the
    // pending markers so a fresh attempt isn't mistaken for a stale verdict.
    if (!state.dictCheckPending) return state;
    return {
      ...state,
      invalidShakeKey: state.invalidShakeKey + 1,
      wrongAttempts: state.wrongAttempts + 1,
      dictCheckPending: false,
      lastRejectedCells: [],
    };
  }
  if (action.type === 'markRewardedUndo') {
    // Reset the free-undo counter so the next two undos are free again.
    // The caller is responsible for actually playing the rewarded ad; this
    // reducer only tracks the gate.
    return { ...state, freeUndosUsed: 0 };
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
      completionReason: prev.completionReason,
      selection: { kind: 'idle' },
      lastValidation: null,
      lastRejectedCells: [],
      // Count this undo toward the rewarded-ad gate. BlastGame decides
      // whether to allow the next undo or prompt the ad based on
      // `freeUndosUsed >= FREE_UNDO_LIMIT`.
      freeUndosUsed: state.freeUndosUsed + 1,
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
    completionReason: null,
    hintsUsed: 0,
    cascadeCount: 0,
    invalidShakeKey: 0,
    wrongAttempts: 0,
    lastValidation: null,
    lastRejectedCells: [],
    dictCheckPending: false,
    freeUndosUsed: 0,
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
      // Async-confirmed dictionary bonus. BlastGame fires this after the
      // local validator rejects with 'unknown' and the dictionary API confirms
      // the candidate is a real word — the player gets credit retroactively
      // so free-form play feels live, not after-the-fact.
      onForceBonus: (cells: CellId[], word: string) =>
        dispatch({ type: 'forceBonus', cells, word }),
      // Player watched the rewarded ad to refresh their free-undo budget.
      // Resets the counter so the next FREE_UNDO_LIMIT undos cost nothing.
      onRewardedUndoGranted: () => dispatch({ type: 'markRewardedUndo' }),
      // The async dictionary check rejected a pending `unknown` word — it's
      // genuinely not a real word. Fires the (deferred) shake.
      onRejectConfirmed: () => dispatch({ type: 'rejectConfirmed' }),
    }),
    []
  );
  const stateWithCanUndo = useMemo(() => {
    // Bonus words = found words that aren't theme words. Derived (not stored)
    // so undo, which restores `foundWords` from a snapshot, keeps the count
    // correct automatically. Both sides normalized: theme words store as their
    // original casing, bonus words as the normalized form.
    const config = LOCALE_CONFIGS[state.level.locale];
    const themeNorm = new Set(state.level.words.map(config.normalize));
    let bonusWordCount = 0;
    for (const w of state.foundWords) {
      if (!themeNorm.has(config.normalize(w))) bonusWordCount += 1;
    }
    return {
      ...state,
      canUndo: state.history.length > 0,
      // True once the next undo would exceed the free quota — BlastGame uses
      // this to gate the button behind a rewarded-ad modal.
      needsRewardedAdForUndo: state.freeUndosUsed >= FREE_UNDO_LIMIT,
      bonusWordCount,
    };
  }, [state]);
  return { state: stateWithCanUndo, handlers };
}
