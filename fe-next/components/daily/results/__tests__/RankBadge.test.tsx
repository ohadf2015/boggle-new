/**
 * Tests for RankBadge — the "#N out of M" pill plus the "Top X%" percentile pill
 * on the Word Hunt results screen.
 *
 * Guards the fix for the "טופ 100%" bug: when a player finishes last (rank ===
 * totalPlayers → percentile 100), a "Top 100%" pill is meaningless and must be
 * hidden. The rank pill itself still shows.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { RankBadge } from '../RankBadge';
import type { WordHuntStats } from '../types';

const tReal = (key: string) => {
  if (key === 'wordHunt.results.outOf') return 'out of {total}';
  if (key === 'wordHunt.results.topPercentile') return 'Top {percentile}%';
  return key;
};

function makeStats(overrides: Partial<WordHuntStats> = {}): WordHuntStats {
  return {
    totalPlayers: 500,
    solvedCount: 300,
    solveRate: 60,
    attemptDistribution: {},
    avgAttemptsSolved: 3.5,
    yourStats: { solved: true, attemptsUsed: 3, percentile: 20, rank: 5 },
    ...overrides,
  };
}

describe('RankBadge', () => {
  it('renders nothing when the player did not solve', () => {
    const { container } = render(
      <RankBadge stats={makeStats({ yourStats: { solved: false, attemptsUsed: 3, percentile: 0, rank: 2 } })} t={tReal} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows the rank pill and a meaningful percentile pill for a top finish', () => {
    render(<RankBadge stats={makeStats({ totalPlayers: 500, yourStats: { solved: true, attemptsUsed: 2, percentile: 3, rank: 15 } })} t={tReal} />);
    expect(screen.getByText('#15')).toBeInTheDocument();
    // rank 15 / 500 → top 3%
    expect(screen.getByText('Top 3%')).toBeInTheDocument();
  });

  it('hides the percentile pill when the player is last (Top 100%)', () => {
    // rank 2 of 2 → percentile 100 → "Top 100%" is meaningless, hide it.
    render(<RankBadge stats={makeStats({ totalPlayers: 2, yourStats: { solved: true, attemptsUsed: 1, percentile: 100, rank: 2 } })} t={tReal} />);
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.queryByText(/Top 100%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/100%/)).not.toBeInTheDocument();
  });
});
