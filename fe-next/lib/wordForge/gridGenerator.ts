/**
 * Word Forge Grid Generator
 *
 * Generates 5×5 (or 4×4 for shrink constraint) Boggle-style letter grids.
 * Reuses letter frequency logic from adventure grid generator.
 */

import { RARE_CONSONANTS, generateAdventureGrid } from '@/lib/adventure/gridGenerator';
import type { GridSize } from '@/lib/adventure/gridConstants';
import type { Language } from '@/types';

/**
 * Generate a Boggle-style letter grid for Word Forge.
 *
 * English keeps its hand-tuned distribution (below). Every other language
 * delegates to the shared `generateAdventureGrid`, which has per-language
 * letter generators (Hebrew matres-lectionis clustering, Japanese hiragana,
 * Swedish) so a Hebrew player gets Hebrew tiles instead of English ones.
 *
 * Ensures good English letter distribution:
 * - ~35-40% vowels (7-8 of 25 tiles)
 * - Common consonants weighted higher
 * - At least 1 rare consonant for scoring opportunities
 */
export function generateWordForgeGrid(size: number = 5, language: Language = 'en'): string[][] {
  if (language !== 'en') {
    return generateAdventureGrid(size as GridSize, undefined, language);
  }

  const totalTiles = size * size;
  const vowelCount = Math.round(totalTiles * 0.36); // ~9 for 5×5
  const rareCount = Math.max(1, Math.floor(totalTiles * 0.08)); // ~2 for 5×5
  const commonCount = totalTiles - vowelCount - rareCount;

  const letters: string[] = [];

  // Add vowels (weighted: E and A more common)
  const vowelWeights = ['E', 'E', 'A', 'A', 'I', 'O', 'U'];
  for (let i = 0; i < vowelCount; i++) {
    letters.push(vowelWeights[Math.floor(Math.random() * vowelWeights.length)]);
  }

  // Add common consonants (weighted)
  const commonWeights = ['R', 'S', 'S', 'T', 'T', 'L', 'N', 'N', 'D', 'C', 'M', 'P', 'B'];
  for (let i = 0; i < commonCount; i++) {
    letters.push(commonWeights[Math.floor(Math.random() * commonWeights.length)]);
  }

  // Add rare consonants
  for (let i = 0; i < rareCount; i++) {
    letters.push(RARE_CONSONANTS[Math.floor(Math.random() * RARE_CONSONANTS.length)]);
  }

  // Shuffle using Fisher-Yates
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }

  // Form into grid
  const grid: string[][] = [];
  for (let row = 0; row < size; row++) {
    grid.push(letters.slice(row * size, (row + 1) * size));
  }

  return grid;
}
