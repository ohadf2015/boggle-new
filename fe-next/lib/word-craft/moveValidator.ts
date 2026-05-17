import type { PlacedTile, ScoringTile, Direction } from './types';
import { getCenter, getCell, isFirstMove, isInBounds, type Board } from './board';
import { scoreWord, scoreTurn, BINGO_THRESHOLD } from './scoring';

export type MoveError =
  | 'NO_TILES'
  | 'OUT_OF_BOUNDS'
  | 'CELL_OCCUPIED'
  | 'NOT_LINEAR'
  | 'NOT_CONTIGUOUS'
  | 'FIRST_MOVE_MUST_COVER_CENTER'
  | 'FIRST_MOVE_TOO_SHORT'
  | 'DISCONNECTED'
  | 'INVALID_WORD';

export interface ScoredWord {
  word: string;
  score: number;
  tiles: ScoringTile[];
  direction: Direction;
  cells: { row: number; col: number }[];
}

export interface MoveResult {
  ok: boolean;
  reason?: MoveError;
  invalidWord?: string;
  words?: ScoredWord[];
  score?: number;
  bingo?: boolean;
}

export type DictionaryCheck = (word: string) => boolean;

function fail(reason: MoveError, extra: Partial<MoveResult> = {}): MoveResult {
  return { ok: false, reason, ...extra };
}

interface PlacementGeometry {
  direction: Direction;
  row?: number;
  col?: number;
}

function detectGeometry(placements: PlacedTile[]): PlacementGeometry | null {
  if (placements.length === 1) {
    return { direction: 'across' };
  }
  const rows = new Set(placements.map((p) => p.row));
  const cols = new Set(placements.map((p) => p.col));
  if (rows.size === 1) return { direction: 'across', row: placements[0].row };
  if (cols.size === 1) return { direction: 'down', col: placements[0].col };
  return null;
}

function newTilesIndex(placements: PlacedTile[]): Set<string> {
  return new Set(placements.map((p) => `${p.row},${p.col}`));
}

interface WordSpan {
  start: number;
  end: number;
  axisIndex: number;
  direction: Direction;
}

function buildWordTiles(
  board: Board,
  placements: PlacedTile[],
  span: WordSpan,
): { tiles: ScoringTile[]; word: string; cells: { row: number; col: number }[] } | null {
  const newCoords = newTilesIndex(placements);
  const placementByCoord = new Map<string, PlacedTile>();
  for (const p of placements) placementByCoord.set(`${p.row},${p.col}`, p);

  const tiles: ScoringTile[] = [];
  const cells: { row: number; col: number }[] = [];
  let word = '';
  for (let i = span.start; i <= span.end; i++) {
    const row = span.direction === 'across' ? span.axisIndex : i;
    const col = span.direction === 'across' ? i : span.axisIndex;
    if (!isInBounds(row, col, board)) return null;
    const cell = getCell(board, row, col);
    const key = `${row},${col}`;
    let letter: string;
    let value: number;
    let premium: ScoringTile['premium'];
    if (newCoords.has(key)) {
      const p = placementByCoord.get(key)!;
      letter = p.letter;
      value = p.isBlank ? 0 : p.value;
      premium = cell.premium;
    } else if (cell.tile) {
      letter = cell.tile.letter;
      value = cell.tile.isBlank ? 0 : cell.tile.value;
      premium = null;
    } else {
      return null;
    }
    word += letter;
    tiles.push({ letter, value, premium });
    cells.push({ row, col });
  }
  return { tiles, word, cells };
}

function findMainWordSpan(
  board: Board,
  placements: PlacedTile[],
  direction: Direction,
): WordSpan {
  const axisIndex = direction === 'across' ? placements[0].row : placements[0].col;
  const positions = placements.map((p) => (direction === 'across' ? p.col : p.row));
  let minPos = Math.min(...positions);
  let maxPos = Math.max(...positions);
  while (minPos > 0) {
    const r = direction === 'across' ? axisIndex : minPos - 1;
    const c = direction === 'across' ? minPos - 1 : axisIndex;
    if (!isInBounds(r, c, board) || !getCell(board, r, c).tile) break;
    minPos--;
  }
  const maxBound = board.cells.length - 1;
  while (maxPos < maxBound) {
    const r = direction === 'across' ? axisIndex : maxPos + 1;
    const c = direction === 'across' ? maxPos + 1 : axisIndex;
    if (!isInBounds(r, c, board) || !getCell(board, r, c).tile) break;
    maxPos++;
  }
  return { start: minPos, end: maxPos, axisIndex, direction };
}

