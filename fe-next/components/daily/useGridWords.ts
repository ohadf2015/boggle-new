import { useState, useEffect } from 'react';
import type { LetterGrid, Language } from '@/types';

interface GridWords {
  easy: string[];
  medium: string[];
  hard: string[];
}

/** Fetches valid words from the grid solver API for the first-play tutorial. */
export function useGridWords(grid: LetterGrid, language: Language): GridWords | null {
  const [availableWords, setAvailableWords] = useState<GridWords | null>(null);

  useEffect(() => {
    if (!grid) return;

    const fetchGridWords = async () => {
      try {
        const response = await fetch('/api/solve-grid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grid, language }),
        });

        if (!response.ok) {
          setAvailableWords({ easy: [], medium: [], hard: [] });
          return;
        }

        const result = await response.json();
        if (result.success && result.words) {
          setAvailableWords(result.words);
        } else {
          setAvailableWords({ easy: [], medium: [], hard: [] });
        }
      } catch {
        setAvailableWords({ easy: [], medium: [], hard: [] });
      }
    };

    fetchGridWords();
  }, [grid, language]);

  return availableWords;
}
