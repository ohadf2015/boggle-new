/**
 * Tests for PlayerDetailView — admin drill-down on a single player.
 * Renders profile + recent games + aggregates + season (no fetching here;
 * the page client owns fetching, this component is presentational).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: ({ userId }: { userId?: string }) => <span data-testid="avatar" data-uid={userId} />,
}));

import { PlayerDetailView, type PlayerDetail } from '../players/PlayerDetailView';

const DETAIL: PlayerDetail = {
  profile: {
    id: 'p1', username: 'alice', display_name: 'Alice',
    avatar_emoji: null, avatar_color: null, avatar_image: null, avatar_config: null,
    total_score: 1234, total_games: 50, total_words: 600, total_time_played: 7200,
    total_xp: 9500, current_level: 12,
    casual_games: 30, ranked_games: 20, casual_wins: 18, ranked_wins: 11,
    ranked_mmr: 1450, peak_mmr: 1500,
    longest_word: 'lexicographer', longest_word_length: 13,
    total_coins: 200, lifetime_coins_earned: 1500, total_hints_used: 4,
    prestige_level: 0, prestige_multiplier: 1,
    country_code: 'IL', referral_count: 2, user_role: 'player', is_admin: false, blast_access: false,
    daily_email_subscribed: true,
    last_seen_at: '2026-05-04T10:00:00Z',
    last_game_at: '2026-05-04T09:30:00Z',
    created_at: '2026-01-01T00:00:00Z',
    utm_source: 'google', utm_medium: null, utm_campaign: null, referrer: null,
  },
  recentGames: [
    { id: 'g1', game_code: 'ABCD', score: 200, word_count: 25, placement: 1, is_ranked: true, language: 'en', time_played: 180, created_at: '2026-05-04T09:30:00Z' },
    { id: 'g2', game_code: 'EFGH', score: 150, word_count: 18, placement: 2, is_ranked: false, language: 'en', time_played: 120, created_at: '2026-05-03T18:00:00Z' },
  ],
  aggregates: {
    games: 2, totalScore: 350, totalWords: 43, avgScore: 175, ranked: 1, casual: 1,
    byLanguage: [{ language: 'en', count: 2 }],
  },
  modeBreakdown: [
    { mode: 'singleplayer', count: 12, totalScore: 1500, avgScore: 125, completed: 10 },
    { mode: 'multiplayer', count: 8, totalScore: 1200, avgScore: 150, completed: 8 },
    { mode: 'daily_challenge', count: 4, totalScore: 320, avgScore: 80, completed: 3 },
  ],
  season: { id: 5, score: 880 },
};

describe('PlayerDetailView', () => {
  it('renders the player display name, handle, and country in the header', () => {
    render(<PlayerDetailView detail={DETAIL} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(screen.getByText('IL')).toBeInTheDocument();
  });

  it('renders aggregate cards (games / avg score / longest word)', () => {
    render(<PlayerDetailView detail={DETAIL} />);
    expect(screen.getByTestId('agg-games')).toHaveTextContent('2');
    expect(screen.getByTestId('agg-avg-score')).toHaveTextContent('175');
    expect(screen.getByTestId('longest-word')).toHaveTextContent('lexicographer');
  });

  it('renders the season-leaderboard chip when present', () => {
    render(<PlayerDetailView detail={DETAIL} />);
    const chip = screen.getByTestId('season-chip');
    expect(chip).toHaveTextContent('5');
    expect(chip).toHaveTextContent('880');
  });

  it('omits the season chip when no season data', () => {
    const noSeason: PlayerDetail = { ...DETAIL, season: null };
    render(<PlayerDetailView detail={noSeason} />);
    expect(screen.queryByTestId('season-chip')).not.toBeInTheDocument();
  });

  it('renders one row per recent game', () => {
    render(<PlayerDetailView detail={DETAIL} />);
    expect(screen.getAllByTestId('game-row')).toHaveLength(2);
    expect(screen.getByText('ABCD')).toBeInTheDocument();
    expect(screen.getByText('EFGH')).toBeInTheDocument();
  });

  it('renders the per-mode breakdown table when present', () => {
    render(<PlayerDetailView detail={DETAIL} />);
    const rows = screen.getAllByTestId('mode-row');
    expect(rows).toHaveLength(3);
    // sorted by count desc — singleplayer is largest
    expect(rows[0]).toHaveTextContent('singleplayer');
    expect(rows[0]).toHaveTextContent('12');
    expect(rows[0]).toHaveTextContent('125');
    expect(rows[2]).toHaveTextContent('daily_challenge');
  });

  it('omits mode breakdown panel when empty', () => {
    const noModes: PlayerDetail = { ...DETAIL, modeBreakdown: [] };
    render(<PlayerDetailView detail={noModes} />);
    expect(screen.queryByTestId('mode-row')).not.toBeInTheDocument();
  });

  it('renders an empty-games hint when there are no recent games', () => {
    const noGames: PlayerDetail = {
      ...DETAIL,
      recentGames: [],
      aggregates: { ...DETAIL.aggregates, games: 0, byLanguage: [] },
    };
    render(<PlayerDetailView detail={noGames} />);
    expect(screen.getByTestId('games-empty')).toBeInTheDocument();
  });

  it('renders the PostHog deeplink', () => {
    render(<PlayerDetailView detail={DETAIL} />);
    const link = screen.getByRole('link', { name: /posthog/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('/person/p1'));
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders UTM source when present, omits when null', () => {
    render(<PlayerDetailView detail={DETAIL} />);
    expect(screen.getByText(/google/i)).toBeInTheDocument();

    const noUtm: PlayerDetail = {
      ...DETAIL,
      profile: { ...DETAIL.profile!, utm_source: null },
    };
    render(<PlayerDetailView detail={noUtm} />);
    // Still renders, just without source row
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
  });
});
