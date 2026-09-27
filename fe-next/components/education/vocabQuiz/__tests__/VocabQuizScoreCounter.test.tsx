/**
 * Live Vocab Quiz — points flying into the score (RED first).
 *
 * The quiz used to explain a good answer in a sentence ("120 base · 30 for
 * speed · 20 for your streak"). Nobody reads a sentence on a phone with eight
 * seconds on the clock. The points fly into a counter that rolls up instead,
 * so the reward is a number getting bigger — which is the same reward every
 * arcade machine has used for fifty years.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { VocabQuizScoreCounter } from '../VocabQuizScoreCounter';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const value = () => screen.getByTestId('vocab-quiz-score').textContent;

const settle = () => act(() => { vi.advanceTimersByTime(1_200); });

describe('VocabQuizScoreCounter', () => {
  it('shows the score it mounts with, without rolling up from zero', () => {
    // A student who refreshes mid-round must not watch their whole score
    // re-accumulate — that reads as a bug, not a reward.
    render(<VocabQuizScoreCounter score={430} pop={null} t={t} />);
    expect(value()).toBe('430');
  });

  it('rolls up to the new total rather than snapping to it', () => {
    const { rerender } = render(<VocabQuizScoreCounter score={0} pop={null} t={t} />);
    rerender(<VocabQuizScoreCounter score={150} pop={{ points: 150, key: 1 }} t={t} />);
    expect(value()).toBe('0');
    settle();
    expect(value()).toBe('150');
  });

  it('flies the points that earned the jump', () => {
    const { rerender } = render(<VocabQuizScoreCounter score={0} pop={null} t={t} />);
    rerender(<VocabQuizScoreCounter score={150} pop={{ points: 150, key: 1 }} t={t} />);
    expect(screen.getByTestId('vocab-quiz-score-pop')).toHaveTextContent('150');
  });

  it('shows nothing flying for a wrong answer worth nothing', () => {
    const { rerender } = render(<VocabQuizScoreCounter score={150} pop={null} t={t} />);
    rerender(<VocabQuizScoreCounter score={150} pop={{ points: 0, key: 2 }} t={t} />);
    expect(screen.queryByTestId('vocab-quiz-score-pop')).toBeNull();
  });

  it('never rolls backwards when the server sends the same total twice', () => {
    const { rerender } = render(<VocabQuizScoreCounter score={150} pop={null} t={t} />);
    rerender(<VocabQuizScoreCounter score={150} pop={{ points: 0, key: 3 }} t={t} />);
    settle();
    expect(value()).toBe('150');
  });
});
