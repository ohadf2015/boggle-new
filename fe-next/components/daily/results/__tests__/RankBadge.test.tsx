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

  // Live daily boards hold 2–8 players (measured 2026-08-01). A percentile over a
  // population that small is noise dressed up as a statistic: rank 3 of 8 renders
  // "Top 38%", rank 2 of 3 renders "Top 67%" — both read as an insult rather than a
  // placement. The concrete "#N out of M" pill is honest at every N and stays.
  describe('percentile population floor', () => {
    it('hides the percentile pill on a tiny board even for a strong finish', () => {
      // rank 3 of 8 → 38% — suppressed.
      render(<RankBadge stats={makeStats({ totalPlayers: 8, yourStats: { solved: true, attemptsUsed: 2, percentile: 38, rank: 3 } })} t={tReal} />);
      expect(screen.getByText('#3')).toBeInTheDocument();
      expect(screen.queryByText(/Top \d+%/)).not.toBeInTheDocument();
    });

    it('hides the percentile pill for a winner on a tiny board', () => {
      // rank 1 of 4 → 25%. "Top 25%" undersells an outright win; the #1 pill says it better.
      render(<RankBadge stats={makeStats({ totalPlayers: 4, yourStats: { solved: true, attemptsUsed: 1, percentile: 25, rank: 1 } })} t={tReal} />);
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.queryByText(/Top \d+%/)).not.toBeInTheDocument();
    });

    it('still shows the percentile pill once the board is large enough to mean something', () => {
      // rank 4 of 20 → 20%, the smallest board where a percentile is kept.
      render(<RankBadge stats={makeStats({ totalPlayers: 20, yourStats: { solved: true, attemptsUsed: 2, percentile: 20, rank: 4 } })} t={tReal} />);
      expect(screen.getByText('#4')).toBeInTheDocument();
      expect(screen.getByText('Top 20%')).toBeInTheDocument();
    });
  });
});
