/**
 * Board generation for the standalone build.
 *
 * Uses the classic 16 Boggle dice (balanced letter distribution — the reason
 * real Boggle boards play well) instead of the main app's uniform A–Z pool,
 * then picks the best of K boards by a cheap vowel/rarity heuristic. NO
 * full-solve here (that needs a trie and risks the depth-15 DFS hang the app
 * has hit); heuristic quality is enough for a fun 4×4.
 *
 * "Qu" dice faces are mapped to "Q" so every tile is a single character and the
 * adjacency DFS stays simple. (v1 tradeoff — slightly fewer Q-words.)
 */

export type LetterGrid = string[][];

// Classic Boggle (1992) dice set, 16 dice × 6 faces.
const DICE: string[][] = [
  ['A', 'A', 'E', 'E', 'G', 'N'], ['A', 'B', 'B', 'J', 'O', 'O'],
  ['A', 'C', 'H', 'O', 'P', 'S'], ['A', 'F', 'F', 'K', 'P', 'S'],
  ['A', 'O', 'O', 'T', 'T', 'W'], ['C', 'I', 'M', 'O', 'T', 'U'],
  ['D', 'E', 'I', 'L', 'R', 'X'], ['D', 'E', 'L', 'R', 'V', 'Y'],
  ['D', 'I', 'S', 'T', 'T', 'Y'], ['E', 'E', 'G', 'H', 'N', 'W'],
  ['E', 'E', 'I', 'N', 'S', 'U'], ['E', 'H', 'R', 'T', 'V', 'W'],
  ['E', 'I', 'O', 'S', 'S', 'T'], ['E', 'L', 'R', 'T', 'T', 'Y'],
  ['H', 'I', 'M', 'N', 'U', 'Q'], ['H', 'L', 'N', 'N', 'R', 'Z'],
];

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);
const RARE = new Set(['Q', 'X', 'Z', 'J', 'K', 'V']);

function rollBoard(): LetterGrid {
  // Shuffle dice order (Fisher–Yates), roll each, lay into a 4×4 grid.
  const dice = DICE.slice();
  for (let i = dice.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dice[i], dice[j]] = [dice[j], dice[i]];
  }
  const letters = dice.map((d) => d[Math.floor(Math.random() * d.length)]);
  const grid: LetterGrid = [];
  for (let r = 0; r < 4; r++) grid.push(letters.slice(r * 4, r * 4 + 4));
  return grid;
}

/** Higher = more playable. Rewards a healthy vowel count, penalizes rare-letter pileups. */
export function scoreBoard(grid: LetterGrid): number {
  const flat = grid.flat();
  const vowels = flat.filter((c) => VOWELS.has(c)).length;
  const rare = flat.filter((c) => RARE.has(c)).length;
  // Ideal vowel band 5–7 of 16; each step outside costs points. Rare letters cost 1.5 each.
  const vowelPenalty = Math.abs(vowels - 6);
  return 100 - vowelPenalty * 3 - rare * 1.5;
}

/** Best of K rolled boards by heuristic. */
export function generateBoard(k = 8): LetterGrid {
  let best = rollBoard();
  let bestScore = scoreBoard(best);
  for (let i = 1; i < k; i++) {
    const cand = rollBoard();
    const s = scoreBoard(cand);
    if (s > bestScore) {
      best = cand;
      bestScore = s;
    }
  }
  return best;
}
