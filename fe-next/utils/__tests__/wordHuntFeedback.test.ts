/**
 * Word Hunt Feedback System Tests
 *
 * Tests for Wordle-style letter feedback and board path validation
 */

import {
  getLetterFeedback,
  feedbackToEmoji,
  isTargetWordFound,
  getLetterKnowledge,
  canFormWordOnBoard,
  type LetterFeedback,
} from '../wordHuntFeedback';

describe('getLetterFeedback', () => {
  describe('exact matches (green)', () => {
    it('returns all green for exact match', () => {
      const feedback = getLetterFeedback('HELLO', 'HELLO');
      expect(feedback.every(f => f.feedback === 'green')).toBe(true);
    });

    it('marks correct positions as green', () => {
      const feedback = getLetterFeedback('SCALE', 'SCARE');
      expect(feedback[0].feedback).toBe('green'); // S
      expect(feedback[1].feedback).toBe('green'); // C
      expect(feedback[2].feedback).toBe('green'); // A
      // L is not at position 3 in SCARE
      expect(feedback[4].feedback).toBe('green'); // E
    });
  });

  describe('wrong position matches (yellow)', () => {
    it('marks letters in wrong position as yellow', () => {
      const feedback = getLetterFeedback('HEART', 'EARTH');
      // H is at 0 in HEART, at 4 in EARTH - yellow
      expect(feedback[0].feedback).toBe('yellow');
    });
  });

  describe('non-matches (gray)', () => {
    it('marks letters not in target as gray', () => {
      const feedback = getLetterFeedback('HELLO', 'WORLD');
      // H is not in WORLD
      expect(feedback[0].feedback).toBe('gray');
    });
  });

  describe('duplicate letter handling', () => {
    it('handles duplicate letters correctly', () => {
      // Target has one L, submitted has two L's
      const feedback = getLetterFeedback('LLAMA', 'LABEL');
      // First L matches position 0 - green
      expect(feedback[0].feedback).toBe('green');
      // Second L - target only has one L at position 0, this one is extra
      // but LABEL has L at position 4 too, so it's yellow
      expect(feedback[1].feedback).toBe('yellow');
    });
  });
});

describe('feedbackToEmoji', () => {
  it('converts feedback to emoji string', () => {
    const feedback: LetterFeedback[] = [
      { letter: 'H', feedback: 'green', position: 0 },
      { letter: 'E', feedback: 'yellow', position: 1 },
      { letter: 'L', feedback: 'gray', position: 2 },
    ];
    expect(feedbackToEmoji(feedback)).toBe('🟩🟨⬜');
  });

  it('handles empty feedback array', () => {
    expect(feedbackToEmoji([])).toBe('');
  });
});

describe('isTargetWordFound', () => {
  it('returns true when all letters are green', () => {
    const feedback = getLetterFeedback('HELLO', 'HELLO');
    expect(isTargetWordFound(feedback)).toBe(true);
  });

  it('returns false when some letters are not green', () => {
    const feedback = getLetterFeedback('HELLO', 'WORLD');
    expect(isTargetWordFound(feedback)).toBe(false);
  });

  it('returns false for empty feedback', () => {
    expect(isTargetWordFound([])).toBe(false);
  });
});

describe('getLetterKnowledge', () => {
  it('tracks best knowledge for each letter', () => {
    const attempts = [
      { word: 'HEART', feedback: getLetterFeedback('HEART', 'EARTH') },
    ];
    const knowledge = getLetterKnowledge(attempts);

    expect(knowledge.has('H')).toBe(true);
    expect(knowledge.has('E')).toBe(true);
    expect(knowledge.has('A')).toBe(true);
    expect(knowledge.has('R')).toBe(true);
    expect(knowledge.has('T')).toBe(true);
  });

  it('prioritizes green over yellow over gray', () => {
    const attempts = [
      { word: 'HELLO', feedback: getLetterFeedback('HELLO', 'OELLO') }, // H gray
      { word: 'HELPS', feedback: getLetterFeedback('HELPS', 'HELLO') }, // H might be yellow here
    ];
    const knowledge = getLetterKnowledge(attempts);

    // L should be green (from HELLO vs OELLO, positions 2,3 match)
    expect(knowledge.get('L')).toBe('green');
  });
});

describe('invisible Unicode character handling', () => {
  it('handles target word with RTL mark', () => {
    // שמים with RTL mark (U+200F) - the bug that was reported
    const targetWithRtl = 'שמים\u200F';
    const feedback = getLetterFeedback('שמים', targetWithRtl, 'he');

    // Should return 4 feedback items, not 5
    expect(feedback.length).toBe(4);
    expect(feedback.every(f => f.feedback === 'green')).toBe(true);
    // No "?" padding should occur
    expect(feedback.every(f => f.letter !== '?')).toBe(true);
  });

  it('handles target word with zero-width space', () => {
    const targetWithZws = 'HELLO\u200B'; // Zero-width space at end
    const feedback = getLetterFeedback('HELLO', targetWithZws);

    expect(feedback.length).toBe(5);
    expect(feedback.every(f => f.feedback === 'green')).toBe(true);
  });

  it('handles submitted word with invisible characters', () => {
    const submittedWithMarks = '\u200Fשמים\u200F'; // RTL marks at both ends
    const feedback = getLetterFeedback(submittedWithMarks, 'שמים', 'he');

    expect(feedback.length).toBe(4);
    expect(feedback.every(f => f.feedback === 'green')).toBe(true);
  });

  it('handles Hebrew word with niqqud (vowel points)', () => {
    // שָׁמַיִם with niqqud
    const targetWithNiqqud = 'שָׁמַיִם';
    const feedback = getLetterFeedback('שמים', targetWithNiqqud, 'he');

    // Niqqud should be stripped, leaving just the 4 consonants
    expect(feedback.length).toBe(4);
    expect(feedback.every(f => f.feedback === 'green')).toBe(true);
  });

  it('handles both words having invisible characters', () => {
    const target = 'HELLO\u200B\u200F'; // ZWS + RTL mark
    const submitted = '\uFEFFHELLO\u00AD'; // BOM + soft hyphen
    const feedback = getLetterFeedback(submitted, target);

    expect(feedback.length).toBe(5);
    expect(feedback.every(f => f.feedback === 'green')).toBe(true);
  });
});

