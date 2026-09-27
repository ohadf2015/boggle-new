/**
 * Word Hunt Feedback System
 *
 * Implements Wordle-style letter feedback (green/yellow/gray) for the Word Hunt daily challenge mode.
 * Compares submitted words against the target word and returns position-based feedback.
 */

import type { Language } from '@/types';
import { normalizeHebrewLetter, sanitizeWord } from '@/shared/utils/wordNormalization';
import { findWordPath } from '@/utils/wordPathFinder';

export type FeedbackType = 'green' | 'yellow' | 'gray';

export interface LetterFeedback {
  letter: string;
  feedback: FeedbackType;
  position: number; // 0-indexed position in submitted word
}

/**
 * Compare submitted word against target word and return Wordle-style feedback
 *
 * Logic (identical to Wordle):
 * 1. First pass: Mark all exact position matches as GREEN
 * 2. Second pass: For remaining letters, check if they exist elsewhere in target
 *    - If yes → YELLOW
 *    - If no → GRAY
 * 3. Handle duplicate letters correctly (only mark as many yellows as exist in target)
 *
 * @param submittedWord - The word the player submitted
 * @param targetWord - The hidden target word to find
 * @returns Array of feedback for each letter
 *
 * @example
 * ```typescript
 * getLetterFeedback('SCALE', 'CASTLE')
 * // Returns:
 * // [
 * //   { letter: 'S', feedback: 'green', position: 0 },   // S is at position 0 in both
 * //   { letter: 'C', feedback: 'yellow', position: 1 },  // C exists but not at position 1
 * //   { letter: 'A', feedback: 'yellow', position: 2 },  // A exists but not at position 2
 * //   { letter: 'L', feedback: 'gray', position: 3 },    // L not in CASTLE
 * //   { letter: 'E', feedback: 'green', position: 4 }    // E is at position 4 in both
 * // ]
 * ```
 */
export function getLetterFeedback(
  submittedWord: string,
  targetWord: string,
  language?: Language
): LetterFeedback[] {
  // Sanitize words to remove invisible Unicode characters (RTL marks, niqqud, etc.)
  // This fixes length mismatches that cause "?" padding in feedback tiles
  const sanitizedSubmitted = sanitizeWord(submittedWord, language);
  const sanitizedTarget = sanitizeWord(targetWord, language);

  const submitted = sanitizedSubmitted.toUpperCase();
  const target = sanitizedTarget.toUpperCase();

  const feedback: LetterFeedback[] = [];

  // For Hebrew, normalize final letters to regular forms for comparison
  // This ensures ם matches מ, ך matches כ, etc.
  const normalizeForComparison = (letter: string): string => {
    if (language === 'he') {
      return normalizeHebrewLetter(letter);
    }
    return letter;
  };

  const targetLetters = target.split('');
  const submittedLetters = submitted.split('');

  // Create normalized versions for comparison
  const targetNormalized = targetLetters.map(normalizeForComparison);
  const submittedNormalized = submittedLetters.map(normalizeForComparison);

  // Track which letters in target have been "used" for feedback
  const targetUsed: boolean[] = new Array(targetLetters.length).fill(false);
  const submittedProcessed: FeedbackType[] = new Array(submittedLetters.length).fill('gray');

  // First pass: Mark all exact position matches as GREEN
  // Use normalized letters for comparison to handle Hebrew final letters
  for (let i = 0; i < submittedNormalized.length; i++) {
    if (i < targetNormalized.length && submittedNormalized[i] === targetNormalized[i]) {
      submittedProcessed[i] = 'green';
      targetUsed[i] = true;
    }
  }

  // Second pass: Mark yellows for letters that exist elsewhere
  for (let i = 0; i < submittedNormalized.length; i++) {
    // Skip if already marked green
    if (submittedProcessed[i] === 'green') {
      continue;
    }

    const normalizedLetter = submittedNormalized[i];

    // Find if this letter exists in target (at a position that hasn't been used)
    // Use normalized comparison for Hebrew final letter support
    const targetIndex = targetNormalized.findIndex(
      (targetLetter, idx) => targetLetter === normalizedLetter && !targetUsed[idx]
    );

    if (targetIndex !== -1) {
      submittedProcessed[i] = 'yellow';
      targetUsed[targetIndex] = true;
    }
    // else: remains 'gray'
  }

  // Build final feedback array
  for (let i = 0; i < submittedLetters.length; i++) {
    feedback.push({
      letter: submittedLetters[i],
      feedback: submittedProcessed[i],
      position: i,
    });
  }

  return feedback;
}

