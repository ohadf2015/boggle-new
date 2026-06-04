import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));
// Animation is presentational — mock GSAP so the SSR/JSX number is what we assert.
vi.mock('@gsap/react', () => ({ useGSAP: () => {} }));
vi.mock('gsap', () => ({ default: { from: vi.fn(), to: vi.fn() } }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => false }));

const useQuery = vi.fn();
vi.mock('@/lib/trpc', () => ({
  trpc: { leaderboard: { getCurrentSeasonRank: { useQuery: (...a: unknown[]) => useQuery(...a) } } },
}));

import { SeasonRankCard } from '../SeasonRankCard';

describe('SeasonRankCard', () => {
  beforeEach(() => { useQuery.mockReset(); });

  it('shows the position and the tier chip when the player is ranked', () => {
    useQuery.mockReturnValue({
      data: { data: { rankPosition: 42, totalPlayers: 1204, totalScore: 9100, gamesPlayed: 30, seasonId: 3, tierId: 'gold' } },
      isLoading: false,
    });
    render(<SeasonRankCard playerId="11111111-1111-4111-8111-111111111111" />);
    expect(screen.getByText(/42/)).toBeInTheDocument();
    expect(screen.getByText('rank.tier.gold')).toBeInTheDocument();
  });

  it('shows the unranked state when there is no current-season entry', () => {
    useQuery.mockReturnValue({ data: { data: null }, isLoading: false });
    render(<SeasonRankCard playerId="11111111-1111-4111-8111-111111111111" />);
    expect(screen.getByText('rank.unranked')).toBeInTheDocument();
  });
});
