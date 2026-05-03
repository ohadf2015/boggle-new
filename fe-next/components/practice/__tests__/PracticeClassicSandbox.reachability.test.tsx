/**
 * Curation contract: every word in the per-locale VALID_WORDS set must be
 * physically formable by walking adjacent cells on the per-locale BOARD.
 *
 * Sandbox UI happily accepts any word in the valid set, but the player can
 * only submit one whose tap sequence is adjacency-connected. Words that
 * appear in the set but can't be traced are dead content — they look
 * available but the player can never claim them.
 *
 * This test re-implements the BFS-style search the player would do mentally
 * and asserts every curated word has at least one valid path. New entries
 * to VALID_WORDS will fail this test if they can't be reached, forcing the
 * curator to either fix the word or expand the board.
 */
import { describe, it, expect } from 'vitest';

// Re-declared here on purpose — we want this test to break when the curated
// constants drift, not silently track them. Update both sides intentionally.
const BOARDS: Record<string, string[][]> = {
  en: [
    ['S', 'T', 'A', 'R'],
    ['E', 'O', 'N', 'I'],
    ['P', 'L', 'A', 'T'],
    ['E', 'R', 'I', 'N'],
  ],
  he: [
    ['ש', 'ל', 'ו', 'ם'],
    ['ב', 'י', 'ת', 'א'],
    ['מ', 'ן', 'ר', 'ה'],
    ['ע', 'ק', 'ו', 'ל'],
  ],
  sv: [
    ['S', 'T', 'A', 'R'],
    ['E', 'O', 'N', 'I'],
    ['P', 'L', 'A', 'T'],
    ['E', 'R', 'I', 'N'],
  ],
  ja: [
    ['い', 'ぬ', 'か', 'み'],
    ['ね', 'こ', 'と', 'り'],
    ['さ', 'く', 'ら', 'ま'],
    ['は', 'な', 'ゆ', 'き'],
  ],
  es: [
    ['C', 'A', 'S', 'A'],
    ['M', 'E', 'L', 'O'],
    ['T', 'I', 'A', 'R'],
    ['E', 'O', 'N', 'P'],
  ],
};

const VALID_WORDS: Record<string, string[]> = {
  en: ['STAR', 'STOP', 'TAR', 'ATE', 'PLAN', 'PLANT', 'RAT', 'RAIN', 'TIN', 'TON', 'NOSE', 'SET', 'POE', 'TO', 'ON', 'IT', 'OAT', 'STOLE'],
  he: ['שלום', 'שלי', 'בית', 'בן', 'מן', 'תה', 'הר', 'אם', 'ירה', 'יתום', 'שיר', 'ירק', 'קרה'],
  sv: ['STAR', 'TAR', 'TON', 'EL', 'PLAN', 'SE', 'TE', 'LAT'],
  ja: ['いぬ', 'ねこ', 'とり', 'さくら', 'はな', 'ゆき', 'かみ', 'いね', 'こと', 'まり', 'まき', 'こい'],
  es: ['CASA', 'MELO', 'MIEL', 'MES', 'TIA', 'EL', 'LA', 'SAL', 'PAN', 'TE', 'ME', 'SOL', 'MAL', 'NO', 'LAS', 'LE', 'SE', 'ALA'],
};

const isAdjacent = (r1: number, c1: number, r2: number, c2: number) =>
  Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1 && !(r1 === r2 && c1 === c2);

/** DFS — does any path of adjacent unique cells spell `word` on `board`? */
function reachable(board: string[][], word: string): boolean {
  const letters = Array.from(word);
  const rows = board.length;
  const cols = board[0].length;
  const visited: boolean[][] = Array.from({ length: rows }, () => new Array(cols).fill(false));

  const walk = (r: number, c: number, idx: number): boolean => {
    if (board[r][c] !== letters[idx]) return false;
    if (idx === letters.length - 1) return true;
    visited[r][c] = true;
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (visited[nr][nc]) continue;
        if (!isAdjacent(r, c, nr, nc)) continue;
        if (walk(nr, nc, idx + 1)) {
          visited[r][c] = false;
          return true;
        }
      }
    }
    visited[r][c] = false;
    return false;
  };

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (walk(r, c, 0)) return true;
    }
  }
  return false;
}

describe('PracticeClassicSandbox curation contract', () => {
  for (const locale of Object.keys(VALID_WORDS)) {
    describe(`locale: ${locale}`, () => {
      const board = BOARDS[locale];
      for (const word of VALID_WORDS[locale]) {
        it(`"${word}" is reachable on the ${locale} board`, () => {
          expect(reachable(board, word)).toBe(true);
        });
      }
    });
  }
});
