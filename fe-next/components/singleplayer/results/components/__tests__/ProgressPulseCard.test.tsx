import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProgressPulseCard } from '../ProgressPulseCard';
import type { ProgressSnapshot } from '../../progressSnapshot';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key} ${Object.values(params).join(' ')}` : key,
    language: 'en',
    dir: 'ltr',
  }),
}));

function snapshot(overrides: Partial<ProgressSnapshot> = {}): ProgressSnapshot {
  return {
    gameNumber: 5, score: 80, lastScore: 60, delta: 20, best: 120, isNewBest: false,
    recentScores: [30, 120, 95, 60, 80], wordsFound: 10, wordsPossible: 50, coverage: 20,
    nextGoal: { kind: 'beatBest', gap: 40 },
    ...overrides,
  };
}

describe('ProgressPulseCard — see how you are performing', () => {
  it('Given a mid-run game, When rendered, Then it shows the game number, the delta vs last, best, coverage and the goal', () => {
    render(<ProgressPulseCard snapshot={snapshot()} />);
    expect(screen.getByTestId('progress-pulse')).toBeInTheDocument();
    expect(screen.getByText('results.progressPulse.game 5')).toBeInTheDocument();
    const delta = screen.getByTestId('progress-delta');
    expect(delta).toHaveAttribute('data-trend', 'up');
    expect(delta).toHaveTextContent('+20');
    expect(screen.getByText('results.progressPulse.best 120')).toBeInTheDocument();
    expect(screen.getByText('results.progressPulse.coverage 10 50 20')).toBeInTheDocument();
    expect(screen.getByText('results.progressPulse.goalBeatBest 40')).toBeInTheDocument();
  });

  it('Given a sparkline, When rendered, Then one bar per recent score with the current game marked', () => {
    render(<ProgressPulseCard snapshot={snapshot()} />);
    const bars = screen.getAllByTestId('progress-bar');
    expect(bars).toHaveLength(5);
    expect(bars[4]).toHaveAttribute('data-current', 'true');
    expect(bars[0]).toHaveAttribute('data-current', 'false');
  });

  it('Given a new personal best, When rendered, Then the NEW BEST badge and the raise-the-bar goal show', () => {
    render(<ProgressPulseCard snapshot={snapshot({ isNewBest: true, best: 150, score: 150, delta: 90, nextGoal: { kind: 'newBest', target: 150 } })} />);
    expect(screen.getByText('results.progressPulse.newBest')).toBeInTheDocument();
    expect(screen.getByText('results.progressPulse.goalNewBest 150')).toBeInTheDocument();
  });

  it('Given the first game, When rendered, Then no delta chip and the first-game goal', () => {
    render(<ProgressPulseCard snapshot={snapshot({ gameNumber: 1, lastScore: null, delta: null, recentScores: [42], nextGoal: { kind: 'first' } })} />);
    expect(screen.queryByTestId('progress-delta')).toBeNull();
    expect(screen.getByText('results.progressPulse.goalFirst')).toBeInTheDocument();
  });

  it('Given a drop vs last game, When rendered, Then the chip trends down but stays encouraging (no minus-only copy)', () => {
    render(<ProgressPulseCard snapshot={snapshot({ delta: -15, score: 45 })} />);
    const delta = screen.getByTestId('progress-delta');
    expect(delta).toHaveAttribute('data-trend', 'down');
    expect(delta).toHaveTextContent('-15');
  });

  it('Given no board size, When rendered, Then the coverage line falls back to the words-found line', () => {
    render(<ProgressPulseCard snapshot={snapshot({ wordsPossible: null, coverage: null })} />);
    expect(screen.getByText('results.progressPulse.wordsFound 10')).toBeInTheDocument();
  });
});
