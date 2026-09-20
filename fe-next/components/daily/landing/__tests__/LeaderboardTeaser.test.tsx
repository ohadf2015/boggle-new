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

/* The board used to fetch the Word Hunt and Word Wheel endpoints and sum them
   in the browser — 2 of the 4 modes the hub shows. It now reads ONE endpoint
   that merges all four server-side (the only way to include Connections, whose
   public board exposes no player identity to join on). These tests moved to
   that endpoint; the per-mode ones are no longer called. */
const BOARD_URL = '*/api/daily/leaderboard*';

const EMPTY_MODES = { 'word-hunt': 0, 'word-wheel': 0, 'word-tower': 0, connections: 0 };

/** Build the merged shape the endpoint returns. */
function entry(rank: number, name: string, byMode: Partial<typeof EMPTY_MODES>) {
  const modes = { ...EMPTY_MODES, ...byMode };
  return {
    rank, name,
    avatarEmoji: null, avatarColor: null, avatarImage: null, customAvatar: null,
    total: Object.values(modes).reduce((a, b) => a + b, 0),
    byMode: modes,
    towerHeightM: modes['word-tower'] ? modes['word-tower'] / 5 : null,
    playedModes: (Object.keys(modes) as (keyof typeof EMPTY_MODES)[]).filter((m) => modes[m] > 0),
  };
}

function mockBoard(entries: unknown[] = []) {
  server.use(http.get(BOARD_URL, () => HttpResponse.json({ data: entries })));
}

/** Back-compat shim so the unchanged tests below keep reading well. */
function mockBothEndpoints(huntData: { display_name: string; score: number }[] = [], wheelData: { display_name: string; score: number }[] = []) {
  const byName = new Map<string, { hunt: number; wheel: number }>();
  for (const r of huntData) byName.set(r.display_name, { hunt: r.score, wheel: 0 });
  for (const r of wheelData) {
    const cur = byName.get(r.display_name) ?? { hunt: 0, wheel: 0 };
    byName.set(r.display_name, { ...cur, wheel: r.score });
  }
  const entries = [...byName.entries()]
    .map(([name, v]) => entry(0, name, { 'word-hunt': v.hunt, 'word-wheel': v.wheel }))
    .sort((a, b) => b.total - a.total)
    .map((e, i) => ({ ...e, rank: i + 1 }));
  mockBoard(entries);
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
    server.use(http.get(BOARD_URL, () => new Promise(() => {})));

    const { container } = renderWithProviders(
      <LeaderboardTeaser currentLanguage="en" />
    );

    const skeletons = container.querySelectorAll('.skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('renders the top 3 players the endpoint returns', async () => {
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

  test('shows the combined total the endpoint computed across modes', async () => {
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
      expect(screen.getAllByText('8,000').length).toBeGreaterThan(0);
      expect(screen.getByText('Charlie')).toBeInTheDocument();
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
    server.use(http.get(BOARD_URL, () => HttpResponse.error()));

    renderWithProviders(<LeaderboardTeaser currentLanguage="en" />);

    await waitFor(() => {
      expect(screen.getByTestId('leaderboard-teaser')).toBeInTheDocument();
    });
  });

  test('renders a player who has only played one mode', async () => {
    // WAS 'works when only one endpoint returns data' — partial-failure
    // resilience now lives server-side (the route uses allSettled per mode), so
    // the client-visible case is simply a player with one mode scored.
    mockBoard([entry(1, 'Solo', { 'word-wheel': 7777 })]);

    renderWithProviders(<LeaderboardTeaser currentLanguage="en" />);

    await waitFor(() => {
      expect(screen.getByText('Solo')).toBeInTheDocument();
      expect(screen.getAllByText('7,777').length).toBeGreaterThan(0);
    });
  });
});