describe('canFormWordOnBoard', () => {
  describe('valid words', () => {
    it('returns true for word that can be traced horizontally', () => {
      const grid = [
        ['C', 'A', 'T'],
        ['D', 'O', 'G'],
        ['X', 'Y', 'Z'],
      ];
      expect(canFormWordOnBoard('CAT', grid)).toBe(true);
    });

    it('returns true for word that can be traced vertically', () => {
      const grid = [
        ['C', 'A', 'T'],
        ['O', 'O', 'G'],
        ['W', 'Y', 'Z'],
      ];
      expect(canFormWordOnBoard('COW', grid)).toBe(true);
    });

    it('returns true for word that can be traced diagonally', () => {
      const grid = [
        ['C', 'A', 'T'],
        ['D', 'A', 'G'],
        ['X', 'Y', 'R'],
      ];
      expect(canFormWordOnBoard('CAR', grid)).toBe(true);
    });

    it('returns true for word that uses mixed directions', () => {
      const grid = [
        ['D', 'O', 'G'],
        ['X', 'A', 'Y'],
        ['Z', 'T', 'W'],
      ];
      // D→O→A→T: D(0,0)→O(0,1)→A(1,1)→T(2,1)
      expect(canFormWordOnBoard('DOAT', grid)).toBe(true);
    });

    it('handles single letter words', () => {
      const grid = [
        ['A', 'B', 'C'],
        ['D', 'E', 'F'],
        ['G', 'H', 'I'],
      ];
      expect(canFormWordOnBoard('A', grid)).toBe(true);
    });

    it('handles case insensitivity', () => {
      const grid = [
        ['C', 'A', 'T'],
        ['D', 'O', 'G'],
        ['X', 'Y', 'Z'],
      ];
      expect(canFormWordOnBoard('cat', grid)).toBe(true);
      expect(canFormWordOnBoard('Cat', grid)).toBe(true);
    });
  });

  describe('invalid words', () => {
    it('returns false for word with non-adjacent letters', () => {
      const grid = [
        ['C', 'X', 'A'],
        ['Y', 'Z', 'W'],
        ['T', 'V', 'U'],
      ];
      // C(0,0) and A(0,2) are not adjacent - there's X between them
      expect(canFormWordOnBoard('CAT', grid)).toBe(false);
    });

    it('returns false for word that requires reusing same cell', () => {
      const grid = [
        ['A', 'B', 'C'],
        ['D', 'E', 'F'],
        ['G', 'H', 'I'],
      ];
      // ABA would require using A twice
      expect(canFormWordOnBoard('ABA', grid)).toBe(false);
    });

    it('returns false for word with letters not on board', () => {
      const grid = [
        ['A', 'B', 'C'],
        ['D', 'E', 'F'],
        ['G', 'H', 'I'],
      ];
      expect(canFormWordOnBoard('ZZZZ', grid)).toBe(false);
    });

    it('returns false for word longer than board allows', () => {
      const grid = [
        ['A', 'B'],
        ['C', 'D'],
      ];
      // Only 4 cells, can't form a 5-letter word
      expect(canFormWordOnBoard('ABCDE', grid)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns false for empty word', () => {
      const grid = [
        ['A', 'B', 'C'],
        ['D', 'E', 'F'],
        ['G', 'H', 'I'],
      ];
      expect(canFormWordOnBoard('', grid)).toBe(false);
    });

    it('returns false for empty grid', () => {
      expect(canFormWordOnBoard('CAT', [])).toBe(false);
    });

    it('returns false for grid with empty rows', () => {
      const grid: string[][] = [[]];
      expect(canFormWordOnBoard('CAT', grid)).toBe(false);
    });

    it('returns false for null-like inputs', () => {
      const grid = [
        ['A', 'B', 'C'],
        ['D', 'E', 'F'],
        ['G', 'H', 'I'],
      ];
      // @ts-expect-error - testing invalid input
      expect(canFormWordOnBoard(null, grid)).toBe(false);
      // @ts-expect-error - testing invalid input
      expect(canFormWordOnBoard('CAT', null)).toBe(false);
    });
  });

  describe('Hebrew support', () => {
    it('validates Hebrew words on board', () => {
      const grid = [
        ['א', 'ב', 'ג'],
        ['ד', 'ה', 'ו'],
        ['ז', 'ח', 'ט'],
      ];
      // אבה: א(0,0)→ב(0,1)→ה(1,1) - all adjacent
      expect(canFormWordOnBoard('אבה', grid, 'he')).toBe(true);
    });
  });
});
