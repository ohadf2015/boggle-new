/**
 * TodayGamesHistory Component Tests
 *
 * Tests for the admin dashboard today's games history component
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => {
  const stripFramerProps = (props: Record<string, unknown>) => {
    const { whileHover, whileTap, animate, initial, exit, transition, variants, ...rest } = props;
    return rest;
  };
  return {
    m: {
      div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...stripFramerProps(props)}>{children}</div>,
      tr: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <tr {...stripFramerProps(props)}>{children}</tr>,
      p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <p {...stripFramerProps(props)}>{children}</p>,
    },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  };
});

// Mock useDevicePerformance hook to allow PageLoader to render properly
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    prefersReducedMotion: true,
    enableComplexAnimations: false,
    enableParticles: false,
    devicePerformance: 'low',
  }),
}));

// Mock LanguageContext
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'admin.todayGames.title': "Today's Games",
    'admin.todayGames.refresh': 'Refresh',
    'admin.todayGames.retry': 'Retry',
    'admin.todayGames.totalGames': 'Total',
    'admin.todayGames.multiplayer': 'Multiplayer',
    'admin.todayGames.wordHunt': 'Word Hunt',
    'admin.todayGames.daily': 'Daily',
    'admin.todayGames.drills': 'Drills',
    'admin.todayGames.filters': 'Filters',
    'admin.todayGames.allLanguages': 'All Languages',
    'admin.todayGames.allTypes': 'All Types',
    'admin.todayGames.allModes': 'All Modes',
    'admin.todayGames.noGames': 'No games today yet',
    'admin.todayGames.noGamesHint': 'Games will appear here as players start playing',
    'admin.todayGames.time': 'Time',
    'admin.todayGames.player': 'Player',
    'admin.todayGames.type': 'Type',
    'admin.todayGames.language': 'Lang',
    'admin.todayGames.score': 'Score',
    'admin.todayGames.words': 'Words',
    'admin.todayGames.duration': 'Duration',
    'admin.todayGames.code': 'Code',
    'admin.todayGames.guest': 'Guest',
    'admin.todayGames.ranked': 'Ranked',
    'admin.todayGames.casual': 'Casual',
    'admin.todayGames.lastUpdated': 'Last updated',
  };
  return translations[key] || key;
};

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: mockT,
    language: 'en',
  }),
}));

// Import after mocks
import { TodayGamesHistory } from '../TodayGamesHistory';

describe('TodayGamesHistory', () => {
  const mockAuthToken = 'test-auth-token';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockGamesResponse = {
    success: true,
    games: [
      {
        id: '1',
        player_id: 'player-1',
        guest_session_id: null,
        game_code: 'ABC123',
        score: 150,
        word_count: 12,
        longest_word: 'testing',
        placement: 1,
        is_ranked: true,
        is_guest: false,
        mode: 'ranked',
        language: 'en',
        time_played: 180,
        created_at: new Date().toISOString(),
        profiles: {
          username: 'testuser',
          display_name: 'Test User',
          avatar_emoji: '😀',
          avatar_color: '#6366f1',
        },
      },
      {
        id: '2',
        player_id: null,
        guest_session_id: 'guest-123',
        game_code: 'XYZ789',
        score: 80,
        word_count: 8,
        longest_word: 'word',
        placement: 2,
        is_ranked: false,
        is_guest: true,
        mode: 'casual',
        language: 'he',
        time_played: 120,
        created_at: new Date().toISOString(),
        profiles: null,
      },
    ],
    pagination: {
      page: 1,
      pageSize: 50,
      totalCount: 2,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
    breakdown: {
      authenticatedGames: 1,
      guestGames: 1,
      wordHuntGames: 0,
      dailyChallengeGames: 0,
      drillGames: 0,
      blastGames: 0,
      wordWheelGames: 0,
      practiceGames: 0,
    },
  };

  it('renders loading state initially', async () => {
    // Use a handler that never resolves to keep loading state
    server.use(
      http.get('*/api/admin/game-logs*', () => new Promise(() => {}))
    );

    render(<TodayGamesHistory authToken={mockAuthToken} />);

    // Should show loading indicator (Loader dots variant)
    const loadingElement = document.querySelector('[data-testid="page-loader"] .rounded-full');
    expect(loadingElement).toBeInTheDocument();
  });

  it('renders games data after successful fetch', async () => {
    server.use(
      http.get('*/api/admin/game-logs*', () => HttpResponse.json(mockGamesResponse))
    );

    render(<TodayGamesHistory authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText("Today's Games")).toBeInTheDocument();
    });

    // Check stats are displayed (use getAllByText since stat cards may show same value)
    const totalElements = screen.getAllByText('2');
    expect(totalElements.length).toBeGreaterThan(0); // Total games stat
    expect(screen.getByText('Test User')).toBeInTheDocument(); // Player name
    expect(screen.getByText('150')).toBeInTheDocument(); // Score
    expect(screen.getByText('12')).toBeInTheDocument(); // Word count
  });

  it('renders empty state when no games', async () => {
    const emptyResponse = {
      ...mockGamesResponse,
      games: [],
      breakdown: {
        authenticatedGames: 0,
        guestGames: 0,
        wordHuntGames: 0,
        dailyChallengeGames: 0,
        drillGames: 0,
        blastGames: 0,
        wordWheelGames: 0,
        practiceGames: 0,
      },
    };

    server.use(
      http.get('*/api/admin/game-logs*', () => HttpResponse.json(emptyResponse))
    );

    render(<TodayGamesHistory authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText('No games today yet')).toBeInTheDocument();
    });

    expect(screen.getByText('Games will appear here as players start playing')).toBeInTheDocument();
  });

  it('renders error state when fetch fails', async () => {
    server.use(
      http.get('*/api/admin/game-logs*', () => new HttpResponse(null, { status: 500 }))
    );

    render(<TodayGamesHistory authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch: 500/)).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('sends correct authorization header', async () => {
    let capturedAuth: string | null = null;
    server.use(
      http.get('*/api/admin/game-logs*', ({ request }) => {
        capturedAuth = request.headers.get('Authorization');
        return HttpResponse.json(mockGamesResponse);
      })
    );

    render(<TodayGamesHistory authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText("Today's Games")).toBeInTheDocument();
    });

    expect(capturedAuth).toBe('Bearer test-auth-token');
  });

  it('includes a date range in query params (default 7d)', async () => {
    let capturedUrl: string | null = null;
    server.use(
      http.get('*/api/admin/game-logs*', ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(mockGamesResponse);
      })
    );

    render(<TodayGamesHistory authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText("Today's Games")).toBeInTheDocument();
    });

    // Default range is 7d → startDate ≈ 7 days ago. Just assert startDate is present and ISO-shaped.
    expect(capturedUrl).toMatch(/startDate=\d{4}-\d{2}-\d{2}/);
    // endDate is no longer sent by default — server interprets missing endDate as "now"
    expect(capturedUrl).not.toContain('endDate=');
  });

  it('filters by language when selected', async () => {
    const capturedUrls: string[] = [];
    server.use(
      http.get('*/api/admin/game-logs*', ({ request }) => {
        capturedUrls.push(request.url);
        return HttpResponse.json(mockGamesResponse);
      })
    );

    render(<TodayGamesHistory authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText("Today's Games")).toBeInTheDocument();
    });

    // Find and change the language filter
    const languageSelect = screen.getByDisplayValue('All Languages');
    fireEvent.change(languageSelect, { target: { value: 'he' } });

    await waitFor(() => {
      const lastUrl = capturedUrls[capturedUrls.length - 1];
      expect(lastUrl).toContain('language=he');
    });
  });

  it('displays guest badge for guest players', async () => {
    server.use(
      http.get('*/api/admin/game-logs*', () => HttpResponse.json(mockGamesResponse))
    );

    render(<TodayGamesHistory authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText("Today's Games")).toBeInTheDocument();
    });

    // Should show Guest badge for the guest player
    const guestBadges = screen.getAllByText('Guest');
    expect(guestBadges.length).toBeGreaterThan(0);
  });

  it('displays correct game type icons', async () => {
    const multiTypeResponse = {
      ...mockGamesResponse,
      games: [
        ...mockGamesResponse.games,
        {
          id: '3',
          player_id: 'player-2',
          guest_session_id: null,
          game_code: 'word_hunt',
          score: 200,
          word_count: 15,
          longest_word: 'excellent',
          placement: null,
          is_ranked: false,
          is_guest: false,
          mode: 'word_hunt',
          language: 'en',
          time_played: 300,
          created_at: new Date().toISOString(),
          profiles: {
            username: 'hunter',
            display_name: 'Word Hunter',
            avatar_emoji: '🎯',
            avatar_color: '#22c55e',
          },
        },
      ],
      breakdown: {
        authenticatedGames: 1,
        guestGames: 1,
        wordHuntGames: 1,
        dailyChallengeGames: 0,
        drillGames: 0,
        blastGames: 0,
        wordWheelGames: 0,
        practiceGames: 0,
      },
    };

    server.use(
      http.get('*/api/admin/game-logs*', () => HttpResponse.json(multiTypeResponse))
    );

    render(<TodayGamesHistory authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText('Word Hunter')).toBeInTheDocument();
    });

    // Check game type labels are displayed. Each row renders its mode label in both a
    // mobile and a desktop variant (responsive; only one is visible per breakpoint, but
    // jsdom applies no CSS so both are in the DOM) — hence getAllByText.
    expect(screen.getAllByText('Ranked').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Casual').length).toBeGreaterThan(0);
    const wordHuntElements = screen.getAllByText('Word Hunt');
    expect(wordHuntElements.length).toBeGreaterThan(0);
  });

  it('handles refresh button click', async () => {
    let callCount = 0;
    server.use(
      http.get('*/api/admin/game-logs*', () => {
        callCount++;
        return HttpResponse.json(mockGamesResponse);
      })
    );

    render(<TodayGamesHistory authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText("Today's Games")).toBeInTheDocument();
    });

    const countBeforeRefresh = callCount;

    // Click refresh button
    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(callCount).toBeGreaterThan(countBeforeRefresh);
    });
  });

  it('auto-refreshes every 30 seconds when on the "today" range', async () => {
    vi.useFakeTimers();
    let callCount = 0;
    server.use(
      http.get('*/api/admin/game-logs*', () => {
        callCount++;
        return HttpResponse.json(mockGamesResponse);
      })
    );

    render(<TodayGamesHistory authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText("Today's Games")).toBeInTheDocument();
    });

    // Default range is 7d (historical), which does not auto-refresh.
    // Switch to "today" to enable the live polling loop.
    const dateRangeSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(dateRangeSelect, { target: { value: 'today' } });

    await waitFor(() => {
      expect(callCount).toBeGreaterThanOrEqual(2); // initial + after-range-change refetch
    });
    const countAfterRangeSwitch = callCount;

    // Advance timers by 30 seconds — auto-refresh should fire
    await vi.advanceTimersByTimeAsync(30000);

    await waitFor(() => {
      expect(callCount).toBeGreaterThan(countAfterRangeSwitch);
    });
  });
});
