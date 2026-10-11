'use client';

import { useCallback } from 'react';
import { findWordPath, useKeyboardWordInput } from '@/hooks/useKeyboardWordInput';
import type { LetterGrid } from '@/types';

interface UseBlastKeyboardOptions {
  grid: LetterGrid;
  language: string;
  enabled: boolean;
  onPathSubmit: (cells: Array<{ row: number; col: number }>) => void;
}

/** Blast scores tiles, not words, so a typed word is resolved to its board path before it is sent. */
export function useBlastKeyboard({ grid, language, enabled, onPathSubmit }: UseBlastKeyboardOptions) {
  const submit = useCallback(
    (word: string) => {
      const path = findWordPath(grid, word, language);
      if (path.length === word.length) onPathSubmit(path);
    },
    [grid, language, onPathSubmit],
  );
  return useKeyboardWordInput({ grid, language, gameLanguage: null, enabled, onWordSubmit: submit, minWordLength: 3 });
}
