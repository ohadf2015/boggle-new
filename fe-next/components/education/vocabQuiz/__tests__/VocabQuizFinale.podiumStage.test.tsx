import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, act, within } from '@testing-library/react';

const fireVictoryConfetti = vi.fn();
vi.mock('@/utils/confettiUtils', () => ({ fireVictoryConfetti: () => fireVictoryConfetti() }));
vi.mock('@/components/ui/InteractiveMascot', () => ({ InteractiveMascot: () => null }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));
vi.mock('@/components/Avatar', () => ({ default: ({ userId }: { userId: string }) => <span>{`avatar:${userId}`}</span> }));
vi.mock('framer-motion', () => ({
  m: { div: ({ initial: _i, animate: _a, transition: _t, ...rest }: Record<string, unknown>) => <div {...(rest as object)} /> },
  useReducedMotion: () => false,
}));

import { VocabQuizFinale } from '../VocabQuizFinale';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const FIVE = [
  { username: 'ana', score: 480, streak: 4, bestStreak: 5, correctCount: 4 },
  { username: 'bo', score: 300, streak: 0, bestStreak: 2, correctCount: 3 },
  { username: 'cy', score: 120, streak: 0, bestStreak: 1, correctCount: 1 },
  { username: 'dee', score: 90, streak: 2, bestStreak: 2, correctCount: 1 },
  { username: 'eli', score: 40, streak: 0, bestStreak: 1, correctCount: 1 },
];

describe('VocabQuizFinale — the wall podium', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    fireVictoryConfetti.mockClear();
  });

  it('Given a finished quiz, Then the class sees the painted podium with every top-three student standing on it', () => {
    render(<VocabQuizFinale standings={FIVE} totalQuestions={5} t={t} />);
    act(() => void vi.advanceTimersByTime(6000));
    expect(screen.getByTestId('podium-stage')).toBeInTheDocument();
    expect(screen.queryByTestId('standings-split')).toBeNull();
    expect(screen.getAllByTestId('podium-avatar')).toHaveLength(3);
    expect(screen.getByTestId('podium-medal-1')).toBeInTheDocument();
    expect(screen.getByTestId('podium-place-1')).toHaveTextContent('ana');
  });

  it('Given the reveal is running, Then third lands before the winner', () => {
    render(<VocabQuizFinale standings={FIVE} totalQuestions={5} t={t} />);
    act(() => void vi.advanceTimersByTime(800));
    expect(screen.getByTestId('podium-place-3')).toHaveAttribute('data-revealed', 'true');
    expect(screen.getByTestId('podium-place-1')).toHaveAttribute('data-revealed', 'false');
    act(() => void vi.advanceTimersByTime(3000));
    expect(screen.getByTestId('podium-place-1')).toHaveAttribute('data-revealed', 'true');
  });

  it('Given the winner has not landed, Then the confetti waits for them, and fires once when they do', () => {
    render(<VocabQuizFinale standings={FIVE} totalQuestions={5} t={t} />);
    act(() => void vi.advanceTimersByTime(2000));
    expect(fireVictoryConfetti).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(4000));
    expect(fireVictoryConfetti).toHaveBeenCalledTimes(1);
  });

  it('Given more than three players, Then 4th and 5th sit in one centred row under the podium, keeping their true placing', () => {
    render(<VocabQuizFinale standings={FIVE} totalQuestions={5} t={t} />);
    act(() => void vi.advanceTimersByTime(6000));
    const row = screen.getByTestId('quiz-finale-runners-up');
    expect(row.className).toContain('justify-center');
    const items = within(row).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('4');
    expect(items[0]).toHaveTextContent('dee');
    expect(items[1]).toHaveTextContent('5');
    expect(items[1]).toHaveTextContent('eli');
  });

  it('Given three or fewer players, Then there is no empty runners-up row', () => {
    render(<VocabQuizFinale standings={FIVE.slice(0, 3)} totalQuestions={5} t={t} />);
    expect(screen.queryByTestId('quiz-finale-runners-up')).toBeNull();
  });

  it('Given nobody answered correctly, Then the podium is muted and shows at once, with no medal', () => {
    const blank = FIVE.slice(0, 2).map((p) => ({ ...p, score: 0, correctCount: 0 }));
    render(<VocabQuizFinale standings={blank} totalQuestions={5} t={t} />);
    expect(screen.getByTestId('podium-place-1')).toHaveAttribute('data-revealed', 'true');
    expect(screen.queryAllByTestId(/^podium-medal-/)).toHaveLength(0);
  });

  it('Given a 16:10 wall, Then the podium is sized by the height left, not the full width, so Rematch stays on screen', () => {
    render(<VocabQuizFinale standings={FIVE} totalQuestions={5} onPlayAgain={() => {}} t={t} />);
    expect(screen.getByTestId('podium-stage').className).toMatch(/w-\[min\(100%,calc\(\(100dvh_-_\d+rem\)\*1\.768\)\)\]/);
  });
});
