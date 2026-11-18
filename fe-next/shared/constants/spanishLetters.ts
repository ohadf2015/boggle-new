/**
 * Frequency-weighted Spanish tiles for board generation, shared by the server
 * and client deals. Counts follow Spanish letter frequency, so J, Z and Q stay
 * rare and K, W, X are never dealt. Accented vowels are left out because
 * validation folds á→a; Ñ is kept because it stays distinct.
 */
const WEIGHTS: Record<string, number> = {
  E: 12, A: 12, O: 9, S: 8, R: 7, N: 7, I: 6, D: 6, L: 5, C: 5, T: 5, U: 4,
  M: 3, P: 3, B: 2, H: 1, Y: 1, V: 1, G: 1, F: 1, Q: 1, J: 1, Z: 1, Ñ: 1,
};

export const SPANISH_LETTER_POOL: string[] = Object.entries(WEIGHTS).flatMap(
  ([letter, count]) => Array<string>(count).fill(letter),
);
