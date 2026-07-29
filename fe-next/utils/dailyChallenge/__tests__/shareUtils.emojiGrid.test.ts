/**
 * Tests for Word Hunt shareable result text generation
 */
import { generateWordHuntShareableResult } from '../shareUtils';
import type { WordHuntResult } from '../types';

function makeResult(overrides: Partial<WordHuntResult> = {}): WordHuntResult {
  return {
    puzzleNumber: 42,
    puzzleDate: '2026-03-14',
    language: 'en',
    solved: true,
    attemptsUsed: 3,
    targetWord: 'CASTLE',
    attempts: [
      {
        word: 'SCALES',
        feedback: [
          { letter: 'S', feedback: 'yellow', position: 0 },
          { letter: 'C', feedback: 'yellow', position: 1 },
          { letter: 'A', feedback: 'yellow', position: 2 },
          { letter: 'L', feedback: 'yellow', position: 3 },
          { letter: 'E', feedback: 'yellow', position: 4 },
          { letter: 'S', feedback: 'gray', position: 5 },
        ],
        timestamp: 1000,
      },
      {
        word: 'CLASTE',
        feedback: [
          { letter: 'C', feedback: 'green', position: 0 },
          { letter: 'L', feedback: 'yellow', position: 1 },
          { letter: 'A', feedback: 'green', position: 2 },
          { letter: 'S', feedback: 'green', position: 3 },
          { letter: 'T', feedback: 'green', position: 4 },
          { letter: 'E', feedback: 'gray', position: 5 },
        ],
        timestamp: 2000,
      },
      {
        word: 'CASTLE',
        feedback: [
          { letter: 'C', feedback: 'green', position: 0 },
          { letter: 'A', feedback: 'green', position: 1 },
          { letter: 'S', feedback: 'green', position: 2 },
          { letter: 'T', feedback: 'green', position: 3 },
          { letter: 'L', feedback: 'green', position: 4 },
          { letter: 'E', feedback: 'green', position: 5 },
        ],
        timestamp: 3000,
      },
    ],
    streakDays: 5,
    completedAt: '2026-03-14T12:00:00Z',
    ...overrides,
  };
}

describe('generateWordHuntShareableResult', () => {
  it('includes header with puzzle number', () => {
    const result = makeResult({ puzzleNumber: 247 });
    const text = generateWordHuntShareableResult(result);

    expect(text).toContain('247');
    expect(text).toContain('Word Hunt');
  });

  it('shows solved attempt count for solved puzzles', () => {
    const result = makeResult({ attemptsUsed: 3 });
    const text = generateWordHuntShareableResult(result);

    expect(text).toContain('Solved in 3/10');
  });

  it('shows X/10 for unsolved puzzles', () => {
    const result = makeResult({
      solved: false,
      attemptsUsed: 10,
      attempts: [],
    });
    const text = generateWordHuntShareableResult(result);

    expect(text).toContain('X/10');
  });

  it('includes game link emoji at end', () => {
    const result = makeResult();
    const text = generateWordHuntShareableResult(result);

    expect(text).toContain('🎮');
  });

  it('does not reveal the target word (spoiler-free)', () => {
    const result = makeResult({ targetWord: 'CASTLE' });
    const text = generateWordHuntShareableResult(result);

    expect(text).not.toContain('CASTLE');
    expect(text).not.toContain('castle');
  });

  it('handles empty attempts gracefully', () => {
    const result = makeResult({ attempts: [], attemptsUsed: 0, solved: false });
    const text = generateWordHuntShareableResult(result);

    // Should not crash, should still have header
    expect(text).toContain('Word Hunt');
  });
});
