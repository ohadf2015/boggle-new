'use client';

import { useState, useEffect, useRef } from 'react';
import { generateRandomTable } from '@/utils/utils';
import { pickRichestBoardClient } from '@/lib/boardSelection';
import { DIFFICULTIES } from '@/utils/consts';
import type { LetterGrid, Language, DifficultyLevel } from '@/shared/types/game';

interface AvailableWords {
  easy: string[];
  medium: string[];
  hard: string[];
}

interface UseGridInitOptions {
  /** Game difficulty */
  difficulty: DifficultyLevel;
  /** Game language */
  language: Language;
  /** Game mode */
  mode: string;
  /** Callback to reset dependent state when grid changes */
  onGridChange?: () => void;
  /** Override rows from difficulty config (e.g. blast mode custom grid size) */
  rows?: number;
  /** Override cols from difficulty config (e.g. blast mode custom grid size) */
  cols?: number;
}

interface UseGridInitReturn {
  /** Current grid */
  grid: LetterGrid | null;
  /** Set grid (for earthquake regeneration) */
  setGrid: React.Dispatch<React.SetStateAction<LetterGrid | null>>;
  /** Available words categorized by difficulty */
  availableWords: AvailableWords | null;
  /** Total board words (5+ letters) */
  totalBoardWords: number | null;
  /** Ref to current grid for callbacks */
  gridRef: React.MutableRefObject<LetterGrid | null>;
  /** Ref to available words for callbacks */
  availableWordsRef: React.MutableRefObject<AvailableWords | null>;
  /** Grid version for tracking regenerations */
  gridVersion: number;
}

/** Minimum word length for tracking (5+ letters) */
const MIN_TRACKED_WORD_LENGTH = 5;

/**
 * Hook to handle grid initialization and word solving
 * Manages grid state, fetches themed words, and solves grid for available words
 */
export function useGridInit({
  difficulty,
  language,
  mode,
  onGridChange,
  rows: rowsOverride,
  cols: colsOverride,
}: UseGridInitOptions): UseGridInitReturn {
  const [grid, setGrid] = useState<LetterGrid | null>(null);
  const [availableWords, setAvailableWords] = useState<AvailableWords | null>(null);

  // Refs for callbacks to avoid stale closures
  const gridRef = useRef<LetterGrid | null>(null);
  const availableWordsRef = useRef<AvailableWords | null>(null);
  const gridVersionRef = useRef(0);

  // Keep refs in sync
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  useEffect(() => {
    availableWordsRef.current = availableWords;
  }, [availableWords]);

  // Calculate total board words from availableWords (only 5+ letter words)
  const totalBoardWords = availableWords
    ? new Set([
        ...availableWords.easy,
        ...availableWords.medium,
        ...availableWords.hard,
      ].filter(word => word.length >= MIN_TRACKED_WORD_LENGTH)).size
    : null;

  // Generate grid on mount
  useEffect(() => {
    const difficultyConfig = DIFFICULTIES[difficulty];
    const rows = rowsOverride ?? difficultyConfig.rows;
    const cols = colsOverride ?? difficultyConfig.cols;
    const totalCells = rows * cols;
    const baseWordCount = Math.min(35, Math.max(5, Math.floor(totalCells / 3)));
    const wordCount = mode === 'practice' ? Math.min(50, baseWordCount * 2) : baseWordCount;
    const maxWordLen = Math.min(12, Math.max(rows, cols));

    const initGrid = async (): Promise<void> => {
      let wordsToEmbed: string[] = [];

      // Fetch themed words for non-Japanese languages
      if (language !== 'ja') {
        try {
          const response = await fetch('/api/themed-words', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              language,
              count: wordCount,
              minLength: 3,
              maxLength: maxWordLen,
            }),
          });
          if (response.ok) {
            const data = await response.json();
            wordsToEmbed = data.words || [];
          }
        } catch (error) {
          console.warn('Failed to fetch themed words, using random grid:', error);
        }
      }

      const newGrid = pickRichestBoardClient(
        () => generateRandomTable(rows, cols, language, wordsToEmbed),
        language
      );
      setGrid(newGrid);
    };

    initGrid();
  }, [difficulty, language, mode, rowsOverride, colsOverride]);

  // Fetch valid words from grid for bots and word progress tracking.
  // Blast mode skips this entirely — it never uses availableWords and the
  // solve-grid API call (full Boggle solver) adds 200-500ms to initial load.
  useEffect(() => {
    if (!grid) return;

    // Increment grid version to track earthquake regenerations
    gridVersionRef.current += 1;
    const currentVersion = gridVersionRef.current;

    // Notify parent of grid change
    onGridChange?.();

    // Blast mode: set empty words immediately, skip expensive solver API
    if (mode === 'blast') {
      setAvailableWords({ easy: [], medium: [], hard: [] });
      return;
    }

    // Set timeout to ensure we get words even if API is slow/fails
    const timeoutId = setTimeout(() => {
      if (!availableWordsRef.current) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Grid solve API timed out (non-critical, using empty word list)');
        }
        setAvailableWords({ easy: [], medium: [], hard: [] });
      }
    }, 5000);

    const fetchGridWords = async (): Promise<void> => {
      try {
        const response = await fetch('/api/solve-grid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grid,
            language,
          }),
        });

        // Check if grid changed while fetching (ignore stale response)
        if (currentVersion !== gridVersionRef.current) return;

        if (!response.ok) {
          console.warn(`Grid solve API returned ${response.status}`);
          setAvailableWords({ easy: [], medium: [], hard: [] });
          return;
        }

        const result = await response.json();
        if (result.success && result.words) {
          setAvailableWords(result.words);
        } else {
          setAvailableWords({ easy: [], medium: [], hard: [] });
        }
      } catch (error) {
        console.error('Failed to fetch grid words:', error);
        setAvailableWords({ easy: [], medium: [], hard: [] });
      }
    };

    fetchGridWords();

    return () => clearTimeout(timeoutId);
  }, [grid, language, mode, onGridChange]);

  return {
    grid,
    setGrid,
    availableWords,
    totalBoardWords,
    gridRef,
    availableWordsRef,
    gridVersion: gridVersionRef.current,
  };
}
