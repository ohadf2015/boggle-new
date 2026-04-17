/**
 * Tests for StatsBlurb — one-sentence, single-stat narrative on the
 * Word Hunt Results tab. Picks the most relevant single stat depending on
 * whether the player solved.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatsBlurb } from '../StatsBlurb';
import type { WordHuntStats } from '../types';

const tReal = (key: string, fallbackOrParams?: string | Record<string, string | number>, paramsWhenFallback?: Record<string, string | number>) => {
  const fallback = typeof fallbackOrParams === 'string' ? fallbackOrParams : key;
  const params = typeof fallbackOrParams === 'object' ? fallbackOrParams : paramsWhenFallback;
  if (!params) return fallback;
  return Object.entries(params).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
    fallback,
  );
};

function makeStats(overrides: Partial<WordHuntStats> = {}): WordHuntStats {
  return {
    totalPlayers: 500,
    solvedCount: 300,
    solveRate: 60,
    attemptDistribution: {},
    avgAttemptsSolved: 3.5,
    yourStats: { solved: true, attemptsUsed: 3, percentile: 20 },
    ...overrides,
  };
}

describe('StatsBlurb', () => {
  it('renders nothing when player count is too low', () => {
    const { container } = render(
      <StatsBlurb stats={makeStats({ totalPlayers: 5 })} solved t={tReal} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows a solve-rate blurb when player did not solve', () => {
    render(<StatsBlurb stats={makeStats({ solveRate: 42 })} solved={false} t={tReal} />);
    expect(screen.getByText(/42%/)).toBeInTheDocument();
  });

  it('shows a percentile blurb when player solved and percentile is set', () => {
    const stats = makeStats({
      yourStats: { solved: true, attemptsUsed: 2, percentile: 8 },
    });
    render(<StatsBlurb stats={stats} solved t={tReal} />);
    // Percentile is rendered verbatim — "top 8%" or similar single value.
    expect(screen.getByText(/8/)).toBeInTheDocument();
  });

  it('falls back to solve-rate when solved but percentile missing', () => {
    const stats = makeStats({
      solveRate: 73,
      yourStats: { solved: true, attemptsUsed: 3, percentile: undefined as unknown as number },
    });
    render(<StatsBlurb stats={stats} solved t={tReal} />);
    expect(screen.getByText(/73%/)).toBeInTheDocument();
  });

  it('exposes exactly one numeric stat (cap to 1)', () => {
    const stats = makeStats({ solveRate: 55 });
    const { container } = render(
      <StatsBlurb stats={stats} solved={false} t={tReal} />,
    );
    const digits = (container.textContent ?? '').match(/\d+/g) ?? [];
    // Allow "55" (the stat) and nothing else.
    expect(digits).toEqual(['55']);
  });
});
