/**
 * useGemDetectorHighlights Hook
 *
 * When the Gem Detector upgrade is active, highlights the starting tiles
 * of the highest-scoring available words on the grid.
 * Level 1 = 1 highlight, Level 2 = 2, Level 3 = 3.
 */

'use client';

import { useMemo } from 'react';
import type { GridPosition } from './useAdventureHints';

interface ComputeGemDetectorHighlightsOptions {
  /** Gem Detector upgrade level (0 = not purchased) */
  gemDetectorLevel: number;
  /** Remaining unfound words sorted by any order */
  remainingWords: string[];
  /** Function to find a path for a given word on the grid */
  findPathForWord: (word: string) => GridPosition[] | null;
  /** Grid size (used to convert row,col to flat index) */
  gridSize: number;
}

/**
 * Pure function: compute highlighted tile indices for the Gem Detector upgrade.
 * Selects the longest (highest-scoring) remaining words and returns the flat
 * index of each word's starting tile.
 */
export function computeGemDetectorHighlights({
  gemDetectorLevel,
  remainingWords,
  findPathForWord,
  gridSize,
}: ComputeGemDetectorHighlightsOptions): number[] {
  if (gemDetectorLevel <= 0 || remainingWords.length === 0) return [];

  const maxHighlights = Math.min(gemDetectorLevel, 3);

  // Sort by length descending (longer words = higher score)
  const sorted = [...remainingWords].sort((a, b) => b.length - a.length);

  const highlights: number[] = [];
  const seen = new Set<number>();

  for (const word of sorted) {
    if (highlights.length >= maxHighlights) break;

    const path = findPathForWord(word);
    if (!path || path.length === 0) continue;

    const startPos = path[0];
    const flatIndex = startPos.row * gridSize + startPos.col;

    if (seen.has(flatIndex)) continue;

    seen.add(flatIndex);
    highlights.push(flatIndex);
  }

  return highlights;
}

/**
 * React hook wrapper around computeGemDetectorHighlights.
 */
export function useGemDetectorHighlights(
  options: ComputeGemDetectorHighlightsOptions
): number[] {
  const { gemDetectorLevel, remainingWords, findPathForWord, gridSize } = options;
  return useMemo(
    () => computeGemDetectorHighlights({ gemDetectorLevel, remainingWords, findPathForWord, gridSize }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gemDetectorLevel, remainingWords, gridSize]
  );
}
