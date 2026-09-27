import { findWordPath, selectRandomRevealWord, getRevealableWordCount } from '../wordPathFinder';
import type { Language } from '@/types';

const EN: Language = 'en';

// Helper: create grid from rows of letters
// e.g. grid('CAT','DOG','BEE') => [['C','A','T'],['D','O','G'],['B','E','E']]
function grid(...rows: string[]): string[][] {
  return rows.map(r => r.split(''));
}

describe('findWordPath', () => {
  describe('simple valid paths', () => {
    it('finds a horizontal word', () => {
      const g = grid('CAT', 'DOG', 'BEE');
      const result = findWordPath('cat', g, EN);
      expect(result).not.toBeNull();
      expect(result!.map(c => c.letter).join('')).toBe('CAT');
      expect(result).toEqual([
        { row: 0, col: 0, letter: 'C' },
        { row: 0, col: 1, letter: 'A' },
        { row: 0, col: 2, letter: 'T' },
      ]);
    });

    it('finds a vertical word', () => {
      const g = grid('CXX', 'AXX', 'TXX');
      const result = findWordPath('cat', g, EN);
      expect(result).not.toBeNull();
      expect(result!.map(c => c.letter).join('')).toBe('CAT');
    });

    it('is case-insensitive', () => {
      const g = grid('CAT', 'XXX', 'XXX');
      expect(findWordPath('CAT', g, EN)).not.toBeNull();
      expect(findWordPath('Cat', g, EN)).not.toBeNull();
      expect(findWordPath('cat', g, EN)).not.toBeNull();
    });
  });

  describe('diagonal adjacency', () => {
    it('finds a diagonal path', () => {
      const g = grid('CXX', 'XAX', 'XXT');
      const result = findWordPath('cat', g, EN);
      expect(result).not.toBeNull();
      expect(result!).toEqual([
        { row: 0, col: 0, letter: 'C' },
        { row: 1, col: 1, letter: 'A' },
        { row: 2, col: 2, letter: 'T' },
      ]);
    });

    it('finds anti-diagonal path', () => {
      const g = grid('XXC', 'XAX', 'TXX');
      const result = findWordPath('cat', g, EN);
      expect(result).not.toBeNull();
    });
  });

  describe('no tile reuse', () => {
    it('rejects path that would reuse a tile', () => {
      // Grid has only one 'A', word "aba" needs A twice
      const g = grid('AB', 'XX');
      const result = findWordPath('aba', g, EN);
      expect(result).toBeNull();
    });

    it('allows same letter from different tiles', () => {
      // Two A tiles available
      const g = grid('AB', 'AX');
      const result = findWordPath('aba', g, EN);
      expect(result).not.toBeNull();
      // Verify different cells used for the two A's
      const aCells = result!.filter(c => c.letter === 'A');
      expect(aCells).toHaveLength(2);
      expect(`${aCells[0].row},${aCells[0].col}`).not.toBe(`${aCells[1].row},${aCells[1].col}`);
    });
  });

  describe('invalid paths', () => {
    it('returns null when tiles are not adjacent', () => {
      // C at (0,0) and A at (0,2) are not adjacent
      const g = grid('CXA', 'XXT', 'XXX');
      const result = findWordPath('cat', g, EN);
      expect(result).toBeNull();
    });

    it('returns null when word letters not on grid', () => {
      const g = grid('XXX', 'XXX', 'XXX');
      expect(findWordPath('cat', g, EN)).toBeNull();
    });

    it('returns null for partial match', () => {
      // C and A adjacent but no T nearby
      const g = grid('CAX', 'XXX', 'XXX');
      expect(findWordPath('cat', g, EN)).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('returns null for empty word', () => {
      const g = grid('AB', 'CD');
      expect(findWordPath('', g, EN)).toBeNull();
    });

    it('returns null for null/empty grid', () => {
      expect(findWordPath('cat', [], EN)).toBeNull();
      expect(findWordPath('cat', null as unknown as string[][], EN)).toBeNull();
    });

    it('finds single-letter word', () => {
      const g = grid('AB', 'CD');
      const result = findWordPath('a', g, EN);
      expect(result).toEqual([{ row: 0, col: 0, letter: 'A' }]);
    });

    it('finds word using all tiles on a small grid', () => {
      // 2x2 grid, path: A(0,0)->B(0,1)->D(1,1)->C(1,0)
      const g = grid('AB', 'CD');
      const result = findWordPath('abdc', g, EN);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(4);
    });
  });

  describe('different grid sizes', () => {
    it('works on 3x3 grid', () => {
      const g = grid('ABC', 'DEF', 'GHI');
      // "AEI" = (0,0)->(1,1)->(2,2) diagonal
      const result = findWordPath('aei', g, EN);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(3);
    });

    it('works on 4x4 grid', () => {
      const g = grid('ABCD', 'EFGH', 'IJKL', 'MNOP');
      // "AFK" = (0,0)->(1,1) not adjacent to (2,2)? Actually (1,5)=F at (1,1), K at (2,2) — adjacent diag
      // A(0,0)->F(1,1)->K(2,2) diagonal
      const result = findWordPath('afk', g, EN);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(3);
    });

    it('works on 5x5 grid', () => {
      const g = grid('ABCDE', 'FGHIJ', 'KLMNO', 'PQRST', 'UVWXY');
      // A(0,0)->G(1,1)->M(2,2) diagonal
      const result = findWordPath('agm', g, EN);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(3);
    });
  });

  describe('performance', () => {
    it('handles 10x10 grid without hanging', () => {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const bigGrid: string[][] = [];
      for (let i = 0; i < 10; i++) {
        const row: string[] = [];
        for (let j = 0; j < 10; j++) {
          row.push(alphabet[(i * 10 + j) % 26]);
        }
        bigGrid.push(row);
      }
      const start = Date.now();
      // Search for a word that doesn't exist — worst case
      findWordPath('zzzzzzzzz', bigGrid, EN);
      expect(Date.now() - start).toBeLessThan(1000);
    });
  });

  describe('mixed-direction path', () => {
    it('finds a zigzag path', () => {
      // D O G
      // X X X
      // X X X
      // "dog" horizontally
      const g = grid('DOG', 'OXX', 'XXX');
      const result = findWordPath('dog', g, EN);
      expect(result).not.toBeNull();
      expect(result!).toEqual([
        { row: 0, col: 0, letter: 'D' },
        { row: 0, col: 1, letter: 'O' },
        { row: 0, col: 2, letter: 'G' },
      ]);
    });

    it('finds path that changes direction', () => {
      // Path: C(0,0) -> A(0,1) -> T(1,1) — right then down
      const g = grid('CAX', 'XTX', 'XXX');
      const result = findWordPath('cat', g, EN);
      expect(result).not.toBeNull();
      expect(result!.map(c => c.letter).join('')).toBe('CAT');
    });
  });
});

describe('selectRandomRevealWord', () => {
  const g = grid('HELLO', 'WORLD', 'XXXXX', 'XXXXX', 'XXXXX');

  it('returns null when no words available', () => {
    const result = selectRandomRevealWord(
      { easy: [], medium: [], hard: [] },
      [],
      g,
      EN
    );
    expect(result).toBeNull();
  });

  it('returns null when all words are already found', () => {
    const result = selectRandomRevealWord(
      { easy: ['hello'], medium: [], hard: [] },
      ['hello'],
      g,
      EN
    );
    // 'hello' is < 5 letters... actually 5 letters
    expect(result).toBeNull();
  });

  it('returns a word with valid path', () => {
    const result = selectRandomRevealWord(
      { easy: [], medium: ['hello'], hard: [] },
      [],
      g,
      EN
    );
    expect(result).not.toBeNull();
    expect(result!.word).toBe('HELLO');
    expect(result!.path).toHaveLength(5);
  });

  it('skips words shorter than 5 letters', () => {
    const result = selectRandomRevealWord(
      { easy: ['cat'], medium: [], hard: [] },
      [],
      g,
      EN
    );
    expect(result).toBeNull();
  });

  it('skips already found words', () => {
    const result = selectRandomRevealWord(
      { easy: [], medium: ['hello'], hard: [] },
      ['hello'],
      g,
      EN
    );
    expect(result).toBeNull();
  });
});

describe('getRevealableWordCount', () => {
  it('returns 0 for null availableWords', () => {
    expect(getRevealableWordCount(null, [], EN)).toBe(0);
  });

  it('counts only 5+ letter unfound words', () => {
    const count = getRevealableWordCount(
      { easy: ['cat', 'hello'], medium: ['world'], hard: [] },
      [],
      EN
    );
    expect(count).toBe(2); // hello + world
  });

  it('excludes found words', () => {
    const count = getRevealableWordCount(
      { easy: ['hello'], medium: ['world'], hard: [] },
      ['hello'],
      EN
    );
    expect(count).toBe(1); // only world
  });

  it('returns 0 when all found', () => {
    const count = getRevealableWordCount(
      { easy: ['hello'], medium: [], hard: [] },
      ['hello'],
      EN
    );
    expect(count).toBe(0);
  });
});
