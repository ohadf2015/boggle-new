import { useMemo, useCallback } from 'react';
import { isWordOnBoard } from '@/utils/utils';
import type { LetterGrid, Language } from '@/types';

export interface UseDrillWordSubmitProps {
  grid: LetterGrid;
  language: Language;
  availableWords: { word: string; path: { row: number; col: number }[] }[];
  wordsFound: string[];
  phase: string;
  playingPhase: string;
  playErrorSound?: () => void;
  t: (key: string) => string;
}

export interface WordValidationResult {
  valid: boolean;
  upperWord: string;
  error?: string;
}

export interface UseDrillWordSubmitReturn {
  validateWord: (word: string) => WordValidationResult;
  availableWordSet: Set<string>;
}

export function useDrillWordSubmit({
  grid,
  language,
  availableWords,
  wordsFound,
  phase,
  playingPhase,
  playErrorSound,
  t,
}: UseDrillWordSubmitProps): UseDrillWordSubmitReturn {
  const availableWordSet = useMemo(
    () => new Set(availableWords.map(w => w.word.toUpperCase())),
    [availableWords]
  );

  const validateWord = useCallback(
    (word: string): WordValidationResult => {
      const upperWord = word.toUpperCase();

      if (phase !== playingPhase) {
        return { valid: false, upperWord, error: 'notPlaying' };
      }

      if (!isWordOnBoard(upperWord, grid, language)) {
        playErrorSound?.();
        return { valid: false, upperWord, error: t('brain.drills.errors.notOnBoard') };
      }

      if (wordsFound.includes(upperWord)) {
        playErrorSound?.();
        return { valid: false, upperWord, error: t('brain.drills.errors.alreadyFound') };
      }

      if (!availableWordSet.has(upperWord)) {
        playErrorSound?.();
        return { valid: false, upperWord, error: t('brain.drills.errors.invalidWord') };
      }

      return { valid: true, upperWord };
    },
    [phase, playingPhase, grid, language, wordsFound, availableWordSet, playErrorSound, t]
  );

  return { validateWord, availableWordSet };
}