function findCrossWordSpan(
  board: Board,
  placements: PlacedTile[],
  placement: PlacedTile,
  mainDirection: Direction,
): WordSpan | null {
  const crossDirection: Direction = mainDirection === 'across' ? 'down' : 'across';
  const axisIndex = crossDirection === 'across' ? placement.row : placement.col;
  let minPos = crossDirection === 'across' ? placement.col : placement.row;
  let maxPos = minPos;
  const newCoords = newTilesIndex(placements);
  const hasTileAt = (r: number, c: number) => {
    if (!isInBounds(r, c, board)) return false;
    return getCell(board, r, c).tile !== null || newCoords.has(`${r},${c}`);
  };
  while (minPos > 0) {
    const r = crossDirection === 'across' ? axisIndex : minPos - 1;
    const c = crossDirection === 'across' ? minPos - 1 : axisIndex;
    if (!hasTileAt(r, c)) break;
    minPos--;
  }
  const maxBound = board.cells.length - 1;
  while (maxPos < maxBound) {
    const r = crossDirection === 'across' ? axisIndex : maxPos + 1;
    const c = crossDirection === 'across' ? maxPos + 1 : axisIndex;
    if (!hasTileAt(r, c)) break;
    maxPos++;
  }
  if (maxPos - minPos < 1) return null;
  return { start: minPos, end: maxPos, axisIndex, direction: crossDirection };
}

function touchesExistingTile(board: Board, placements: PlacedTile[]): boolean {
  for (const p of placements) {
    const neighbors: [number, number][] = [
      [p.row - 1, p.col],
      [p.row + 1, p.col],
      [p.row, p.col - 1],
      [p.row, p.col + 1],
    ];
    for (const [r, c] of neighbors) {
      if (isInBounds(r, c, board) && getCell(board, r, c).tile) return true;
    }
  }
  return false;
}

export function validateAndScoreMove(
  board: Board,
  placements: PlacedTile[],
  isWordValid: DictionaryCheck,
): MoveResult {
  if (placements.length === 0) return fail('NO_TILES');
  for (const p of placements) {
    if (!isInBounds(p.row, p.col, board)) return fail('OUT_OF_BOUNDS');
    if (getCell(board, p.row, p.col).tile) return fail('CELL_OCCUPIED');
  }
  const seen = new Set<string>();
  for (const p of placements) {
    const k = `${p.row},${p.col}`;
    if (seen.has(k)) return fail('NOT_CONTIGUOUS');
    seen.add(k);
  }

  const geometry = detectGeometry(placements);
  if (!geometry) return fail('NOT_LINEAR');

  const direction: Direction =
    placements.length === 1
      ? touchesExistingTileHorizontally(board, placements[0])
        ? 'across'
        : 'down'
      : geometry.direction;

  const mainSpan = findMainWordSpan(board, placements, direction);
  const main = buildWordTiles(board, placements, mainSpan);
  if (!main) return fail('NOT_CONTIGUOUS');

  if (isFirstMove(board)) {
    const center = getCenter(board.size);
    const coversCenter = placements.some((p) => p.row === center && p.col === center);
    if (!coversCenter) return fail('FIRST_MOVE_MUST_COVER_CENTER');
    if (main.tiles.length < 2) return fail('FIRST_MOVE_TOO_SHORT');
  } else {
    if (!touchesExistingTile(board, placements)) return fail('DISCONNECTED');
  }

  const allWords: ScoredWord[] = [];
  if (main.tiles.length >= 2) {
    if (!isWordValid(main.word)) {
      return fail('INVALID_WORD', { invalidWord: main.word });
    }
    allWords.push({
      word: main.word,
      score: scoreWord(main.tiles),
      tiles: main.tiles,
      direction,
      cells: main.cells,
    });
  }

  for (const p of placements) {
    const crossSpan = findCrossWordSpan(board, placements, p, direction);
    if (!crossSpan) continue;
    const cross = buildWordTiles(board, placements, crossSpan);
    if (!cross) return fail('NOT_CONTIGUOUS');
    if (cross.tiles.length < 2) continue;
    if (!isWordValid(cross.word)) {
      return fail('INVALID_WORD', { invalidWord: cross.word });
    }
    allWords.push({
      word: cross.word,
      score: scoreWord(cross.tiles),
      tiles: cross.tiles,
      direction: crossSpan.direction,
      cells: cross.cells,
    });
  }

  if (allWords.length === 0) return fail('FIRST_MOVE_TOO_SHORT');

  const score = scoreTurn(
    allWords.map((w) => w.tiles),
    placements.length,
  );
  const bingo = placements.length >= BINGO_THRESHOLD;
  return { ok: true, words: allWords, score, bingo };
}

function touchesExistingTileHorizontally(board: Board, p: PlacedTile): boolean {
  if (isInBounds(p.row, p.col - 1, board) && getCell(board, p.row, p.col - 1).tile) return true;
  if (isInBounds(p.row, p.col + 1, board) && getCell(board, p.row, p.col + 1).tile) return true;
  return false;
}
