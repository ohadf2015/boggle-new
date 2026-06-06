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
  revealCell: () => void;
  revealWord: () => void;
  checkAll: () => void;
  nextSlot: (delta?: 1 | -1) => void;
  reset: () => void;
}

function now(): number {
  return typeof performance !== 'undefined' ? Math.floor(performance.now()) : 0;
}

export function useCrosswordGame(
  puzzle: CrosswordPuzzle,
  opts: { onSolved?: () => void } = {},
): UseCrosswordGame {
  const [state, setState] = useState<GameState>(() => {
    const saved = loadProgress(puzzle.id);
    return initGame(puzzle, saved?.entries ?? {}, saved?.revealedCells ?? []);
  });

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

  // Fire onSolved once.
  useEffect(() => {
    if (state.status === 'solved' && !solvedFiredRef.current) {
      solvedFiredRef.current = true;
      opts.onSolved?.();
    }
  }, [state.status, opts]);

  const focusCell = useCallback((row: number, col: number) => {
    setState((s) => focusCellFn(s, row, col));
  }, []);
  const toggleDir = useCallback(() => setState(toggleDirFn), []);
  const inputLetter = useCallback((letter: string) => setState((s) => inputLetterFn(s, letter)), []);
  const backspace = useCallback(() => setState(backspaceFn), []);
  const moveInSlot = useCallback((delta: 1 | -1) => setState((s) => moveInSlotFn(s, delta)), []);
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
    revealCell,
    revealWord,
    checkAll,
    nextSlot,
    reset,
  };
}
