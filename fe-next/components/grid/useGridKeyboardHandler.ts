import { useCallback } from 'react';
import type { LetterGrid, GridPosition, Language } from '@/types';
import type { SelectedCell } from './types';
import { isAdjacentCell } from './gridGeometry';
import { vibrateKeyboardSelect, vibrateUndo, vibrateNavigation } from './hapticFeedback';
import { findWordPath } from '@/utils/wordPathFinder';

interface UseGridKeyboardHandlerProps {
  grid: LetterGrid;
  interactive: boolean;
  focusedCell: GridPosition | null;
  selectedCells: SelectedCell[];
  comboLevel: number;
  fireRoundActive: boolean;
  language: Language;
  disableLetterKeyInput: boolean;
  isTouchingRef: React.RefObject<boolean>;
  isDraggingRef: React.RefObject<boolean>;
  onWordSubmit?: (word: string) => void;
  onPathSubmit?: (cells: SelectedCell[]) => void;
  setFocusedCell: (cell: GridPosition | null) => void;
  setIsKeyboardMode: (val: boolean) => void;
  setSelectedCells: (cells: SelectedCell[]) => void;
  startSequentialFadeOut: (isCombo: boolean) => void;
}

export function useGridKeyboardHandler({
  grid,
  interactive,
  focusedCell,
  selectedCells,
  comboLevel,
  fireRoundActive,
  language,
  disableLetterKeyInput,
  isTouchingRef,
  isDraggingRef,
  onWordSubmit,
  onPathSubmit,
  setFocusedCell,
  setIsKeyboardMode,
  setSelectedCells,
  startSequentialFadeOut,
}: UseGridKeyboardHandlerProps) {
  return useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;

    const rows = grid.length;
    const cols = grid[0]?.length || 4;

    if (focusedCell === null && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) {
      setFocusedCell({ row: 0, col: 0 });
      setIsKeyboardMode(true);
      e.preventDefault();
      return;
    }

    if (!focusedCell) return;

    let newRow = focusedCell.row;
    let newCol = focusedCell.col;

    switch (e.key) {
      case 'ArrowUp':
        newRow = Math.max(0, focusedCell.row - 1);
        e.preventDefault();
        break;
      case 'ArrowDown':
        newRow = Math.min(rows - 1, focusedCell.row + 1);
        e.preventDefault();
        break;
      case 'ArrowLeft':
        newCol = Math.max(0, focusedCell.col - 1);
        e.preventDefault();
        break;
      case 'ArrowRight':
        newCol = Math.min(cols - 1, focusedCell.col + 1);
        e.preventDefault();
        break;
      case 'Enter': {
        e.preventDefault();
        const letter = grid[focusedCell.row]?.[focusedCell.col];
        if (!letter) return;

        if (selectedCells.length > 0) {
          const formedWord = selectedCells.map(c => c.letter).join('');
          if (onPathSubmit) onPathSubmit([...selectedCells]);
          if (onWordSubmit) onWordSubmit(formedWord);
          vibrateKeyboardSelect(fireRoundActive);
          if (comboLevel > 0) {
            startSequentialFadeOut(true);
          } else {
            setTimeout(() => setSelectedCells([]), 500);
          }
          return;
        }

        const existingIndex = selectedCells.findIndex(c => c.row === focusedCell.row && c.col === focusedCell.col);

        if (existingIndex !== -1) {
          setSelectedCells(selectedCells.slice(0, existingIndex));
          vibrateUndo(fireRoundActive);
        } else {
          const lastCell = selectedCells[selectedCells.length - 1];
          const canSelect = lastCell ? isAdjacentCell(lastCell, focusedCell) : true;

          if (canSelect) {
            setSelectedCells([...selectedCells, { row: focusedCell.row, col: focusedCell.col, letter }]);
            vibrateKeyboardSelect(fireRoundActive);
          }
        }
        return;
      }
      case 'Escape':
        setSelectedCells([]);
        setFocusedCell(null);
        setIsKeyboardMode(false);
        e.preventDefault();
        return;
      case 'Backspace':
      case 'Delete':
        if (selectedCells.length > 0) {
          setSelectedCells(selectedCells.slice(0, -1));
          vibrateUndo(fireRoundActive);
        }
        e.preventDefault();
        return;
      default:
        if (e.key.length === 1 && /[a-zA-Z]/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
          if (disableLetterKeyInput) return;
          if (isTouchingRef.current || isDraggingRef.current) return;

          e.preventDefault();

          const currentWord = selectedCells.map(c => c.letter).join('');
          const nextWord = currentWord + e.key;
          const path = findWordPath(nextWord, grid, language);

          if (path) {
            const newSelection = path.map(p => ({ row: p.row, col: p.col, letter: p.letter }));
            setSelectedCells(newSelection);
            setFocusedCell({ row: path[path.length - 1].row, col: path[path.length - 1].col });
            setIsKeyboardMode(true);
            vibrateKeyboardSelect(fireRoundActive);
          } else if (selectedCells.length === 0) {
            const startNewPath = findWordPath(e.key, grid, language);
            if (startNewPath) {
              const newSelection = startNewPath.map(p => ({ row: p.row, col: p.col, letter: p.letter }));
              setSelectedCells(newSelection);
              setFocusedCell({ row: startNewPath[0].row, col: startNewPath[0].col });
              setIsKeyboardMode(true);
              vibrateKeyboardSelect(fireRoundActive);
            }
          }
          return;
        }
    }

    if (newRow !== focusedCell.row || newCol !== focusedCell.col) {
      setFocusedCell({ row: newRow, col: newCol });
      setIsKeyboardMode(true);
      vibrateNavigation();
    }
  }, [interactive, grid, focusedCell, selectedCells, comboLevel, onWordSubmit, onPathSubmit, startSequentialFadeOut, setSelectedCells, setFocusedCell, setIsKeyboardMode, fireRoundActive, language, disableLetterKeyInput, isTouchingRef, isDraggingRef]);
}
