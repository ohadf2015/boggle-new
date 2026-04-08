import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { LeaderboardTeaser } from '../LeaderboardTeaser';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <LanguageProvider initialLanguage="en">{ui}</LanguageProvider>
  );
}

const LEADERBOARD_URL_PATTERN = '*/api/daily-challenge/leaderboard/*/*';

describe('LeaderboardTeaser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders leaderboard container', () => {
    server.use(
      http.get(LEADERBOARD_URL_PATTERN, () => HttpResponse.json({ data: [] }))
    );

    renderWithProviders(<LeaderboardTeaser currentLanguage="en" />);

    expect(screen.getByTestId('leaderboard-teaser')).toBeInTheDocument();
  });

  test('shows skeleton loading state initially', () => {
    // Never resolve fetch to keep loading state
    server.use(
      http.get(LEADERBOARD_URL_PATTERN, () => new Promise(() => {}))
    );

    const { container } = renderWithProviders(
      <LeaderboardTeaser currentLanguage="en" />
    );

    const skeletons = container.querySelectorAll('.skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('renders top 3 players after fetch', async () => {
    server.use(
      http.get(LEADERBOARD_URL_PATTERN, () => HttpResponse.json({
        data: [
          { display_name: 'JellyDrifter', score: 12450 },
          { display_name: 'ZenithX', score: 11920 },
          { display_name: 'WordWiz99', score: 10105 },
        ],
      }))
    );

    renderWithProviders(<LeaderboardTeaser currentLanguage="en" />);

    await waitFor(() => {
      expect(screen.getByText('JellyDrifter')).toBeInTheDocument();
      expect(screen.getByText('ZenithX')).toBeInTheDocument();
      expect(screen.getByText('WordWiz99')).toBeInTheDocument();
    });
  });

  test('fetches from correct daily-challenge leaderboard URL', async () => {
    let capturedUrl: string | null = null;
    server.use(
      http.get(LEADERBOARD_URL_PATTERN, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ data: [] });
      })
    );

    renderWithProviders(<LeaderboardTeaser currentLanguage="en" />);

    await waitFor(() => {
      expect(capturedUrl).toMatch(/\/api\/daily-challenge\/leaderboard\/\d{4}-\d{2}-\d{2}\/en\?limit=3/);
    });
  });

  test('handles empty leaderboard gracefully', async () => {
    server.use(
      http.get(LEADERBOARD_URL_PATTERN, () => HttpResponse.json({ data: [] }))
    );

    renderWithProviders(<LeaderboardTeaser currentLanguage="en" />);

    await waitFor(() => {
      // Should show fallback text instead of players
      expect(screen.queryByText('JellyDrifter')).not.toBeInTheDocument();
    });
  });

  test('handles fetch error gracefully', async () => {
    server.use(
      http.get(LEADERBOARD_URL_PATTERN, () => HttpResponse.error())
    );

    renderWithProviders(<LeaderboardTeaser currentLanguage="en" />);

    await waitFor(() => {
      // Should still render the container without crashing
      expect(screen.getByTestId('leaderboard-teaser')).toBeInTheDocument();
    });
  });
});
