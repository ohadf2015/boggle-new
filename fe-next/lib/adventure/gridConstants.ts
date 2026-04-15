/**
 * Letter pools and frequency weights for adventure grid generation.
 * Separated from gridGenerator so other modules can import only the
 * constants they need without pulling in simplex-noise.
 */

// ==============================================
// ENGLISH
// ==============================================

export const VOWELS = ['A', 'E', 'I', 'O', 'U'];

export const COMMON_CONSONANTS = [
  'R', 'S', 'T', 'L', 'N', 'D', 'C', 'M', 'P', 'B',
];

export const RARE_CONSONANTS = [
  'F', 'G', 'H', 'K', 'V', 'W', 'Y', 'J', 'X', 'Q', 'Z',
];

/** Frequency-weighted English letter pool — rough match to written English. */
export const ENGLISH_LETTER_WEIGHTS: Record<string, number> = {
  E: 12, T: 9, A: 8, O: 8, I: 7, N: 7, S: 6, H: 6, R: 6,
  D: 4, L: 4, C: 3, U: 3, M: 3, W: 2, F: 2, G: 2, Y: 2, P: 2,
  B: 1, V: 1, K: 1, J: 1, X: 1, Q: 1, Z: 1,
};

// ==============================================
// HEBREW
// ==============================================

/** Matres lectionis + common letters — the high-value cluster. */
export const HEBREW_COMMON_LETTERS = ['א', 'ה', 'ו', 'י', 'ל', 'מ', 'נ', 'ר', 'ש', 'ת'];

export const HEBREW_LETTER_WEIGHTS: Record<string, number> = {
  'י': 10, // yod
  'ו': 9,  // vav
  'ה': 8,  // he
  'א': 7,  // alef
  'ל': 7,  // lamed
  'מ': 6,  // mem
  'ר': 6,  // resh
  'נ': 5,  // nun
  'ש': 5,  // shin
  'ת': 5,  // tav
  'ב': 4,  // bet
  'כ': 4,  // kaf
  'ע': 4,  // ayin
  'ד': 3,  // dalet
  'ח': 3,  // chet
  'ק': 3,  // qof
  'פ': 2,  // pe
  'ס': 2,  // samekh
  'ג': 2,  // gimel
  'ז': 2,  // zayin
  'צ': 2,  // tsade
  'ט': 1,  // tet
};

// ==============================================
// SWEDISH
// ==============================================

export const SWEDISH_COMMON_LETTERS = ['A', 'E', 'I', 'O', 'R', 'S', 'T', 'N', 'L', 'D'];

export const SWEDISH_LETTER_WEIGHTS: Record<string, number> = {
  E: 10, A: 9, N: 8, R: 7, T: 7, S: 6, I: 6, L: 5, O: 5,
  D: 4, K: 4, M: 4, G: 3, H: 3, V: 3, Ä: 3, Å: 2, Ö: 2,
  F: 2, P: 2, U: 2, B: 2, C: 1, J: 1, Y: 1, X: 1, Z: 1, W: 1, Q: 1,
};

/** Swedish vowels including diacritics — used by generateSwedishGrid. */
export const SWEDISH_VOWELS = ['A', 'E', 'I', 'O', 'U', 'Å', 'Ä', 'Ö'];

// ==============================================
// TYPES
// ==============================================

export type GridSize = 4 | 5 | 6 | 7;
