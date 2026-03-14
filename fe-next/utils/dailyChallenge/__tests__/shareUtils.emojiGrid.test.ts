/**
 * Tests for enhanced Wordle-style emoji grid in share text
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

describe('generateWordHuntShareableResult emoji grid', () => {
  it('includes emoji grid rows from attempt feedback', () => {
    const result = makeResult();
    const text = generateWordHuntShareableResult(result);

    // Should contain emoji rows for each attempt
    expect(text).toContain('🟨🟨🟨🟨🟨⬜');
    expect(text).toContain('🟩🟨🟩🟩🟩⬜');
    expect(text).toContain('🟩🟩🟩🟩🟩🟩');
  });

  it('includes streak in share text when streak > 1', () => {
    const result = makeResult({ streakDays: 7 });
    const text = generateWordHuntShareableResult(result);

    expect(text).toContain('🔥');
    expect(text).toMatch(/7/);
  });

  it('omits streak when streakDays <= 1', () => {
    const result = makeResult({ streakDays: 0 });
    const text = generateWordHuntShareableResult(result);

    expect(text).not.toContain('🔥');
  });

  it('shows X/10 for unsolved puzzles', () => {
    const result = makeResult({
      solved: false,
      attemptsUsed: 10,
      attempts: Array.from({ length: 10 }, (_, i) => ({
        word: 'FAILED',
        feedback: [
          { letter: 'F', feedback: 'gray' as const, position: 0 },
          { letter: 'A', feedback: 'yellow' as const, position: 1 },
          { letter: 'I', feedback: 'gray' as const, position: 2 },
          { letter: 'L', feedback: 'yellow' as const, position: 3 },
          { letter: 'E', feedback: 'green' as const, position: 4 },
          { letter: 'D', feedback: 'gray' as const, position: 5 },
        ],
        timestamp: i * 1000,
      })),
    });
    const text = generateWordHuntShareableResult(result);

    expect(text).toContain('X/10');
    // Should still have emoji grid rows
    expect(text).toContain('⬜🟨⬜🟨🟩⬜');
  });

  it('includes puzzle number in header', () => {
    const result = makeResult({ puzzleNumber: 247 });
    const text = generateWordHuntShareableResult(result);

    expect(text).toContain('247');
    expect(text).toContain('Word Hunt');
  });

  it('handles empty attempts gracefully', () => {
    const result = makeResult({ attempts: [], attemptsUsed: 0, solved: false });
    const text = generateWordHuntShareableResult(result);

    // Should not crash, should still have header
    expect(text).toContain('Word Hunt');
  });

  it('does not reveal the target word (spoiler-free)', () => {
    const result = makeResult({ targetWord: 'CASTLE' });
    const text = generateWordHuntShareableResult(result);

    expect(text).not.toContain('CASTLE');
    expect(text).not.toContain('castle');
  });
});
