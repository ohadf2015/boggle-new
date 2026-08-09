'use client';

// React wrapper over the pure crossword reducer. Owns the GameState, a play timer, and
// localStorage persistence (resume + offline). All transition logic lives in lib/crossword.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  backspace as backspaceFn,
  checkAll as checkAllFn,
  currentSlot,
  focusCell as focusCellFn,
  initGame,
  inputLetter as inputLetterFn,
  moveInSlot as moveInSlotFn,
  moveVertical as moveVerticalFn,
  revealCell as revealCellFn,
  revealWord as revealWordFn,
  toggleDir as toggleDirFn,
  type GameState,
} from '@/lib/crossword/gameState';
import {
  clearProgress,
  emptyProgress,
  loadProgress,
  saveProgress,
} from '@/lib/crossword/progress';
import { emitCrosswordGameEnd } from '@/lib/crossword/telemetry';
import { crosswordStats } from '@/lib/crossword/stats';
import type { CrosswordPuzzle, Direction } from '@/lib/crossword/types';

export interface UseCrosswordGame {
  state: GameState;
  activeSlot: ReturnType<typeof currentSlot>;
  elapsedMs: number;
  focusCell: (row: number, col: number) => void;
  toggleDir: () => void;
  inputLetter: (letter: string) => void;
  backspace: () => void;
  moveInSlot: (delta: 1 | -1) => void;
  /** Arrow Up/Down: face the down word and move, in one step. */
  moveVertical: (delta: 1 | -1) => void;
  revealCell: () => void;
  revealWord: () => void;
  checkAll: () => void;
  nextSlot: (delta?: 1 | -1) => void;
  focusSlot: (slotId: string) => void;
  reset: () => void;
}

function now(): number {
  return typeof performance !== 'undefined' ? Math.floor(performance.now()) : 0;
}

