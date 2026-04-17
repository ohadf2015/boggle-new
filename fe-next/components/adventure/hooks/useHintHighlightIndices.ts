/**
 * useHintHighlightIndices
 *
 * Derives the list of flat tile indices to highlight based on a priority
 * cascade: explicit hint → Time Freeze T2 longest-word → currentHint path
 * → Gem Detector starting tiles → none.
 *
 * Extracted from AdventureGame.tsx.
 */

import { useMemo } from 'react';

type Pos = { row: number; col: number };

interface HintData {
  level: string;
  highlightTiles?: Pos[];
}

interface UseHintHighlightIndicesProps {
  hintData: HintData;
  currentHint: { path: Pos[] } | null;
  gridSize: number;
  isFrozen: boolean;
  freezeHighlightsWord: boolean;
  remainingHintWords: string[];
  findPathForWord: (word: string) => Pos[] | null;
  gemDetectorHighlights: number[];
}

export function useHintHighlightIndices({
  hintData,
  currentHint,
  gridSize,
  isFrozen,
  freezeHighlightsWord,
  remainingHintWords,
  findPathForWord,
  gemDetectorHighlights,
}: UseHintHighlightIndicesProps): number[] {
  return useMemo(() => {
    if (hintData.level !== 'none' && (hintData.highlightTiles?.length ?? 0) > 0) {
      return hintData.highlightTiles!.map(pos => pos.row * gridSize + pos.col);
    }
    if (isFrozen && freezeHighlightsWord && remainingHintWords.length > 0) {
      const longestWord = remainingHintWords.reduce((a, b) => b.length > a.length ? b : a, '');
      const path = findPathForWord(longestWord);
      if (path) return path.map(pos => pos.row * gridSize + pos.col);
    }
    if (currentHint?.path) {
      return currentHint.path.map(pos => pos.row * gridSize + pos.col);
    }
    if (gemDetectorHighlights.length > 0) {
      return gemDetectorHighlights;
    }
    return [];
  }, [hintData, currentHint, gridSize, isFrozen, freezeHighlightsWord, remainingHintWords, findPathForWord, gemDetectorHighlights]);
}
