/**
 * Tests for AuthSessionsPanel admin analytics surface.
 * Aggregates /api/admin/analytics/auth-games — totals + by-mode + by-language
 * + completion rate, scoped to authenticated players (mirror of guest panel).
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

import { AuthSessionsPanel } from '../analytics/AuthSessionsPanel';

const buildResponse = () => ({
  stats: {
    totalGames: 1240,
    totalScore: 320_500,
    avgScore: 258,
    uniqueUsers: 412,
    completedCount: 1100,
    completionRate: 89,
    byMode: [
      { mode: 'multiplayer', count: 600 },
      { mode: 'singleplayer', count: 420 },
      { mode: 'daily_challenge', count: 220 },
    ],
    byLanguage: [
      { language: 'en', count: 800 },
      { language: 'he', count: 300 },
      { language: 'sv', count: 140 },
    ],
  },
  sampledFromLast: 500,
  days: 30,
});

describe('AuthSessionsPanel', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(buildResponse()),
    }) as unknown as typeof fetch;
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders skeleton on initial mount', () => {
    render(<AuthSessionsPanel authToken="tok" />);
    expect(screen.getByTestId('auth-sessions-skeleton')).toBeInTheDocument();
  });

  it('fetches /api/admin/analytics/auth-games with bearer + days=30', async () => {
    render(<AuthSessionsPanel authToken="my-tok" />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/analytics/auth-games'),
        expect.objectContaining({ headers: { Authorization: 'Bearer my-tok' } })
      );
    });
    const url = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('days=30');
  });

  it('renders headline numbers (total games, unique users, avg, completion)', async () => {
    render(<AuthSessionsPanel authToken="tok" />);
    await waitFor(() => {
      expect(screen.getByTestId('auth-total-games')).toHaveTextContent('1,240');
      expect(screen.getByTestId('auth-unique-users')).toHaveTextContent('412');
      expect(screen.getByTestId('auth-avg-score')).toHaveTextContent('258');
      expect(screen.getByTestId('auth-completion-rate')).toHaveTextContent('89');
    });
  });

  it('renders mode + language breakdown rows', async () => {
    render(<AuthSessionsPanel authToken="tok" />);
    await waitFor(() => {
      expect(screen.getByText('multiplayer')).toBeInTheDocument();
      expect(screen.getByText('singleplayer')).toBeInTheDocument();
      expect(screen.getByText('en')).toBeInTheDocument();
      expect(screen.getByText('he')).toBeInTheDocument();
    });
  });

  it('renders empty state when there are no auth sessions', async () => {
    (global.fetch as unknown as { mockResolvedValueOnce: (v: unknown) => void }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        stats: { totalGames: 0, totalScore: 0, avgScore: 0, uniqueUsers: 0, completedCount: 0, completionRate: 0, byMode: [], byLanguage: [] },
        sampledFromLast: 500,
        days: 30,
      }),
    });

    render(<AuthSessionsPanel authToken="tok" />);
    await waitFor(() => {
      expect(screen.getByTestId('auth-sessions-empty')).toBeInTheDocument();
    });
  });
});
