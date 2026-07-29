/**
 * Tests for GuestActivityPanel admin analytics surface.
 * Aggregates /api/admin/analytics/guest-games — total, avg score, by mode, by language.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

import { GuestActivityPanel } from '../analytics/GuestActivityPanel';

const buildResponse = () => ({
  sessions: [],
  stats: {
    totalGames: 412,
    totalScore: 105_320,
    avgScore: 256,
    uniqueGuests: 203,
    byMode: [
      { mode: 'arena', count: 200 },
      { mode: 'practice', count: 120 },
      { mode: 'daily', count: 92 },
    ],
    byLanguage: [
      { language: 'en', count: 300 },
      { language: 'he', count: 80 },
      { language: 'sv', count: 32 },
    ],
  },
});

describe('GuestActivityPanel', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(buildResponse()),
    }) as unknown as typeof fetch;
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders skeleton on initial mount', () => {
    render(<GuestActivityPanel authToken="tok" />);
    expect(screen.getByTestId('guest-activity-skeleton')).toBeInTheDocument();
  });

  it('fetches /api/admin/analytics/guest-games with default 30 days', async () => {
    render(<GuestActivityPanel authToken="my-tok" />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/analytics/guest-games'),
        expect.objectContaining({
          headers: { Authorization: 'Bearer my-tok' },
        })
      );
    });
    const url = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('days=30');
  });

  it('renders the headline numbers', async () => {
    render(<GuestActivityPanel authToken="tok" />);
    await waitFor(() => {
      // total games, unique guests, avg score
      expect(screen.getByTestId('guest-total-games')).toHaveTextContent('412');
      expect(screen.getByTestId('guest-unique')).toHaveTextContent('203');
      expect(screen.getByTestId('guest-avg-score')).toHaveTextContent('256');
    });
  });

  it('renders the mode + language breakdowns', async () => {
    render(<GuestActivityPanel authToken="tok" />);
    await waitFor(() => {
      expect(screen.getByText('arena')).toBeInTheDocument();
      expect(screen.getByText('practice')).toBeInTheDocument();
      expect(screen.getByText('en')).toBeInTheDocument();
      expect(screen.getByText('he')).toBeInTheDocument();
    });
  });

  it('renders empty state when there are no guest games', async () => {
    (global.fetch as unknown as { mockResolvedValueOnce: (v: unknown) => void }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        sessions: [],
        stats: { totalGames: 0, totalScore: 0, avgScore: 0, uniqueGuests: 0, byMode: [], byLanguage: [] },
      }),
    });

    render(<GuestActivityPanel authToken="tok" />);
    await waitFor(() => {
      expect(screen.getByTestId('guest-activity-empty')).toBeInTheDocument();
    });
  });
});
