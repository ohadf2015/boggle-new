import type { PlacedTile, RackTile, Direction } from './types';
import { BOARD_SIZE, CENTER, getCell, isFirstMove, isInBounds, type Board } from './board';
import { validateAndScoreMove, type DictionaryCheck } from './moveValidator';

export interface BotMove {
  placements: PlacedTile[];
  score: number;
  word: string;
}

export interface FindBotMoveOptions {
  maxLength?: number;
  maxCandidates?: number;
}

const DEFAULT_MAX_LENGTH = 5;

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
  startRow: number,
  startCol: number,
  length: number,
  direction: Direction,
): boolean {
  const endRow = direction === 'across' ? startRow : startRow + length - 1;
  const endCol = direction === 'across' ? startCol + length - 1 : startCol;
  return isInBounds(startRow, startCol) && isInBounds(endRow, endCol);
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

  const candidateWords: { word: string; tiles: RackTile[] }[] = [];
  let seen = 0;
  for (const perm of permutationsBetween(rack, 2, maxLength)) {
    if (seen++ >= maxCandidates) break;
    const word = perm.map((t) => t.letter).join('');
    if (word.includes('_')) continue;
    if (isWordValid(word)) candidateWords.push({ word, tiles: perm });
  }

  let best: BotMove | null = null;
  const empty = isFirstMove(board);

  for (const { word, tiles } of candidateWords) {
    for (const direction of ['across', 'down'] as Direction[]) {
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (!candidateFitsInBounds(r, c, tiles.length, direction)) continue;
          if (candidateOverlapsExistingTile(board, r, c, tiles.length, direction)) continue;
          if (empty) {
            const coversCenter =
              direction === 'across'
                ? r === CENTER && c <= CENTER && c + tiles.length - 1 >= CENTER
                : c === CENTER && r <= CENTER && r + tiles.length - 1 >= CENTER;
            if (!coversCenter) continue;
          }
          const placements = placementsFromCandidate(tiles, r, c, direction);
          const result = validateAndScoreMove(board, placements, isWordValid);
          if (!result.ok || result.score === undefined) continue;
          if (!best || result.score > best.score) {
            best = { placements, score: result.score, word };
          }
        }
      }
    }
  }
  return best;
}
