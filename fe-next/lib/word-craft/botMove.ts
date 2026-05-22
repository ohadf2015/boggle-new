import type { PlacedTile, RackTile, Direction } from './types';
import { getCenter, getCell, isFirstMove, isInBounds, type Board } from './board';
import { validateAndScoreMove, type DictionaryCheck } from './moveValidator';

export interface BotMove {
  placements: PlacedTile[];
  score: number;
  word: string;
}

export interface FindBotMoveOptions {
  maxLength?: number;
  maxCandidates?: number;
  /**
   * Optional callback to add per-candidate bonus to ranking (e.g. territory
   * capture points). Returning 0 is fine. Called only for candidates that
   * pass validation, so it's cheap.
   */
  extraScore?: (placements: PlacedTile[], wordCells: { row: number; col: number }[][]) => number;
  /**
   * Difficulty knob. 0 (default) = always pick the single strictly-best word,
   * matching the old behavior. Higher values widen the pool of distinct words
   * the bot picks from, so it sometimes plays a sub-optimal (but still legal)
   * word — a deliberate, tunable nerf. The bot keeps its bingo capability;
   * we never cap word length (see DEFAULT_MAX_LENGTH note). Pool size is
   * `round(1 + skillVariance * 4)` distinct words, ranked best-first.
   */
  skillVariance?: number;
  /** Injectable RNG (returns [0,1)) so difficulty selection is testable. */
  rng?: () => number;
}

// Bot considers permutations of its 7-tile rack up to length 7. Earlier
// versions capped at 5 to bound search time, but the ceiling meant the bot
// could never play a bingo (7-letter, 50 pt bonus) and felt visibly weak
// against any player who'd built vocabulary. Worst-case at length 7:
// 7P2+...+7P7 ≈ 13,700 permutations × O(1) dictionary lookup, still well
// under the 500 ms bot-turn budget on a phone.
const DEFAULT_MAX_LENGTH = 7;

function* permute<T>(arr: T[], k: number): Generator<T[]> {
  if (k === 0) {
    yield [];
    return;
  }
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permute(rest, k - 1)) {
      yield [arr[i], ...p];
    }
  }
}

function* permutationsBetween<T>(arr: T[], minLen: number, maxLen: number): Generator<T[]> {
  const upper = Math.min(maxLen, arr.length);
  for (let len = minLen; len <= upper; len++) {
    yield* permute(arr, len);
  }
}

function placementsFromCandidate(
  candidate: RackTile[],
  startRow: number,
  startCol: number,
  direction: Direction,
): PlacedTile[] {
  return candidate.map((tile, i) => ({
    row: direction === 'across' ? startRow : startRow + i,
    col: direction === 'across' ? startCol + i : startCol,
    letter: tile.letter,
    value: tile.value,
    isBlank: tile.isBlank,
    rackTileId: tile.id,
  }));
}

function candidateFitsInBounds(
  board: Board,
  startRow: number,
  startCol: number,
  length: number,
  direction: Direction,
): boolean {
  const endRow = direction === 'across' ? startRow : startRow + length - 1;
  const endCol = direction === 'across' ? startCol + length - 1 : startCol;
  return isInBounds(startRow, startCol, board) && isInBounds(endRow, endCol, board);
}

function candidateOverlapsExistingTile(
  board: Board,
  startRow: number,
  startCol: number,
  length: number,
  direction: Direction,
): boolean {
  for (let i = 0; i < length; i++) {
    const r = direction === 'across' ? startRow : startRow + i;
    const c = direction === 'across' ? startCol + i : startCol;
    if (getCell(board, r, c).tile) return true;
  }
  return false;
}

export function findBestBotMove(
  board: Board,
  rack: RackTile[],
  isWordValid: DictionaryCheck,
  options: FindBotMoveOptions = {},
): BotMove | null {
  const maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH;
  const maxCandidates = options.maxCandidates ?? Infinity;
  const skillVariance = options.skillVariance ?? 0;
  const rng = options.rng ?? Math.random;

  const candidateWords: { word: string; tiles: RackTile[] }[] = [];
  let seen = 0;
  for (const perm of permutationsBetween(rack, 2, maxLength)) {
    if (seen++ >= maxCandidates) break;
    const word = perm.map((t) => t.letter).join('');
    if (word.includes('_')) continue;
    if (isWordValid(word)) candidateWords.push({ word, tiles: perm });
  }

  // Keep the single best-ranked placement for each distinct PLAYED word, so the
  // difficulty pool spans different words rather than many placements of the
  // same word (which would all score alike and make the nerf invisible).
  const bestByWord = new Map<string, { move: BotMove; ranked: number }>();
  const empty = isFirstMove(board);
  const size = board.cells.length;
  const center = getCenter(board.size);

  for (const { word, tiles } of candidateWords) {
    for (const direction of ['across', 'down'] as Direction[]) {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (!candidateFitsInBounds(board, r, c, tiles.length, direction)) continue;
          if (candidateOverlapsExistingTile(board, r, c, tiles.length, direction)) continue;
          if (empty) {
            const coversCenter =
              direction === 'across'
                ? r === center && c <= center && c + tiles.length - 1 >= center
                : c === center && r <= center && r + tiles.length - 1 >= center;
            if (!coversCenter) continue;
          }
          const placements = placementsFromCandidate(tiles, r, c, direction);
          const result = validateAndScoreMove(board, placements, isWordValid);
          if (!result.ok || result.score === undefined) continue;
          const bonus = options.extraScore
            ? options.extraScore(placements, result.words?.map((w) => w.cells) ?? [])
            : 0;
          const ranked = result.score + bonus;
          // The played word can extend through existing board tiles, so the
          // real main word (result.words[0]) differs from the rack word.
          // Stored `score` is the base validator score (no territory bonus)
          // so the reducer's commit path can add territory captures without
          // double-counting them.
          const playedWord = result.words?.[0]?.word ?? word;
          const prev = bestByWord.get(playedWord);
          if (!prev || ranked > prev.ranked) {
            bestByWord.set(playedWord, {
              move: { placements, score: result.score, word: playedWord },
              ranked,
            });
          }
        }
      }
    }
  }

  if (bestByWord.size === 0) return null;

  // Rank distinct words best-first. Pool = top-K words; pick one via rng.
  // K=1 at skillVariance 0 reproduces the strict-best behavior exactly.
  const ranked = [...bestByWord.values()].sort((a, b) => b.ranked - a.ranked);
  const poolSize = Math.max(1, Math.round(1 + skillVariance * 4));
  const pool = ranked.slice(0, poolSize);
  const idx = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[idx].move;
}
