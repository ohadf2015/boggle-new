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
      if (key === 'season.peakTier' && params) return `Peak: ${params.tier}`;
      const map: Record<string, string> = {
        'season.newSeason': 'New Season',
        'season.continue': 'Continue',
        'season.thisSeason': 'This Season',
        'leaderboard.rank': 'Rank',
        'leaderboard.score': 'Score',
        'leaderboard.games': 'Games',
      };
      return map[key] ?? key;
    },
  }),
}));

const mockUseAuth = vi.fn<[], { user: { id: string } | null }>(() => ({ user: null }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseCrazyGames = vi.fn(() => ({ isOnCrazyGamesPlatform: false }));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => mockUseCrazyGames(),
}));

vi.mock('@/lib/supabase', () => ({ supabase: null }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

vi.mock('@/lib/seasons', () => ({
  getCurrentSeasonDynamic: () => ({
    id: 7,
    name: 'Season 7: Word Warriors',
    theme: 'Word Warriors',
    startDate: new Date('2026-09-01T00:00:00Z'),
    endDate: new Date('2027-12-31T00:00:00Z'),
    rewards: [],
  }),
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
    mockUseAuth.mockReturnValue({ user: null });
    window.history.replaceState({}, '', '/');
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

  it('does not render the time-left countdown', () => {
    render(<SeasonAnnouncementModal />);
    expect(screen.queryByTestId('season-countdown')).toBeNull();
  });

  it('does not render the past-seasons CTA', () => {
    render(<SeasonAnnouncementModal />);
    expect(screen.queryByRole('button', { name: /past seasons/i })).toBeNull();
  });

  it('persists current season id and closes on CTA click', () => {
    render(<SeasonAnnouncementModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.queryByTestId('season-announcement-modal')).toBeNull();
    expect(localStorage.getItem('lexiclash:lastSeenSeasonId')).toBe('7');
  });

  it('keys storage by user id when authenticated (per-player gate)', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-abc' } });
    localStorage.setItem('lexiclash:lastSeenSeasonId:user-abc', '7');
    render(<SeasonAnnouncementModal />);
    expect(screen.queryByTestId('season-announcement-modal')).toBeNull();
  });

  it('shows for one user even when another user already dismissed on same device', () => {
    localStorage.setItem('lexiclash:lastSeenSeasonId:user-other', '7');
    mockUseAuth.mockReturnValue({ user: { id: 'user-abc' } });
    render(<SeasonAnnouncementModal />);
    expect(screen.getByTestId('season-announcement-modal')).toBeInTheDocument();
  });

  it('persists per-user key on dismiss when authenticated', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-abc' } });
    render(<SeasonAnnouncementModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(localStorage.getItem('lexiclash:lastSeenSeasonId:user-abc')).toBe('7');
  });

  it('force-opens when ?seasonModal=1 is in the URL even if already dismissed', () => {
    localStorage.setItem('lexiclash:lastSeenSeasonId', '7');
    window.history.replaceState({}, '', '/leaderboard?seasonModal=1');
    render(<SeasonAnnouncementModal />);
    expect(screen.getByTestId('season-announcement-modal')).toBeInTheDocument();
  });

  it('strips seasonModal query param after force-open', () => {
    localStorage.setItem('lexiclash:lastSeenSeasonId', '7');
    window.history.replaceState({}, '', '/leaderboard?seasonModal=1&foo=bar');
    render(<SeasonAnnouncementModal />);
    expect(window.location.search).not.toContain('seasonModal');
    expect(window.location.search).toContain('foo=bar');
  });

  it('renders mascot clipped in a circle wrapper', () => {
    render(<SeasonAnnouncementModal />);
    const mascot = screen.getByTestId('season-announcement-mascot');
    const circleWrapper = mascot.closest('[data-testid="season-mascot-clip"]');
    expect(circleWrapper).not.toBeNull();
    expect(circleWrapper?.className).toMatch(/rounded-full/);
    expect(circleWrapper?.className).toMatch(/overflow-hidden/);
  });
});
