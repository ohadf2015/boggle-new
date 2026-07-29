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

const WORD_HUNT_URL = '*/api/daily-challenge/word-hunt/leaderboard/*/*';
const WORD_WHEEL_URL = '*/api/daily-challenge/word-wheel/leaderboard/*/*';

function mockBothEndpoints(huntData: unknown[] = [], wheelData: unknown[] = []) {
  server.use(
    http.get(WORD_HUNT_URL, () => HttpResponse.json({ data: huntData })),
    http.get(WORD_WHEEL_URL, () => HttpResponse.json({ data: wheelData })),
  );
}

describe('LeaderboardTeaser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders leaderboard container', () => {
    mockBothEndpoints();
    renderWithProviders(<LeaderboardTeaser currentLanguage="en" />);
    expect(screen.getByTestId('leaderboard-teaser')).toBeInTheDocument();
  });

  test('shows skeleton loading state initially', () => {
    server.use(
      http.get(WORD_HUNT_URL, () => new Promise(() => {})),
      http.get(WORD_WHEEL_URL, () => new Promise(() => {})),
    );

    const { container } = renderWithProviders(
      <LeaderboardTeaser currentLanguage="en" />
    );

    const skeletons = container.querySelectorAll('.skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('renders top 3 players from word-hunt scores', async () => {
    mockBothEndpoints([
      { player_id: 'p1', display_name: 'JellyDrifter', score: 12450 },
      { player_id: 'p2', display_name: 'ZenithX', score: 11920 },
      { player_id: 'p3', display_name: 'WordWiz99', score: 10105 },
    ]);

    renderWithProviders(<LeaderboardTeaser currentLanguage="en" />);

    await waitFor(() => {
      expect(screen.getByText('JellyDrifter')).toBeInTheDocument();
      expect(screen.getByText('ZenithX')).toBeInTheDocument();
      expect(screen.getByText('WordWiz99')).toBeInTheDocument();
    });
  });

  test('sums scores from both word-hunt and word-wheel', async () => {
    mockBothEndpoints(
      [
        { player_id: 'p1', display_name: 'Alice', score: 5000 },
        { player_id: 'p2', display_name: 'Bob', score: 8000 },
      ],
      [
        { player_id: 'p1', display_name: 'Alice', score: 6000 },
        { player_id: 'p3', display_name: 'Charlie', score: 3000 },
      ],
    );

    renderWithProviders(<LeaderboardTeaser currentLanguage="en" />);

    await waitFor(() => {
      // Alice: 5000+6000=11000 (1st), Bob: 8000 (2nd), Charlie: 3000 (3rd)
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('11,000')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      // 8,000 appears twice: accumulated total + hunt breakdown line
      expect(screen.getAllByText('8,000').length).toBeGreaterThan(0);
      expect(screen.getByText('Charlie')).toBeInTheDocument();
      // 3,000 appears twice: accumulated total + wheel breakdown line
      expect(screen.getAllByText('3,000').length).toBeGreaterThan(0);
    });
  });

  test('handles empty leaderboard gracefully', async () => {
    mockBothEndpoints();

    renderWithProviders(<LeaderboardTeaser currentLanguage="en" />);

    await waitFor(() => {
      expect(screen.queryByText('JellyDrifter')).not.toBeInTheDocument();
    });
  });

  test('handles fetch error gracefully', async () => {
    server.use(
      http.get(WORD_HUNT_URL, () => HttpResponse.error()),
      http.get(WORD_WHEEL_URL, () => HttpResponse.error()),
    );

    renderWithProviders(<LeaderboardTeaser currentLanguage="en" />);

    await waitFor(() => {
      expect(screen.getByTestId('leaderboard-teaser')).toBeInTheDocument();
    });
  });

  test('works when only one endpoint returns data', async () => {
    server.use(
      http.get(WORD_HUNT_URL, () => HttpResponse.error()),
      http.get(WORD_WHEEL_URL, () => HttpResponse.json({
        data: [
          { player_id: 'p1', display_name: 'Solo', score: 7777 },
        ],
      })),
    );

    renderWithProviders(<LeaderboardTeaser currentLanguage="en" />);

    await waitFor(() => {
      expect(screen.getByText('Solo')).toBeInTheDocument();
      // 7,777 appears twice: accumulated total + wheel breakdown line
      expect(screen.getAllByText('7,777').length).toBeGreaterThan(0);
    });
  });
});
