import { describe, it, expect } from 'vitest';
import { gzipSync } from 'node:zlib';
import { isWordOnBoard, buildPositionsMap } from './validate';
import { generateBoard, scoreBoard } from './board';
import { calculateWordScore } from './scoring';
import { parseWordList, inflateGzip, isRealWord } from './dict';

describe('validate.isWordOnBoard (authoritative adjacency DFS)', () => {
  // C A T
  // X D O
  // X X G
  const board = [
    ['C', 'A', 'T'],
    ['X', 'D', 'O'],
    ['X', 'X', 'G'],
  ];
  it('accepts a word traceable via 8-adjacency (CAT: right, right)', () => {
    expect(isWordOnBoard('CAT', board)).toBe(true);
  });
  it('accepts a diagonal path (DOG: D→O right, O→G down)', () => {
    expect(isWordOnBoard('dog', board)).toBe(true);
  });
  it('rejects a word whose letters exist but are NOT adjacent (CAG)', () => {
    // C(0,0) A(0,1) adjacent, but A(0,1)->G(2,2) not adjacent
    expect(isWordOnBoard('CAG', board)).toBe(false);
  });
  it('rejects reusing the same cell', () => {
    // only one C; "CC" impossible
    expect(isWordOnBoard('CC', board)).toBe(false);
  });
  it('rejects words shorter than 2', () => {
    expect(isWordOnBoard('A', board)).toBe(false);
  });
  it('prebuilt positions map yields same result', () => {
    const pm = buildPositionsMap(board);
    expect(isWordOnBoard('cat', board, pm)).toBe(true);
  });
});

describe('board.generateBoard', () => {
  it('returns a 4x4 grid of single A-Z chars', () => {
    const g = generateBoard();
    expect(g).toHaveLength(4);
    for (const row of g) {
      expect(row).toHaveLength(4);
      for (const c of row) expect(c).toMatch(/^[A-Z]$/);
    }
  });
  it('scoreBoard rewards balanced vowels over all-consonant', () => {
    const balanced = [['A', 'E', 'I', 'O'], ['R', 'S', 'T', 'N'], ['L', 'D', 'C', 'M'], ['P', 'B', 'G', 'H']];
    const barren = [['R', 'S', 'T', 'N'], ['L', 'D', 'C', 'M'], ['P', 'B', 'G', 'H'], ['Z', 'X', 'Q', 'J']];
    expect(scoreBoard(balanced)).toBeGreaterThan(scoreBoard(barren));
  });
});

describe('scoring.calculateWordScore', () => {
  it('scores 0 for words shorter than 2', () => {
    expect(calculateWordScore('a')).toBe(0);
  });
  it('longer words score higher', () => {
    expect(calculateWordScore('words')).toBeGreaterThan(calculateWordScore('to'));
  });
});

describe('dict', () => {
  it('parseWordList lowercases, trims, dedupes, drops blanks', () => {
    const set = parseWordList('Cat\ncat\n  DOG \n\n');
    expect(set.has('cat')).toBe(true);
    expect(set.has('dog')).toBe(true);
    expect(set.size).toBe(2);
  });
  it('isRealWord is case-insensitive', () => {
    const set = parseWordList('cat\ndog');
    expect(isRealWord(set, 'CAT')).toBe(true);
    expect(isRealWord(set, 'bird')).toBe(false);
  });
  it('inflateGzip round-trips a gzipped word list', async () => {
    const gz = gzipSync(Buffer.from('cat\ndog\nbird', 'utf8'));
    const stream = new Response(gz).body!;
    const text = await inflateGzip(stream);
    expect(text).toBe('cat\ndog\nbird');
  });
});
