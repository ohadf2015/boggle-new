import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SeasonAnnouncementModal } from '../SeasonAnnouncementModal';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'season.name' && params)
        return `Season ${params.number}: ${params.theme}`;
      if (key === 'season.endsIn' && params) return `Ends in ${params.days} days`;
      if (key === 'season.peakTier' && params) return `Peak: ${params.tier}`;
      const map: Record<string, string> = {
        'season.newSeason': 'New Season',
        'season.continue': 'Continue',
        'season.pastSeasons': 'Past Seasons',
        'season.thisSeason': 'This Season',
        'leaderboard.rank': 'Rank',
        'leaderboard.score': 'Score',
        'leaderboard.games': 'Games',
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

const mockUseCrazyGames = vi.fn(() => ({ isOnCrazyGamesPlatform: false }));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => mockUseCrazyGames(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/supabase', () => ({ supabase: null }));

vi.mock('@/lib/seasons', () => ({
  getCurrentSeasonDynamic: () => ({
    id: 7,
    name: 'Season 7: Word Warriors',
    theme: 'Word Warriors',
    startDate: new Date('2026-09-01T00:00:00Z'),
    endDate: new Date('2027-12-31T00:00:00Z'),
    rewards: [],
  }),
  getSeasonTimeRemaining: () => ({ days: 12, hours: 5, totalMs: 12 * 86_400_000 + 5 * 3_600_000 }),
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={String(props.alt ?? '')} src={String(props.src ?? '')} data-testid={String(props['data-testid'] ?? '')} />;
  },
}));

describe('SeasonAnnouncementModal', () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseCrazyGames.mockReturnValue({ isOnCrazyGamesPlatform: false });
  });

  it('does not show on CrazyGames embed (no season popups in CG)', () => {
    mockUseCrazyGames.mockReturnValue({ isOnCrazyGamesPlatform: true });
    render(<SeasonAnnouncementModal />);
    expect(screen.queryByTestId('season-announcement-modal')).toBeNull();
  });

  it('shows when localStorage has no last-seen season id', () => {
    render(<SeasonAnnouncementModal />);
    expect(screen.getByTestId('season-announcement-modal')).toBeInTheDocument();
    expect(screen.getByText('Season 7: Word Warriors')).toBeInTheDocument();
  });

  it('does not show when last-seen matches the current season', () => {
    localStorage.setItem('lexiclash:lastSeenSeasonId', '7');
    render(<SeasonAnnouncementModal />);
    expect(screen.queryByTestId('season-announcement-modal')).toBeNull();
  });

  it('shows the visible countdown for current season', () => {
    render(<SeasonAnnouncementModal />);
    const countdown = screen.getByTestId('season-countdown');
    expect(countdown).toBeInTheDocument();
    expect(countdown).toHaveTextContent('12');
    expect(countdown).toHaveTextContent('5');
  });

  it('persists current season id and closes on CTA click', () => {
    render(<SeasonAnnouncementModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.queryByTestId('season-announcement-modal')).toBeNull();
    expect(localStorage.getItem('lexiclash:lastSeenSeasonId')).toBe('7');
  });
});
