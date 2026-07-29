import { inferTargetLetterCounts, computeYellowState } from '../wordHuntYellowLogic';
import type { TargetAttempt, AccumulatedClue } from '@/components/daily/survival/types';

const mkAttempt = (word: string, feedbacks: Array<'green' | 'yellow' | 'gray'>): TargetAttempt => ({
  word,
  feedback: word.split('').map((letter, i) => ({
    letter,
    feedback: feedbacks[i],
    position: i,
  })),
  timestamp: Date.now(),
});

describe('inferTargetLetterCounts', () => {
  it('counts green+yellow per letter from a single attempt', () => {
    // Guess "APPLE" with A=green, P=green, P=yellow, L=gray, E=gray
    const attempt = mkAttempt('APPLE', ['green', 'green', 'yellow', 'gray', 'gray']);
    const counts = inferTargetLetterCounts([attempt]);
    expect(counts.get('A')).toBe(1);
    expect(counts.get('P')).toBe(2); // 1 green + 1 yellow
    expect(counts.has('L')).toBe(false); // gray only
    expect(counts.has('E')).toBe(false);
  });

  it('takes max across multiple attempts', () => {
    // Attempt 1: "ROBOT" — R=green, O=yellow, B=gray, O=gray, T=gray → R:1, O:1
    // Attempt 2: "ROOTS" — R=green, O=green, O=yellow, T=gray, S=gray → R:1, O:2
    const a1 = mkAttempt('ROBOT', ['green', 'yellow', 'gray', 'gray', 'gray']);
    const a2 = mkAttempt('ROOTS', ['green', 'green', 'yellow', 'gray', 'gray']);
    const counts = inferTargetLetterCounts([a1, a2]);
    expect(counts.get('R')).toBe(1);
    expect(counts.get('O')).toBe(2); // max of 1 and 2
  });

  it('handles mixed green and yellow correctly', () => {
    const attempt = mkAttempt('SPEED', ['gray', 'gray', 'green', 'yellow', 'gray']);
    const counts = inferTargetLetterCounts([attempt]);
    expect(counts.get('E')).toBe(2); // 1 green + 1 yellow
  });
});

describe('computeYellowState', () => {
  const emptyClues = new Map<number, AccumulatedClue>();

  it('green removes yellow for same letter when count is met', () => {
    // Attempt 1: "RANGE" — R=yellow at pos 0
    // Attempt 2: "STARE" — R=green at pos 3
    // Target has 1 R → yellow should be removed
    const a1 = mkAttempt('RANGE', ['yellow', 'gray', 'gray', 'gray', 'gray']);
    const a2 = mkAttempt('STARE', ['gray', 'gray', 'gray', 'green', 'gray']);
    const counts = new Map([['R', 1]]);
    const { persistedLetters, knownLetters } = computeYellowState([a1, a2], counts, emptyClues);

    // Green at pos 3, NO yellow at pos 0
    expect(persistedLetters.get(3)).toEqual({ letter: 'R', type: 'green' });
    expect(persistedLetters.has(0)).toBe(false);
    // knownLetters should NOT contain R since all found green
    expect(knownLetters.has('R')).toBe(false);
  });

  it('latest position wins for yellows (dedup)', () => {
    // Attempt 1: R=yellow at pos 0
    // Attempt 2: R=yellow at pos 2
    // Target has 1 R → only pos 2 (latest) should show yellow
    const a1 = mkAttempt('RAT', ['yellow', 'gray', 'gray']);
    const a2 = mkAttempt('TAR', ['gray', 'gray', 'yellow']);
    const counts = new Map([['R', 1]]);
    const { persistedLetters } = computeYellowState([a1, a2], counts, emptyClues);

    expect(persistedLetters.has(0)).toBe(false);
    expect(persistedLetters.get(2)).toEqual({ letter: 'R', type: 'yellow' });
  });

  it('caps yellows by frequency', () => {
    // Target has 1 E. Two yellows for E should result in only 1.
    const a1 = mkAttempt('LEEP', ['gray', 'yellow', 'yellow', 'gray']);
    const counts = new Map([['E', 1]]);
    const { persistedLetters } = computeYellowState([a1], counts, emptyClues);

    // Only the latest (higher index) yellow should persist
    const yellowPositions = [...persistedLetters.entries()]
      .filter(([, v]) => v.letter === 'E' && v.type === 'yellow')
      .map(([pos]) => pos);
    expect(yellowPositions).toHaveLength(1);
  });

  it('works with inferred counts (unknown target)', () => {
    // Same as green-removes-yellow but using inferTargetLetterCounts
    const a1 = mkAttempt('RANGE', ['yellow', 'gray', 'gray', 'gray', 'gray']);
    const a2 = mkAttempt('STARE', ['gray', 'gray', 'gray', 'green', 'gray']);
    const counts = inferTargetLetterCounts([a1, a2]);
    // Inferred: R has max 1 (both attempts show 1 non-gray R)
    expect(counts.get('R')).toBe(1);
    const { persistedLetters } = computeYellowState([a1, a2], counts, emptyClues);
    expect(persistedLetters.get(3)).toEqual({ letter: 'R', type: 'green' });
    expect(persistedLetters.has(0)).toBe(false);
  });

  it('includes discovery attempts in processing', () => {
    const a1: TargetAttempt = {
      ...mkAttempt('CAT', ['gray', 'yellow', 'gray']),
      isDiscovery: true,
    };
    const counts = new Map([['A', 1]]);
    const { persistedLetters, knownLetters } = computeYellowState([a1], counts, emptyClues);
    expect(persistedLetters.get(1)).toEqual({ letter: 'A', type: 'yellow' });
    expect(knownLetters.has('A')).toBe(true);
  });

  it('accumulatedClues greens count toward green total', () => {
    // accumulatedClues has R=green at pos 3, attempt has R=yellow at pos 0
    // Target has 1 R → yellow removed
    const a1 = mkAttempt('RANGE', ['yellow', 'gray', 'gray', 'gray', 'gray']);
    const clues = new Map<number, AccumulatedClue>([
      [3, { letter: 'R', type: 'green' }],
    ]);
    const counts = new Map([['R', 1]]);
    const { persistedLetters } = computeYellowState([a1], counts, clues);
    expect(persistedLetters.has(0)).toBe(false);
  });
});