/**
 * Get emoji representation of feedback (for sharing)
 *
 * @param feedback - Array of letter feedback
 * @returns String of emoji squares (🟩🟨⬜)
 *
 * @example
 * ```typescript
 * const feedback = getLetterFeedback('SCALE', 'CASTLE');
 * feedbackToEmoji(feedback); // Returns: '🟩🟨🟨⬜🟩'
 * ```
 */
export function feedbackToEmoji(feedback: LetterFeedback[]): string {
  return feedback
    .map(f => {
      switch (f.feedback) {
        case 'green': return '🟩';
        case 'yellow': return '🟨';
        case 'gray': return '⬜';
        default: return '⬜';
      }
    })
    .join('');
}

/**
 * Check if the submitted word is the target word (all green)
 *
 * @param feedback - Array of letter feedback
 * @returns true if all letters are green (word found!)
 */
export function isTargetWordFound(feedback: LetterFeedback[]): boolean {
  return feedback.length > 0 && feedback.every(f => f.feedback === 'green');
}

/**
 * Get letter knowledge from all previous attempts
 * Useful for showing keyboard hints (which letters are green/yellow/gray)
 *
 * @param allAttempts - Array of all previous attempts with feedback
 * @returns Map of letter → best feedback type seen so far
 *
 * Priority: green > yellow > gray
 */
export function getLetterKnowledge(
  allAttempts: Array<{ word: string; feedback: LetterFeedback[] }>
): Map<string, FeedbackType> {
  const knowledge = new Map<string, FeedbackType>();

  for (const attempt of allAttempts) {
    for (const letterFeedback of attempt.feedback) {
      const letter = letterFeedback.letter.toUpperCase();
      const currentKnowledge = knowledge.get(letter);

      // Update if we learned something better
      // Priority: green > yellow > gray
      if (letterFeedback.feedback === 'green') {
        knowledge.set(letter, 'green');
      } else if (letterFeedback.feedback === 'yellow' && currentKnowledge !== 'green') {
        knowledge.set(letter, 'yellow');
      } else if (letterFeedback.feedback === 'gray' && !currentKnowledge) {
        knowledge.set(letter, 'gray');
      }
    }
  }

  return knowledge;
}

/**
 * Validate that a word can be formed on the Boggle board
 * Uses DFS path-finding to verify the word can be traced through adjacent cells
 *
 * @param word - Word to validate
 * @param grid - The letter grid (2D array of letters)
 * @param language - Language for normalization (defaults to 'en')
 * @returns true if word can be formed on board using adjacent cells
 *
 * @example
 * ```typescript
 * const grid = [
 *   ['C', 'A', 'T'],
 *   ['D', 'O', 'G'],
 *   ['X', 'Y', 'Z']
 * ];
 * canFormWordOnBoard('CAT', grid); // true - C→A→T are adjacent
 * canFormWordOnBoard('COG', grid); // false - C and O are not adjacent
 * ```
 */
export function canFormWordOnBoard(
  word: string,
  grid: string[][],
  language: Language = 'en'
): boolean {
  // Handle edge cases
  if (!word || word.length === 0) return false;
  if (!grid || grid.length === 0 || !grid[0] || grid[0].length === 0) return false;

  // Use the existing path-finding algorithm
  const path = findWordPath(word, grid, language);
  return path !== null;
}
