import { useCallback, useRef } from 'react';
import type { GridPosition } from '@/types';
import type { SelectedCell } from './types';
import { isAdjacentCell } from './gridGeometry';
import { vibrateClickSelect, vibrateBacktrack } from './hapticFeedback';

interface UseGridClickHandlerProps {
  selectedCells: SelectedCell[];
  setSelectedCells: (cells: SelectedCell[]) => void;
  submitWord: () => void;
  fireRoundActive: boolean;
  setIsClickSelectMode: (val: boolean) => void;
  cellFilter?: (row: number, col: number, currentPathLength?: number) => boolean;
}

export function useGridClickHandler({
  selectedCells,
  setSelectedCells,
  submitWord,
  fireRoundActive,
  setIsClickSelectMode,
  cellFilter,
}: UseGridClickHandlerProps) {
  const lastClickTimeRef = useRef(0);
  const lastClickCellRef = useRef<GridPosition | null>(null);

  const handleCellClick = useCallback((rowIndex: number, colIndex: number, letter: string) => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    const sameCell = lastClickCellRef.current?.row === rowIndex && lastClickCellRef.current?.col === colIndex;

    if (sameCell && timeSinceLastClick < 500 && selectedCells.length >= 2) {
      submitWord();
      lastClickTimeRef.current = 0;
      lastClickCellRef.current = null;
      return;
    }

    lastClickTimeRef.current = now;
    lastClickCellRef.current = { row: rowIndex, col: colIndex };

    if (selectedCells.length === 0) {
      if (cellFilter && !cellFilter(rowIndex, colIndex, 0)) return;
      setSelectedCells([{ row: rowIndex, col: colIndex, letter }]);
      setIsClickSelectMode(true);
      vibrateClickSelect();
      return;
    }

    const existingIndex = selectedCells.findIndex(c => c.row === rowIndex && c.col === colIndex);
    if (existingIndex !== -1) {
      if (existingIndex === selectedCells.length - 1 && selectedCells.length >= 2) {
        submitWord();
        return;
      }
      setSelectedCells(selectedCells.slice(0, existingIndex + 1));
      vibrateBacktrack(fireRoundActive);
      return;
    }

    const lastCell = selectedCells[selectedCells.length - 1];
    if (lastCell && isAdjacentCell(lastCell, { row: rowIndex, col: colIndex })) {
      if (cellFilter && !cellFilter(rowIndex, colIndex, selectedCells.length)) return;
      setSelectedCells([...selectedCells, { row: rowIndex, col: colIndex, letter }]);
      vibrateClickSelect();
    }
  }, [selectedCells, setSelectedCells, submitWord, fireRoundActive, setIsClickSelectMode, cellFilter]);

  return handleCellClick;
}
