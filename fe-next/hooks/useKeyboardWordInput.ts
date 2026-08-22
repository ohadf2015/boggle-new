/**
 * useKeyboardWordInput - Keyboard-based word input for LexiClash
 *
 * Allows players to type words directly instead of only swiping on the grid.
 * Features:
 * - Listens for keyboard input during gameplay
 * - Builds up a typed word as letters are pressed
 * - Validates that the typed word could exist on the grid
 * - Submits on Enter key
 * - Clears on Escape key
 * - Has backspace support
 * - Highlights matching letters on the grid as the user types
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import { couldBeOnBoard, normalizeWord } from '@/utils/clientWordValidator';
import { detectInputLanguage } from '@/utils/languageDetection';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import type { LetterGrid } from '@/types';
import type { HighlightedCell } from '@/components/GridComponent';
import type { Language } from '@/shared/types/game';
import { isTypingTarget } from '@/lib/dom/isTypingTarget';

// ==================== Types ====================

export interface UseKeyboardWordInputOptions {
  /** The letter grid to validate against */
  grid: LetterGrid;
  /** Language for normalization */
  language: string;
  /** Board language (for desktop keyboard mismatch notifications) */
  gameLanguage?: Language | null;
  /** Whether keyboard input is enabled */
  enabled: boolean;
  /** Callback when word is submitted */
  onWordSubmit?: (word: string, meta?: { inputMethod: 'kb' | 'drag' }) => void;
  /** Callback when typed word changes (for external display) */
  onTypedWordChange?: (word: string) => void;
  /** Minimum word length for submission */
  minWordLength?: number;
  /** Disable path highlighting (e.g. Word Hunt — showing the path reveals the answer) */
  disablePathHighlighting?: boolean;
}

export interface UseKeyboardWordInputReturn {
  /** The currently typed word */
  typedWord: string;
  /** Whether the typed word could exist on the grid */
  isValidOnGrid: boolean;
  /** Cells to highlight on the grid matching the typed letters */
  highlightedCells: HighlightedCell[];
  /** Clear the typed word */
  clearTypedWord: () => void;
  /** Submit the typed word */
  submitTypedWord: () => void;
  /** Whether keyboard input mode is active (user has started typing) */
  isTypingMode: boolean;
}

// ==================== Helper Functions ====================

/**
 * Find all positions of a letter on the grid
 */
function findLetterPositions(grid: LetterGrid, letter: string, language: string): HighlightedCell[] {
  const positions: HighlightedCell[] = [];
  const normalizedLetter = normalizeWord(letter, language);

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < (grid[row]?.length || 0); col++) {
      const cell = grid[row]?.[col];
      if (cell && normalizeWord(cell, language) === normalizedLetter) {
        positions.push({ row, col });
      }
    }
  }

  return positions;
}

/**
 * Find a valid path on the grid for the given word using DFS
 * Returns highlighted cells forming the path, or empty array if no valid path exists
 */
function findWordPath(
  grid: LetterGrid,
  word: string,
  language: string
): HighlightedCell[] {
  if (!word || word.length === 0 || !grid || grid.length === 0) {
    return [];
  }

  const normalizedWord = normalizeWord(word, language);
  const rows = grid.length;
  const cols = grid[0]?.length || 0;

  // Find all starting positions (cells with the first letter)
  const startPositions = findLetterPositions(grid, normalizedWord[0], language);

  // DFS to find a valid path
  const findPath = (
    row: number,
    col: number,
    index: number,
    visited: Set<string>,
    path: HighlightedCell[]
  ): HighlightedCell[] | null => {
    if (index === normalizedWord.length) {
      return path;
    }

    if (row < 0 || row >= rows || col < 0 || col >= cols) {
      return null;
    }

    const cellKey = `${row},${col}`;
    if (visited.has(cellKey)) {
      return null;
    }

    const cell = grid[row]?.[col];
    if (!cell || normalizeWord(cell, language) !== normalizedWord[index]) {
      return null;
    }

    visited.add(cellKey);
    const newPath = [...path, { row, col }];

    // All 8 adjacent directions
    const directions: [number, number][] = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];

    for (const [dr, dc] of directions) {
      const result = findPath(row + dr, col + dc, index + 1, visited, newPath);
      if (result) {
        return result;
      }
    }

    visited.delete(cellKey);
    return null;
  };

  // Try each starting position
  for (const start of startPositions) {
    const result = findPath(start.row, start.col, 0, new Set(), []);
    if (result) {
      return result;
    }
  }

  return [];
}

/**
 * Get partial highlighting for letters typed so far
 * Shows all possible positions for each letter in sequence
 */
function getPartialHighlight(
  grid: LetterGrid,
  word: string,
  language: string
): HighlightedCell[] {
  if (!word || word.length === 0 || !grid || grid.length === 0) {
    return [];
  }

  // First try to find a complete path
  const fullPath = findWordPath(grid, word, language);
  if (fullPath.length > 0) {
    return fullPath;
  }

  // If no complete path, highlight all positions of letters in the word
  // This gives visual feedback even if the word isn't fully valid yet
  const normalizedWord = normalizeWord(word, language);
  const highlighted: HighlightedCell[] = [];
  const usedPositions = new Set<string>();

  // Try to build a partial path matching as many letters as possible
  for (let i = 0; i < normalizedWord.length; i++) {
    const letter = normalizedWord[i];
    const positions = findLetterPositions(grid, letter, language);

    // Find the first position not already used
    let found = false;
    for (const pos of positions) {
      const key = `${pos.row},${pos.col}`;
      if (!usedPositions.has(key)) {
        // For first letter, accept any position
        // For subsequent letters, check adjacency to last highlighted cell
        if (i === 0) {
          highlighted.push(pos);
          usedPositions.add(key);
          found = true;
          break;
        } else {
          const lastCell = highlighted[highlighted.length - 1];
          if (lastCell) {
            const rowDiff = Math.abs(pos.row - lastCell.row);
            const colDiff = Math.abs(pos.col - lastCell.col);
            if (rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0)) {
              highlighted.push(pos);
              usedPositions.add(key);
              found = true;
              break;
            }
          }
        }
      }
    }

    // If we couldn't find a valid adjacent position, stop highlighting
    if (!found && i > 0) {
      break;
    }
  }

  return highlighted;
}

