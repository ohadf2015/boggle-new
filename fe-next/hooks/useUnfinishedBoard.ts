/**
 * useUnfinishedBoard
 *
 * Saves the current board + top 3 missed words to localStorage after each game.
 * Used to offer board replay on the landing page the next day.
 */

import { useCallback } from 'react';
import type { LetterGrid } from '@/shared/types/game';

const STORAGE_KEY = 'lexiclash_unfinished_board';
const TOP_WORDS_COUNT = 3;

export interface UnfinishedBoardData {
  grid: LetterGrid;
  missedWords: string[];
  date: string;
  mode: string;
  score: number;
}

export function useUnfinishedBoard() {
  const saveUnfinishedBoard = useCallback(
    (grid: LetterGrid, missedWords: string[], mode: string, score: number) => {
      if (missedWords.length < TOP_WORDS_COUNT) return;

      const data: UnfinishedBoardData = {
        grid,
        missedWords: missedWords.slice(0, TOP_WORDS_COUNT),
        date: new Date().toISOString().split('T')[0],
        mode,
        score,
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // localStorage full or unavailable — silently ignore
      }
    },
    []
  );

  const getUnfinishedBoard = useCallback((): UnfinishedBoardData | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as UnfinishedBoardData;
    } catch {
      return null;
    }
  }, []);

  const clearUnfinishedBoard = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { saveUnfinishedBoard, getUnfinishedBoard, clearUnfinishedBoard };
}
