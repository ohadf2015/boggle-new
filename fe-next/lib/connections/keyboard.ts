/**
 * Word Bridge on-screen keyboard — pure logic (no React).
 *
 * The game replaced its free-text <input> with tappable letter buttons so
 * Hebrew players never need an IME / physical keyboard. Bridge answers are
 * compared in BASE form (see canonicalize in gameLogic), so the Hebrew
 * keyboard exposes the 22 base letters only — sofit glyphs are rendered at
 * word-end by applyHebrewFinalLetters, never typed.
 *
 * Mirrors the proven lib/wordAlchemy/keyboard.ts shape.
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

/**
 * 32 Cyrillic base letters, А → Я without Ё. Like Hebrew sofit forms, Ё is a
 * render-time variant: canonicalize() NFD-folds ё→е on both sides, so the
 * player types Е and ё-bridges still match.
 */
const RUSSIAN_LETTERS = [
  'А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'Й', 'К',
  'Л', 'М', 'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф', 'Х',
  'Ц', 'Ч', 'Ш', 'Щ', 'Ъ', 'Ы', 'Ь', 'Э', 'Ю', 'Я',
];

/** Upper bound on a guess — longest curated bridge is well under this; guards
 *  against a stuck-finger runaway. */
export const MAX_GUESS_LEN = 12;

/** Letters to render on the keyboard for a given locale. */
export function getKeyboardLetters(locale: string): string[] {
  if (locale === 'he') return HEBREW_LETTERS;
  if (locale === 'ru') return RUSSIAN_LETTERS;
  return ENGLISH_LETTERS;
}

/**
 * Locales whose script can't fit on a finite on-screen keyboard and must use
 * the device's native IME instead (a real text input). Japanese (kanji) is the
 * case today — there are thousands of glyphs, so the player composes via their
 * OS IME rather than tapping letter keys.
 */
export function localeNeedsIME(locale: string): boolean {
  return locale === 'ja';
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
