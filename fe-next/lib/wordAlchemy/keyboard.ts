/**
 * Word Alchemy on-screen keyboard — pure logic (no React).
 *
 * The game replaced a free-text <input> with tappable letter buttons so Hebrew
 * players never need an IME / physical keyboard. Answers are stored base-form,
 * so the Hebrew keyboard exposes the 22 base letters only (sofit glyphs are
 * rendered at word-end by applyHebrewFinalLetters, never typed).
 */

/** 22 Hebrew base letters, alef → tav (no final/sofit forms). */
const HEBREW_LETTERS = [
  'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ',
  'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת',
];

/** A–Z. */
const ENGLISH_LETTERS = Array.from({ length: 26 }, (_, i) =>
  String.fromCharCode(65 + i),
);

/** Upper bound on a guess — longest curated answer is well under this; guards
 *  against a stuck-finger runaway. */
export const MAX_GUESS_LEN = 12;

/** Letters to render on the keyboard for a given locale. */
export function getKeyboardLetters(locale: string): string[] {
  return locale === 'he' ? HEBREW_LETTERS : ENGLISH_LETTERS;
}

/** Append a tapped letter to the current guess (capped at MAX_GUESS_LEN). */
export function appendLetter(current: string, letter: string): string {
  if (current.length >= MAX_GUESS_LEN) return current;
  return current + letter;
}

/** Remove the last character (no-op on empty). */
export function backspace(current: string): string {
  return current.slice(0, -1);
}