export function useCrosswordGame(
  puzzle: CrosswordPuzzle,
  opts: { onSolved?: () => void; onWordSolved?: () => void } = {},
): UseCrosswordGame {
  const [state, setState] = useState<GameState>(() => {
    const saved = loadProgress(puzzle.id);
    return initGame(puzzle, saved?.entries ?? {}, saved?.revealedCells ?? []);
  });

  // Per-word feedback: fire whenever the count of fully-correct words climbs
  // (but not on the final solve — that's `onSolved`). Seeded from the resumed
  // state so a resume doesn't replay a ding for words already done.
  const wordsSolvedRef = useRef<number>(crosswordStats(state).wordsSolved);

  // Stable refs for caller callbacks so effects don't re-run on inline object identity changes.
  const onSolvedRef = useRef(opts.onSolved);
  onSolvedRef.current = opts.onSolved;
  const onWordSolvedRef = useRef(opts.onWordSolved);
  onWordSolvedRef.current = opts.onWordSolved;

  const startRef = useRef<number>(now());
  const baseElapsedRef = useRef<number>(loadProgress(puzzle.id)?.elapsedMs ?? 0);
  const [elapsedMs, setElapsedMs] = useState<number>(baseElapsedRef.current);
  const solvedFiredRef = useRef(false);

  // Keep latest elapsed + state in refs so the unmount flush reads current values.
  const elapsedRef = useRef<number>(elapsedMs);
  elapsedRef.current = elapsedMs;
  const stateRef = useRef<GameState>(state);
  stateRef.current = state;

  // Timer ticks while playing.
  useEffect(() => {
    if (state.status === 'solved') return;
    const id = setInterval(() => {
      setElapsedMs(baseElapsedRef.current + (now() - startRef.current));
    }, 250);
    return () => clearInterval(id);
  }, [state.status]);

  // Persist on meaningful change only (NOT every 250ms timer tick — that would hammer
  // localStorage ~4×/sec). Time is captured from the ref here and on unmount.
  useEffect(() => {
    saveProgress({
      ...emptyProgress(puzzle.id, Date.now()),
      entries: state.entries,
      revealedCells: state.revealed,
      status: state.status,
      elapsedMs: elapsedRef.current,
    });
  }, [state.entries, state.revealed, state.status, puzzle.id]);

  // Flush latest elapsed time on unmount.
  useEffect(() => {
    return () => {
      saveProgress({
        ...emptyProgress(puzzle.id, Date.now()),
        entries: stateRef.current.entries,
        revealedCells: stateRef.current.revealed,
        status: stateRef.current.status,
        elapsedMs: elapsedRef.current,
      });
    };
     
  }, [puzzle.id]);

  // Fire onWordSolved each time a new word becomes fully correct (excluding the
  // final solve, which fires onSolved). Refs avoid spurious re-runs when the
  // caller passes an inline opts object that changes identity every render.
  useEffect(() => {
    const solved = crosswordStats(state).wordsSolved;
    if (solved > wordsSolvedRef.current && state.status !== 'solved') {
      onWordSolvedRef.current?.();
    }
    wordsSolvedRef.current = solved;
  }, [state]);

  // Fire onSolved once.
  useEffect(() => {
    if (state.status === 'solved' && !solvedFiredRef.current) {
      solvedFiredRef.current = true;
      // Record completion to analytics_events so solved puzzles appear in the
      // admin game log (read from elapsedRef so the duration is current).
      emitCrosswordGameEnd(puzzle, elapsedRef.current);
      onSolvedRef.current?.();
    }
  }, [state.status, puzzle]);

  const focusCell = useCallback((row: number, col: number) => {
    setState((s) => focusCellFn(s, row, col));
  }, []);
  const toggleDir = useCallback(() => setState(toggleDirFn), []);
  const inputLetter = useCallback((letter: string) => setState((s) => inputLetterFn(s, letter)), []);
  const backspace = useCallback(() => setState(backspaceFn), []);
  const moveInSlot = useCallback((delta: 1 | -1) => setState((s) => moveInSlotFn(s, delta)), []);
  const moveVertical = useCallback((delta: 1 | -1) => setState((s) => moveVerticalFn(s, delta)), []);
  const revealCell = useCallback(() => setState(revealCellFn), []);
  const revealWord = useCallback(() => setState(revealWordFn), []);
  const checkAll = useCallback(() => setState(checkAllFn), []);

  // Jump focus to the next/previous slot (by number, wrapping, across then down).
  const nextSlot = useCallback((delta: 1 | -1 = 1) => {
    setState((s) => {
      const order = [...s.puzzle.slots].sort(
        (a, b) => a.number - b.number || (a.dir === b.dir ? 0 : a.dir === 'across' ? -1 : 1),
      );
      const cur = currentSlot(s);
      const idx = cur ? order.findIndex((x) => x.id === cur.id) : -1;
      const target = order[(idx + delta + order.length) % order.length];
      if (!target) return s;
      return {
        ...focusCellFn({ ...s, dir: target.dir as Direction }, target.row, target.col),
        dir: target.dir as Direction,
      };
    });
  }, []);

  // Jump focus to a specific slot by id (clue-list click). Forces the slot's direction so an
  // across clue selects across even if a down slot also passes through the start cell.
  const focusSlot = useCallback((slotId: string) => {
    setState((s) => {
      const target = s.puzzle.slots.find((x) => x.id === slotId);
      if (!target) return s;
      return {
        ...focusCellFn({ ...s, dir: target.dir as Direction }, target.row, target.col),
        dir: target.dir as Direction,
      };
    });
  }, []);

  const reset = useCallback(() => {
    clearProgress(puzzle.id);
    baseElapsedRef.current = 0;
    startRef.current = now();
    setElapsedMs(0);
    solvedFiredRef.current = false;
    setState(initGame(puzzle));
  }, [puzzle]);

  const activeSlot = useMemo(() => currentSlot(state), [state]);

  return {
    state,
    activeSlot,
    elapsedMs,
    focusCell,
    toggleDir,
    inputLetter,
    backspace,
    moveInSlot,
    moveVertical,
    revealCell,
    revealWord,
    checkAll,
    nextSlot,
    focusSlot,
    reset,
  };
}
