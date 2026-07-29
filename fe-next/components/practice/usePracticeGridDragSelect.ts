import { useCallback, useState } from 'react';
import { isAdjacent } from '@/lib/grid/adjacencyRules';

export interface GridCell {
  row: number;
  col: number;
  letter: string;
}

/**
 * Practice-mode grid drag-select. Adjacency includes diagonals. Re-entering an
 * already-selected cell backtracks the path (drops the tail down to before
 * that cell). Simpler than adventure's useGridGestures — no freezes, no
 * deadzones, no measurements caching needed for a 4×4 practice board.
 */
export function usePracticeGridDragSelect(_opts: { rows: number; cols: number }) {
  const [path, setPath] = useState<GridCell[]>([]);

  const onCellEnter = useCallback((row: number, col: number, letter: string) => {
    setPath((prev) => {
      const idx = prev.findIndex((c) => c.row === row && c.col === col);
      if (idx !== -1) {
        // Backtrack: trim path so the re-entered cell becomes the new tail.
        // drag S→T then re-enter S → path = [S]. drag S→T→A then re-enter T
        // → path = [S, T] (drops A).
        return prev.slice(0, idx + 1);
      }
      const next: GridCell = { row, col, letter };
      if (prev.length === 0) return [next];
      if (!isAdjacent(prev[prev.length - 1], next)) return prev;
      return [...prev, next];
    });
  }, []);

  const clear = useCallback(() => setPath([]), []);

  return { path, onCellEnter, clear };
}
