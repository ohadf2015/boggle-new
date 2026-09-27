/**
 * Regression: words written via override_word + grid=NULL (the prod fix path AND
 * the nightly validator's saveReplacement path) must actually place on the
 * generated grid and be findable. If the generator can't place a word it silently
 * falls through to a deterministic different word — and any stored meaning would
 * then describe a word nobody sees. Hebrew final-letter words (ending in ם/ן/...)
 * are the risk, so they are covered explicitly.
 */
import { describe, it, expect } from 'vitest';
import { generateDailyPuzzle } from '../gridGeneration';
import { isWordOnGrid } from '../gridPathFinding';
import { normalizeHebrewFinalLetters } from '../constants';
import type { Language } from '../../../types';

// The Hebrew override words shipped on 2026-06-30 (final-mem: פרחים/צבעים/ספרים).
const HE_OVERRIDES: Array<[string, string]> = [
  ['2026-06-30', 'גלידה'],
  ['2026-07-01', 'פרחים'],
  ['2026-07-03', 'חופשה'],
  ['2026-07-04', 'עוגיות'],
  ['2026-07-05', 'צבעים'],
  ['2026-07-06', 'ספרים'],
];

// A couple of non-Hebrew replacements for good measure.
const OTHER_OVERRIDES: Array<[string, Language, string]> = [
  ['2026-07-01', 'en', 'PLANET'],
  ['2026-07-05', 'sv', 'STJÄRNA'],
  ['2026-07-01', 'es', 'VENTANA'],
];

describe('override_word gridding (serve-time regeneration path)', () => {
  it.each(HE_OVERRIDES)('places + finds Hebrew override %s "%s"', (date, word) => {
    const puzzle = generateDailyPuzzle(date, 'he', word);
    // The served word must be the one we asked for (not a deterministic fallback).
    expect(normalizeHebrewFinalLetters(puzzle.targetWord)).toBe(normalizeHebrewFinalLetters(word));
    expect(isWordOnGrid(puzzle.targetWord, puzzle.grid)).toBe(true);
  });

  it.each(OTHER_OVERRIDES)('places + finds %s override "%s"', (date, lang, word) => {
    const puzzle = generateDailyPuzzle(date, lang, word);
    expect(puzzle.targetWord.toUpperCase()).toBe(word.toUpperCase());
    expect(isWordOnGrid(puzzle.targetWord, puzzle.grid)).toBe(true);
  });
});