// ==================== Hook ====================

export function useKeyboardWordInput(options: UseKeyboardWordInputOptions): UseKeyboardWordInputReturn {
  const {
    grid,
    language,
    gameLanguage,
    enabled,
    onWordSubmit,
    onTypedWordChange,
    minWordLength = 2,
    disablePathHighlighting = false,
  } = options;

  const [typedWord, setTypedWord] = useState('');
  const [isTypingMode, setIsTypingMode] = useState(false);
  const typedWordRef = useRef('');
  const languageMismatchNotifiedRef = useRef(false);
  const isDesktop = useIsDesktop();
  const { t } = useLanguageSafe();

  // Keep ref in sync with state (inline, no effect needed)
  typedWordRef.current = typedWord;

  // Notify parent of typed word changes
  useEffect(() => {
    onTypedWordChange?.(typedWord);
  }, [typedWord, onTypedWordChange]);

  // Check if the typed word could be on the grid
  const isValidOnGrid = useMemo(() => {
    if (!typedWord || typedWord.length === 0) return true;
    return couldBeOnBoard(typedWord, grid, language);
  }, [typedWord, grid, language]);

  // Calculate highlighted cells based on typed word
  // Disabled in Word Hunt mode — showing the path would reveal the answer
  const highlightedCells = useMemo(() => {
    if (disablePathHighlighting) return [];
    if (!typedWord || typedWord.length === 0) return [];
    return getPartialHighlight(grid, typedWord, language);
  }, [typedWord, grid, language, disablePathHighlighting]);

  // Clear typed word
  const clearTypedWord = useCallback(() => {
    setTypedWord('');
    setIsTypingMode(false);
  }, []);

  // Submit typed word
  const submitTypedWord = useCallback(() => {
    const word = typedWordRef.current;
    if (word.length >= minWordLength && isValidOnGrid) {
      onWordSubmit?.(word, { inputMethod: 'kb' });
      setTypedWord('');
      setIsTypingMode(false);
    }
  }, [minWordLength, isValidOnGrid, onWordSubmit]);

  // Handle keyboard input
  useEffect(() => {
    if (!enabled) {
      // Clear any typed word when disabled
      if (typedWord) {
        setTypedWord('');
        setIsTypingMode(false);
      }
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field (shadow-DOM safe — see isTypingTarget)
      if (isTypingTarget(e)) {
        return;
      }

      // Handle Enter - submit word
      if (e.key === 'Enter') {
        e.preventDefault();
        if (typedWordRef.current.length >= minWordLength) {
          submitTypedWord();
        }
        return;
      }

      // Handle Escape - clear word
      if (e.key === 'Escape') {
        e.preventDefault();
        clearTypedWord();
        return;
      }

      // Handle Backspace - remove last character
      if (e.key === 'Backspace') {
        e.preventDefault();
        setTypedWord(prev => {
          const newWord = prev.slice(0, -1);
          if (newWord.length === 0) {
            setIsTypingMode(false);
          }
          return newWord;
        });
        return;
      }

      // Handle letter keys - add to word
      // Accept a-z, A-Z, and language-specific characters
      const key = e.key;

      // Check if it's a single printable character (letter)
      if (key.length === 1 && /[\p{L}]/u.test(key)) {
        e.preventDefault();

        // Desktop only: Check for language mismatch and show notification once per session
        if (isDesktop && gameLanguage && !languageMismatchNotifiedRef.current) {
          const inputLanguage = detectInputLanguage(key);

          // If input language detected and doesn't match board language
          if (inputLanguage && inputLanguage !== gameLanguage) {
            const langKeyMap: Record<string, string> = { he: 'joinView.hebrew', en: 'joinView.english', sv: 'joinView.swedish', ja: 'joinView.japanese', es: 'joinView.spanish' };
            const langName = t(langKeyMap[gameLanguage] || gameLanguage) || gameLanguage;
            toast.error(
              t('keyboardLanguageMismatch', { language: langName }),
              {
                duration: 5000,
                position: 'top-center',
                icon: '⌨️',
              }
            );
            languageMismatchNotifiedRef.current = true;
          }
        }

        setTypedWord(prev => prev + key.toUpperCase());
        setIsTypingMode(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, minWordLength, submitTypedWord, clearTypedWord]); // typedWord accessed via ref pattern inside handler

  // Clear typed word when grid changes (new game) and reset notification flag
  useEffect(() => {
    setTypedWord('');
    setIsTypingMode(false);
    languageMismatchNotifiedRef.current = false;
  }, [grid]);

  return {
    typedWord,
    isValidOnGrid,
    highlightedCells,
    clearTypedWord,
    submitTypedWord,
    isTypingMode,
  };
}

export default useKeyboardWordInput;
