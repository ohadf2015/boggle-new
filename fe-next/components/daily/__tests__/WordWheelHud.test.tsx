import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import WordWheelHud from '../WordWheelHud';
import WordWheelLiveRanks from '../WordWheelLiveRanks';

vi.mock('@/components/Avatar', () => ({ default: () => null }));

const t = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

describe('WordWheelHud', () => {
  it('shows the clock and a draining time bar in the timed game', () => {
    render(<WordWheelHud t={t} timeLeft={88} duration={120} combo={0} showCombo onExit={vi.fn()} />);
    expect(screen.getByTestId('wheel-timer').textContent).toContain('1:28');
    expect(screen.getByTestId('wheel-time-bar').getAttribute('aria-valuenow')).toBe('88');
    expect(screen.getByTestId('combo-slot')).toBeInTheDocument();
  });

  it('swaps the clock for an end-run button in practice', () => {
    const onEnd = vi.fn();
    render(<WordWheelHud t={t} timeLeft={120} duration={120} combo={0} practice onEndPractice={onEnd} />);
    expect(screen.queryByTestId('wheel-timer')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'practice.endRun' }));
    expect(onEnd).toHaveBeenCalled();
  });

  it('fires exit from the back button', () => {
    const onExit = vi.fn();
    render(<WordWheelHud t={t} timeLeft={60} duration={120} combo={0} onExit={onExit} />);
    fireEvent.click(screen.getByTestId('wheel-exit'));
    expect(onExit).toHaveBeenCalled();
  });
});

describe('WordWheelLiveRanks', () => {
  it('slots you in by score among the rivals', () => {
    render(
      <WordWheelLiveRanks
        t={t}
        score={40}
        rivals={[{ name: 'Low', score: 10 }, { name: 'High', score: 90 }]}
      />,
    );
    const rows = screen.getAllByTestId('live-rank-row');
    expect(rows.map(r => r.getAttribute('data-name'))).toEqual(['High', 'you', 'Low']);
    expect(rows[1].textContent).toContain('2');
  });

  it('invites you to be first when nobody has played', () => {
    render(<WordWheelLiveRanks t={t} score={0} rivals={[]} />);
    expect(screen.getByText('wordHunt.desktop.beFirst')).toBeInTheDocument();
    expect(screen.getByText('wordHunt.desktop.liveRanks')).toBeInTheDocument();
  });
});
