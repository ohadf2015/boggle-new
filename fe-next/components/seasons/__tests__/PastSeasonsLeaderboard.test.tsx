import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// rpc dispatcher keyed by function name
const rpc = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: (fn: string, args?: unknown) => rpc(fn, args) },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

vi.mock('@/components/ui/Loader', () => ({
  Loader: () => React.createElement('div', { 'data-testid': 'loader' }),
}));

vi.mock('@/components/ui/EnhancedEmptyState', () => ({
  EnhancedEmptyState: ({ title }: { title: string }) => React.createElement('div', null, title),
}));

import { PastSeasonsLeaderboard } from '../PastSeasonsLeaderboard';

describe('PastSeasonsLeaderboard', () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockImplementation((fn: string) => {
      if (fn === 'list_past_seasons') {
        return Promise.resolve({
          data: [{ season_id: 2, name: 'Season 2', start_date: '', end_date: '', entry_count: 1 }],
          error: null,
        });
      }
      if (fn === 'get_past_season_leaderboard') {
        // Player whose username is the migration placeholder but who has a real
        // display_name — the regression: the list used to render the placeholder.
        return Promise.resolve({
          data: [{
            player_id: 'p1',
            username: 'Player_9662314e',
            display_name: 'ilik-bilik',
            total_score: 52213,
            games_played: 80,
            games_won: 10,
            ranked_mmr: 1000,
            rank_position: 1,
            peak_tier: 'Gold',
          }],
          error: null,
        });
      }
      return Promise.resolve({ data: [], error: null });
    });
  });

  it('renders the display_name, not the placeholder username', async () => {
    render(<PastSeasonsLeaderboard />);
    expect(await screen.findByText('ilik-bilik')).toBeInTheDocument();
    expect(screen.queryByText('Player_9662314e')).not.toBeInTheDocument();
  });

  it('falls back to username when display_name is absent', async () => {
    rpc.mockImplementation((fn: string) => {
      if (fn === 'list_past_seasons') {
        return Promise.resolve({
          data: [{ season_id: 2, name: 'Season 2', start_date: '', end_date: '', entry_count: 1 }],
          error: null,
        });
      }
      if (fn === 'get_past_season_leaderboard') {
        return Promise.resolve({
          data: [{
            player_id: 'p2', username: 'PlainUser', display_name: null,
            total_score: 100, games_played: 1, games_won: 0, ranked_mmr: 1000,
            rank_position: 1, peak_tier: 'Bronze',
          }],
          error: null,
        });
      }
      return Promise.resolve({ data: [], error: null });
    });
    render(<PastSeasonsLeaderboard />);
    expect(await screen.findByText('PlainUser')).toBeInTheDocument();
  });
});
