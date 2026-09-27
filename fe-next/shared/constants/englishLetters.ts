/**
 * Frequency-weighted English letters for board generation.
 *
 * A uniform A–Z draw makes Q, Z, X and J as common as E — about 15% of tiles
 * are near-dead, so boards hold fewer words than players expect. Counts follow
 * the Scrabble tile distribution (built for word games, not prose), with S
 * raised from 4 to 6 because plurals are legal and Boggle-style play rewards
 * them. Every letter keeps at least one copy. Same idea as the RU/ES pools.
 */
const WEIGHTS: Record<string, number> = {
  E: 12, A: 9, I: 9, O: 8, N: 6, R: 6, T: 6, S: 6, L: 4, U: 4, D: 4,
  G: 3, B: 2, C: 2, M: 2, P: 2, F: 2, H: 2, V: 2, W: 2, Y: 2,
  K: 1, J: 1, X: 1, Q: 1, Z: 1,
};

export const ENGLISH_LETTER_POOL: string[] = Object.entries(WEIGHTS).flatMap(
  ([letter, count]) => Array<string>(count).fill(letter),
);
