/**
 * Shared yellow-letter logic for Word Hunt (SP & MP).
 *
 * Handles:
 * - Green-removes-yellow: when all target occurrences of a letter are found green
 * - Latest-position-wins: only the most recent yellow position per letter persists
 * - Frequency capping: yellows capped by target letter count minus green count
 */

import type { TargetAttempt, AccumulatedClue } from '@/components/daily/survival/types';

/**
 * Infer target letter frequencies from feedback patterns.
 * For each attempt, count non-gray (green+yellow) per letter, then take max across attempts.
 * This gives a lower bound of the true target frequency — sufficient for capping.
 */
export function inferTargetLetterCounts(
  attempts: TargetAttempt[]
): Map<string, number> {
  const maxCounts = new Map<string, number>();

  for (const attempt of attempts) {
    const attemptCounts = new Map<string, number>();
    for (const fb of attempt.feedback) {
      if (fb.feedback === 'green' || fb.feedback === 'yellow') {
        const letter = fb.letter.toUpperCase();
        attemptCounts.set(letter, (attemptCounts.get(letter) || 0) + 1);
      }
    }
    attemptCounts.forEach((count, letter) => {
      maxCounts.set(letter, Math.max(maxCounts.get(letter) || 0, count));
    });
  }

  return maxCounts;
}

/**
 * Build exact letter counts from a known target word.
 */
export function exactLetterCounts(targetWord: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ch of targetWord.toUpperCase()) {
    counts.set(ch, (counts.get(ch) || 0) + 1);
  }
  return counts;
}

interface YellowStateResult {
  persistedLetters: Map<number, { letter: string; type: 'green' | 'yellow' }>;
  knownLetters: Set<string>;
}

/**
 * Compute which letters to display as green/yellow in hint boxes,
 * and which letters belong in the "known letters" badge set.
 *
 * @param attempts - all target guesses (oldest first)
 * @param letterCounts - target letter frequencies (exact or inferred)
 * @param accumulatedClues - greens from non-attempt sources (shop, discovery)
 */
export function computeYellowState(
  attempts: TargetAttempt[],
  letterCounts: Map<string, number>,
  accumulatedClues: Map<number, AccumulatedClue>
): YellowStateResult {
  const result = new Map<number, { letter: string; type: 'green' | 'yellow' }>();

  // 1. Collect all greens from attempts
  for (const attempt of attempts) {
    for (const fb of attempt.feedback) {
      if (fb.feedback === 'green') {
        result.set(fb.position, { letter: fb.letter.toUpperCase(), type: 'green' });
      }
    }
  }

  // 2. Count greens from both attempts and accumulatedClues (dedup by position)
  const greenLetterCounts = new Map<string, number>();
  const countedPositions = new Set<number>();

  result.forEach((entry, position) => {
    if (entry.type === 'green') {
      greenLetterCounts.set(entry.letter, (greenLetterCounts.get(entry.letter) || 0) + 1);
      countedPositions.add(position);
    }
  });

  accumulatedClues.forEach((clue, position) => {
    if (clue.type === 'green' && !countedPositions.has(position)) {
      const letter = clue.letter.toUpperCase();
      greenLetterCounts.set(letter, (greenLetterCounts.get(letter) || 0) + 1);
      countedPositions.add(position);
    }
  });

  // 3. Process yellows newest-first so "latest position wins"
  // We iterate attempts in reverse; within each attempt, iterate feedback in reverse
  // to prefer higher positions when there's a tie within the same attempt.
  const reversedAttempts = [...attempts].reverse();

  for (const attempt of reversedAttempts) {
    for (const fb of attempt.feedback) {
      if (fb.feedback !== 'yellow') continue;

      const letter = fb.letter.toUpperCase();
      const existing = result.get(fb.position);

      // Skip if position already claimed (green or yellow from a newer attempt)
      if (existing) continue;
      if (accumulatedClues.get(fb.position)?.type === 'green') continue;

      // Count current yellows for this letter (excluding current position)
      let currentYellowCount = 0;
      result.forEach((entry, pos) => {
        if (entry.type === 'yellow' && entry.letter === letter && pos !== fb.position) {
          currentYellowCount++;
        }
      });

      const targetCount = letterCounts.get(letter) || 0;
      const greenCount = greenLetterCounts.get(letter) || 0;
      const maxYellows = Math.max(0, targetCount - greenCount);

      if (currentYellowCount < maxYellows) {
        result.set(fb.position, { letter, type: 'yellow' });
      }
    }
  }

  // 4. Remove yellows where all occurrences are found green
  const positionsToRemove: number[] = [];
  result.forEach((entry, position) => {
    if (entry.type === 'yellow') {
      const targetCount = letterCounts.get(entry.letter) || 0;
      const greenCount = greenLetterCounts.get(entry.letter) || 0;
      if (greenCount >= targetCount) {
        positionsToRemove.push(position);
      }
    }
  });
  positionsToRemove.forEach(pos => result.delete(pos));

  // 5. Build knownLetters: letters with yellows still showing
  const knownLetters = new Set<string>();
  result.forEach(entry => {
    if (entry.type === 'yellow') {
      knownLetters.add(entry.letter);
    }
  });

  return { persistedLetters: result, knownLetters };
}
