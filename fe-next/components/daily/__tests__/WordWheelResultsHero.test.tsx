import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import WordWheelResultsHero from '../WordWheelResultsHero';

const t = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const base = {
  t,
  score: 42,
  wordsFound: ['ANT', 'GAIN'],
  puzzleNumber: 285,
  streakDays: 3,
  showStreak: true,
  formatWord: (w: string) => w,
};

describe('WordWheelResultsHero', () => {
  it('carries the run highlights inside the card instead of stacking them below', () => {
    render(<WordWheelResultsHero {...base} highlights={<span data-testid="hl">Only you</span>} />);
    const hero = screen.getByTestId('word-wheel-results-hero');
    expect(hero.contains(screen.getByTestId('hl'))).toBe(true);
    expect(screen.getByTestId('results-highlights')).toBeInTheDocument();
  });

  it('renders no highlight row when there is nothing to call out', () => {
    render(<WordWheelResultsHero {...base} />);
    expect(screen.queryByTestId('results-highlights')).toBeNull();
  });

  it('leads with the rank the score reached on the same ladder as the play screen', () => {
    render(<WordWheelResultsHero {...base} />);
    expect(screen.getByTestId('results-rank-name').textContent).toBe('wordWheel.rank.onARoll');
    expect(screen.getByTestId('word-wheel-results-hero').getAttribute('data-rank-index')).toBe('2');
  });

  it('shows words found, the longest word and the streak', () => {
    render(<WordWheelResultsHero {...base} />);
    expect(screen.getByTestId('word-wheel-words-stat').textContent).toContain('2');
    expect(screen.getByText('GAIN')).toBeInTheDocument();
    expect(screen.getByTestId('word-wheel-streak-chip').textContent).toContain('3');
  });

  it('shows the score instead of a streak when the streak is hidden', () => {
    render(<WordWheelResultsHero {...base} showStreak={false} />);
    expect(screen.queryByTestId('word-wheel-streak-chip')).toBeNull();
    expect(screen.getByText('wordWheel.scoreLabel')).toBeInTheDocument();
  });

  it('offers share only once there is something to share', () => {
    const { rerender } = render(<WordWheelResultsHero {...base} wordsFound={[]} score={0} />);
    expect(screen.queryByTestId('word-wheel-share')).toBeNull();
    rerender(<WordWheelResultsHero {...base} />);
    expect(screen.getByTestId('word-wheel-share')).toBeInTheDocument();
  });

  it('copies the share text without emoji', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const onShareClick = vi.fn();
    render(<WordWheelResultsHero {...base} onShareClick={onShareClick} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'share.emojiCard.copy' }));
    });
    expect(onShareClick).toHaveBeenCalledWith('copy');
    const text = writeText.mock.calls[0][0] as string;
    expect(text).toContain('lexiclash.live');
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
