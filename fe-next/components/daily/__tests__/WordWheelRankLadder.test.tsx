import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/Avatar', () => ({ default: () => null }));

import WordWheelRankLadder from '../WordWheelRankLadder';

const t = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

describe('WordWheelRankLadder', () => {
  it('fills toward the next rival above the score', () => {
    render(<WordWheelRankLadder t={t} score={10} rivals={[{ name: 'Ava', score: 20 }]} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('50');
    expect(screen.getByTestId('next-rival-slot')).toBeInTheDocument();
    expect(screen.getByText(/wordWheel\.pointsToPass.*"count":10/)).toBeInTheDocument();
  });

  it('measures from the last rival already passed', () => {
    render(
      <WordWheelRankLadder
        t={t}
        score={25}
        rivals={[{ name: 'Ben', score: 10 }, { name: 'Cy', score: 30 }]}
      />,
    );
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('75');
  });

  it('shows the top-of-board line when nobody is above the score', () => {
    render(<WordWheelRankLadder t={t} score={30} rivals={[{ name: 'Ava', score: 20 }]} />);
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByText('wordWheel.climb.top')).toBeInTheDocument();
  });
});
