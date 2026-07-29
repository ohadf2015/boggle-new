import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/components/AutoHideHeader', () => ({ default: () => null }));
vi.mock('@/hooks/useSeasonBadges', () => ({ useSeasonBadges: () => ({ badges: [], isLoading: false }) }));
vi.mock('@/components/seasons/SeasonTrophyCase', () => ({ SeasonTrophyCase: () => <div data-testid="trophy-case" /> }));
vi.mock('@/components/seasons/SeasonRankCard', () => ({
  SeasonRankCard: ({ playerId }: { playerId: string }) => <div data-testid="rank-card">{playerId}</div>,
}));
vi.mock('@/components/profile/ProfileAchievementsPublic', () => ({
  ProfileAchievementsPublic: ({ counts }: { counts: Record<string, number> }) => (
    <div data-testid="ach">{Object.keys(counts || {}).join(',')}</div>
  ),
}));

const getQuery = vi.fn();
vi.mock('@/lib/trpc', () => ({
  trpc: { playerProfile: { get: { useQuery: (...a: unknown[]) => getQuery(...a) } } },
}));

import PublicProfilePageClient from '../PageClient';

describe('PublicProfilePageClient — rank + achievements wiring', () => {
  it('passes the profile id to SeasonRankCard and the counts to achievements', () => {
    getQuery.mockReturnValue({
      data: {
        id: 'abc-123',
        username: 'ron',
        displayName: 'Ron',
        currentLevel: 7,
        totalGames: 40,
        winRate: 55,
        achievementCounts: { wordsmith: 3, owl: 1 },
      },
      isLoading: false,
      isError: false,
    });
    render(<PublicProfilePageClient username="ron" />);
    expect(screen.getByTestId('rank-card')).toHaveTextContent('abc-123');
    expect(screen.getByTestId('ach')).toHaveTextContent('wordsmith,owl');
  });
});
