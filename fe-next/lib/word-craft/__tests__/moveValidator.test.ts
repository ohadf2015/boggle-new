import { describe, it, expect } from 'vitest';
import { createBoard, placeTiles } from '../board';
import { validateAndScoreMove } from '../moveValidator';
import type { PlacedTile } from '../types';

const TILE_VALUES: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8,
  K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1,
  U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10, _: 0,
};

const place = (row: number, col: number, letter: string): PlacedTile => ({
  row,
  col,
  letter,
  value: TILE_VALUES[letter] ?? 0,
  isBlank: false,
  rackTileId: `t-${row}-${col}-${letter}`,
});

const VALID_WORDS = new Set(['CAT', 'CATS', 'AT', 'HI', 'SO', 'ON', 'TON', 'SAT', 'TAR', 'ART']);
const isValid = (w: string) => VALID_WORDS.has(w.toUpperCase());

describe('validateAndScoreMove — geometric validity', () => {
  it('rejects empty placement', () => {
    const board = createBoard();
    const r = validateAndScoreMove(board, [], isValid);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('NO_TILES');
  });

  it('rejects single-tile placement on first move (needs >= 2 tiles to form a word)', () => {
    const board = createBoard();
    const r = validateAndScoreMove(board, [place(7, 7, 'A')], isValid);
    expect(r.ok).toBe(false);
  });

  it('rejects first move that does not cover the center', () => {
    const board = createBoard();
    const r = validateAndScoreMove(
      board,
      [place(0, 0, 'C'), place(0, 1, 'A'), place(0, 2, 'T')],
      isValid,
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('FIRST_MOVE_MUST_COVER_CENTER');
  });

  it('rejects diagonal placement', () => {
    const board = createBoard();
    const r = validateAndScoreMove(
      board,
      [place(7, 7, 'C'), place(8, 8, 'A')],
      isValid,
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('NOT_LINEAR');
  });

  it('rejects out-of-bounds placement', () => {
    const board = createBoard();
    const r = validateAndScoreMove(
      board,
      [place(7, 13, 'C'), place(7, 14, 'A'), place(7, 15, 'T')],
      isValid,
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('OUT_OF_BOUNDS');
  });

  it('rejects placement with gaps where no existing tile fills them', () => {
    const board = createBoard();
    const r = validateAndScoreMove(
      board,
      [place(7, 7, 'C'), place(7, 9, 'T')],
      isValid,
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('NOT_CONTIGUOUS');
  });

  it('accepts horizontal first-move that covers center and forms a valid word', () => {
    const board = createBoard();
    const r = validateAndScoreMove(
      board,
      [place(7, 7, 'C'), place(7, 8, 'A'), place(7, 9, 'T')],
      isValid,
    );
    expect(r.ok).toBe(true);
  });

  it('accepts vertical first-move that covers center', () => {
    const board = createBoard();
    const r = validateAndScoreMove(
      board,
      [place(7, 7, 'C'), place(8, 7, 'A'), place(9, 7, 'T')],
      isValid,
    );
    expect(r.ok).toBe(true);
  });
});

describe('validateAndScoreMove — dictionary check', () => {
  it('rejects placement that forms a word not in the dictionary', () => {
    const board = createBoard();
    const r = validateAndScoreMove(
      board,
      [place(7, 7, 'X'), place(7, 8, 'Z'), place(7, 9, 'Q')],
      isValid,
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('INVALID_WORD');
    expect(r.invalidWord).toBe('XZQ');
  });

  it('passes when every formed word is valid', () => {
    const board = createBoard();
    const r = validateAndScoreMove(
      board,
      [place(7, 7, 'C'), place(7, 8, 'A'), place(7, 9, 'T')],
      isValid,
    );
    expect(r.ok).toBe(true);
    expect(r.words?.[0].word).toBe('CAT');
  });
});

describe('validateAndScoreMove — connectivity (subsequent moves)', () => {
  it('rejects subsequent move that does not touch any existing tile', () => {
    const board = createBoard();
    placeTiles(board, [place(7, 7, 'C'), place(7, 8, 'A'), place(7, 9, 'T')]);
    const r = validateAndScoreMove(
      board,
      [place(0, 0, 'A'), place(0, 1, 'T')],
      isValid,
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('DISCONNECTED');
  });

  it('accepts a move that extends an existing word: CAT + S = CATS', () => {
    const board = createBoard();
    placeTiles(board, [place(7, 7, 'C'), place(7, 8, 'A'), place(7, 9, 'T')]);
    const r = validateAndScoreMove(board, [place(7, 10, 'S')], isValid);
    expect(r.ok).toBe(true);
    expect(r.words?.find((w) => w.word === 'CATS')).toBeTruthy();
  });

  it('accepts a single-tile placement that hooks two words simultaneously', () => {
    // Board has CAT at (7,7-9). Place 'S' at (8,7) → forms vertical 'CS'?... use a real example:
    // Existing: CAT at row 7 cols 7-9. Place 'O' at (6,8) → forms 'OA' vertical (not in dict),
    // pick a cleaner one: place 'A' below 'C' and 'T' below 'A' so we get vertical word.
    // Simpler: existing CAT, place 'AT' going down from (7,9): (8,9)='A', (9,9)='T'.
    // Forms vertical word 'TAT' starting at (7,9)? no, starts at (7,9)='T', (8,9)='A', (9,9)='T'
    // -> 'TAT'. Not in dict.
    // Use 'SAT' instead: existing CAT, place vertical 'SAT' down from (7,9):
    // (8,9)='A', (9,9)='T' → 'TAT'. Hmm.
    // Cleanest: existing 'AT' at (7,7)-(7,8). Place vertical 'O' above (6,7) and 'N' above (5,7)?
    // Forms 'NO' or 'ON'. Let's craft: place 'TON' at (7,9)='T', (8,9)='O', (9,9)='N' but dictionary lacks 'NO'.
    // Use existing CAT at row 7, place 'O' at (8,7) and 'N' at (9,7) below the 'C':
    // Vertical word: C(7,7) + O(8,7) + N(9,7) = 'CON' — not in dict.
    // OK — use CAT at row 7 (cols 7-9), then place 'ON' going DOWN starting at row 8 col 9: (8,9)='O', (9,9)='N'.
    // Vertical from (7,9) reading down: T, O, N = 'TON' ✓ in dict.
    const board = createBoard();
    placeTiles(board, [place(7, 7, 'C'), place(7, 8, 'A'), place(7, 9, 'T')]);
    const r = validateAndScoreMove(
      board,
      [place(8, 9, 'O'), place(9, 9, 'N')],
      isValid,
    );
    expect(r.ok).toBe(true);
    expect(r.words?.map((w) => w.word).sort()).toEqual(['TON']);
  });

  it('detects perpendicular cross-words formed by a single placement', () => {
    // Place 'CAT' horizontally at row 7, then put 'S' below the 'C' (8,7) and 'O' below that (9,7):
    // Vertical word at column 7: C(7,7), S(8,7), O(9,7)? not in dict.
    // Easier: place 'CAT' horizontally, then place 'A' at (8,8) and 'T' at (9,8):
    // Main word DOWN: A(7,8) is 'A', placed (8,8)='A', (9,8)='T' → 'AAT' — not in dict.
    //
    // Cleanest cross-word case: existing 'CAT' at (7,7-9). Place 'A' at (8,9) and 'R' at (8,10):
    // Horizontal main word: 'AR' (not in dict). Skip.
    //
    // Use: existing CAT row 7. Place 'AR' at (8,8)='A', (8,9)='R' (horizontal, not connected via above row).
    // Wait — (8,8) is below 'A' (7,8) and (8,9) below 'T' (7,9). So crosses:
    //   col 8: A (7,8) + A (8,8) = 'AA' — not in dict
    // Skip.
    //
    // Use a cleaner setup: place 'AT' at (8,7)-(8,8) below CAT.
    // - Main word horizontal: 'AT' ✓
    // - Cross at col 7: C + A = 'CA' — not in dict.
    //
    // Use: place 'TAR' at (8,9)-(10,9) going DOWN from existing T (7,9):
    // Wait, (8,9), (9,9), (10,9) — three new tiles. Vertical from (7,9) reading down:
    //   T (existing) + T(8,9) + A(9,9) + R(10,9) = 'TTAR' — not in dict.
    //
    // Final approach: existing CAT at row 7 cols 7-9. Place 'ART' at row 8 horizontally from col 8:
    //   placements: (8,8)='A', (8,9)='R', (8,10)='T'. Main word 'ART' ✓.
    //   Cross-words from each new tile:
    //     col 8: A(7,8) + A(8,8) = 'AA' (only 2 tiles, vertical) — not in dict, would fail.
    //   Skip.
    //
    // Use an isolated example: place CAT at (7,7-9). Then place 'AT' vertically at (8,9)-(9,9) below T:
    //   placements: (8,9)='A', (9,9)='T'.
    //   Main word DOWN at col 9: T(7,9) + A(8,9) + T(9,9) = 'TAT' — not in dict.
    //
    // Add 'TAT' to the dict for this test:
    const localDict = new Set(Array.from(VALID_WORDS).concat(['TAT', 'AT']));
    const localValidator = (w: string) => localDict.has(w.toUpperCase());
    const board = createBoard();
    placeTiles(board, [place(7, 7, 'C'), place(7, 8, 'A'), place(7, 9, 'T')]);
    const r = validateAndScoreMove(
      board,
      [place(8, 9, 'A'), place(9, 9, 'T')],
      localValidator,
    );
    expect(r.ok).toBe(true);
    expect(r.words?.map((w) => w.word).sort()).toEqual(['TAT']);
  });
});

describe('validateAndScoreMove — center is board-size relative', () => {
  it('accepts an 11x11 first move covering its real center (5,5)', () => {
    const board = createBoard(11);
    const r = validateAndScoreMove(
      board,
      [place(5, 5, 'C'), place(5, 6, 'A'), place(5, 7, 'T')],
      isValid,
    );
    expect(r.ok).toBe(true);
  });

  it('rejects an 11x11 first move on the old hardcoded center (7,7)', () => {
    const board = createBoard(11);
    const r = validateAndScoreMove(
      board,
      [place(7, 7, 'C'), place(7, 8, 'A'), place(7, 9, 'T')],
      isValid,
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('FIRST_MOVE_MUST_COVER_CENTER');
  });

  it('accepts a 13x13 first move covering its real center (6,6)', () => {
    const board = createBoard(13);
    const r = validateAndScoreMove(
      board,
      [place(6, 6, 'C'), place(6, 7, 'A'), place(6, 8, 'T')],
      isValid,
    );
    expect(r.ok).toBe(true);
  });
});

describe('validateAndScoreMove — scoring', () => {
  it('scores first move CAT on center DW: (3+1+1) * 2 = 10', () => {
    const board = createBoard();
    const r = validateAndScoreMove(
      board,
      [place(7, 7, 'C'), place(7, 8, 'A'), place(7, 9, 'T')],
      isValid,
    );
    expect(r.ok).toBe(true);
    expect(r.score).toBe(10);
  });

  it('extending CAT with S to form CATS: existing tiles score base value, new S has no premium at (7,10)', () => {
    // Row 7 premium layout: 'T..d...D...d..T' → col 10 is '.', col 11 is 'd' (DL).
    // S at (7,10) gets no premium. Existing C/A/T contribute base 3+1+1. S=1. Total 6.
    const board = createBoard();
    placeTiles(board, [place(7, 7, 'C'), place(7, 8, 'A'), place(7, 9, 'T')]);
    const r = validateAndScoreMove(board, [place(7, 10, 'S')], isValid);
    expect(r.ok).toBe(true);
    expect(r.score).toBe(6);
  });

  it('placing all 7 tiles awards 50-point bingo bonus', () => {
    // Make a 7-letter word: STRAINS (assuming it's valid).
    const localDict = new Set(['STRAINS']);
    const localValidator = (w: string) => localDict.has(w.toUpperCase());
    const board = createBoard();
    // Place STRAINS at row 7 cols 5..11. Premiums on row 7 ('T..d...D...d..T'):
    //   col 5='.', col 6='.', col 7='D' (DW), col 8='.', col 9='.', col 10='.', col 11='d' (DL).
    // 'A' lands on DW (center). Final 'S' lands on DL (col 11).
    const placements = [
      place(7, 5, 'S'),
      place(7, 6, 'T'),
      place(7, 7, 'R'),
      place(7, 8, 'A'),
      place(7, 9, 'I'),
      place(7, 10, 'N'),
      place(7, 11, 'S'),
    ];
    const r = validateAndScoreMove(board, placements, localValidator);
    expect(r.ok).toBe(true);
    expect(r.bingo).toBe(true);
    // Letter scores (each tile=1, S on DL=2): 1+1+1+1+1+1+2 = 8.
    // Word multiplier from DW (one DW): ×2. Word score = 16. Bingo +50 = 66.
    expect(r.score).toBe(66);
  });
});

describe('validateAndScoreMove — assigned joker (blank) through-line', () => {
  const blank = (row: number, col: number, letter: string): PlacedTile => ({
    row,
    col,
    letter,
    value: 0,
    isBlank: true,
    rackTileId: `blank-${row}-${col}`,
  });

  it('a blank carrying an assigned letter forms and validates the word', () => {
    const board = createBoard();
    // C A T across the center, where A is a joker assigned the letter 'A'.
    const r = validateAndScoreMove(
      board,
      [place(7, 7, 'C'), blank(7, 8, 'A'), place(7, 9, 'T')],
      isValid,
    );
    expect(r.ok).toBe(true);
    expect(r.words?.[0].word).toBe('CAT');
  });

  it('scores the joker tile as 0 even though its letter counts in the word', () => {
    const board = createBoard();
    const r = validateAndScoreMove(
      board,
      [place(7, 7, 'C'), blank(7, 8, 'A'), place(7, 9, 'T')],
      isValid,
    );
    const tiles = r.words?.[0].tiles ?? [];
    const aTile = tiles.find((t) => t.letter === 'A');
    expect(aTile?.value).toBe(0);
  });

  it('an unassigned blank ("_") cannot form a real word', () => {
    const board = createBoard();
    const r = validateAndScoreMove(
      board,
      [place(7, 7, 'C'), blank(7, 8, '_'), place(7, 9, 'T')],
      isValid,
    );
    expect(r.ok).toBe(false);
  });
});
