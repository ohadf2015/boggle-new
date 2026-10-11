import { useEffect, useRef } from 'react';
import type { Language, LetterGrid } from '@/types';
import { findWordPath } from '@/utils/wordPathFinder';
import { vibrateKeyboardSelect, vibrateNavigation, vibrateUndo } from '@/components/grid/hapticFeedback';
import type { BoardSelectionApi } from './useBoardSelection';
import type { CellRef } from './selectionPath';

interface BoardKeyboardOptions {
  grid: LetterGrid;
  interactive: boolean;
  language: Language;
  disableLetterKeyInput?: boolean;
  fireRoundActive?: boolean;
}

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

/** Typing and arrow-key play on a focused board, driving the same selection engine as the pointer. */
export function useBoardKeyboard(
  containerRef: React.RefObject<HTMLElement | null>,
  apiRef: React.RefObject<BoardSelectionApi | null>,
  options: BoardKeyboardOptions,
): void {
  const optsRef = useRef(options);
  useEffect(() => {
    optsRef.current = options;
  });

  useEffect(() => {
    const root = containerRef.current?.querySelector<HTMLElement>('[role="grid"]');
    if (!root) return undefined;
    let focus: { row: number; col: number } | null = null;

    const setFocus = (next: { row: number; col: number } | null) => {
      focus = next;
      apiRef.current?.painter()?.setFocus(next);
    };

    const onKey = (e: KeyboardEvent) => {
      const api = apiRef.current;
      const { grid, interactive, language, disableLetterKeyInput, fireRoundActive = false } = optsRef.current;
      if (!api || !interactive || e.ctrlKey || e.metaKey || e.altKey) return;
      const path = api.getPath();
      const rows = grid.length;
      const cols = grid[0]?.length ?? 0;

      if (ARROWS[e.key]) {
        e.preventDefault();
        if (!focus) {
          setFocus({ row: 0, col: 0 });
          return;
        }
        const [dr, dc] = ARROWS[e.key];
        setFocus({ row: Math.min(rows - 1, Math.max(0, focus.row + dr)), col: Math.min(cols - 1, Math.max(0, focus.col + dc)) });
        vibrateNavigation();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (path.length) {
          api.submit('kb');
          vibrateKeyboardSelect(fireRoundActive);
        } else if (focus) {
          const letter = grid[focus.row]?.[focus.col];
          if (letter) api.setPath([{ row: focus.row, col: focus.col, letter }]);
        } else {
          setFocus({ row: 0, col: 0 });
        }
        return;
      }
      if (e.key === 'Escape') {
        api.setPath([]);
        setFocus(null);
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        if (path.length) {
          api.setPath(path.slice(0, -1));
          vibrateUndo(fireRoundActive);
        }
        return;
      }
      if (e.key.length !== 1 || !/\p{L}/u.test(e.key)) return;
      if (disableLetterKeyInput || api.isPressing()) return;
      e.preventDefault();
      const typed = path.map((c) => c.letter).join('') + e.key;
      const found = findWordPath(typed, grid, language) ?? (path.length ? null : findWordPath(e.key, grid, language));
      if (!found) return;
      const next: CellRef[] = found.map((p) => ({ row: p.row, col: p.col, letter: p.letter }));
      api.setPath(next);
      const head = next[next.length - 1];
      setFocus({ row: head.row, col: head.col });
      vibrateKeyboardSelect(fireRoundActive);
    };

    root.addEventListener('keydown', onKey);
    return () => root.removeEventListener('keydown', onKey);
  }, [containerRef, apiRef]);
}
