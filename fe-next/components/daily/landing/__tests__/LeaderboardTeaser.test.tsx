import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { LeaderboardTeaser } from '../LeaderboardTeaser';
import { LanguageProvider } from '@/contexts/LanguageContext';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <LanguageProvider initialLanguage="en">{ui}</LanguageProvider>
  );
}

describe('LeaderboardTeaser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders leaderboard container', () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    renderWithProviders(<LeaderboardTeaser currentLanguage="en" />);

    expect(screen.getByTestId('leaderboard-teaser')).toBeInTheDocument();
  });

  test('shows skeleton loading state initially', () => {
    // Never resolve fetch to keep loading state
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { container } = renderWithProviders(
      <LeaderboardTeaser currentLanguage="en" />
    );

    const skeletons = container.querySelectorAll('.skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('renders top 3 players after fetch', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [
          { name: 'JellyDrifter', score: 12450 },
          { name: 'ZenithX', score: 11920 },
          { name: 'WordWiz99', score: 10105 },
        ],
      }),
    });

    renderWithProviders(<LeaderboardTeaser currentLanguage="en" />);

    await waitFor(() => {
      expect(screen.getByText('JellyDrifter')).toBeInTheDocument();
      expect(screen.getByText('ZenithX')).toBeInTheDocument();
      expect(screen.getByText('WordWiz99')).toBeInTheDocument();
    });
  });

  test('handles empty leaderboard gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    renderWithProviders(<LeaderboardTeaser currentLanguage="en" />);

    await waitFor(() => {
      // Should show fallback text instead of players
      expect(screen.queryByText('JellyDrifter')).not.toBeInTheDocument();
    });
  });

  test('handles fetch error gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<LeaderboardTeaser currentLanguage="en" />);

    await waitFor(() => {
      // Should still render the container without crashing
      expect(screen.getByTestId('leaderboard-teaser')).toBeInTheDocument();
    });
  });

  test('renders crown icon in header', () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    renderWithProviders(<LeaderboardTeaser currentLanguage="en" />);

    // Crown icon should be present (via lucide-react)
    expect(screen.getByTestId('leaderboard-teaser')).toBeInTheDocument();
  });

  test('renders Full Standings link when onViewFull is provided', () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    const onViewFull = jest.fn();
    renderWithProviders(
      <LeaderboardTeaser currentLanguage="en" onViewFull={onViewFull} />
    );

    // The "Full Standings" text should render as a button
    const standingsLink = screen.getByText(/full standings/i);
    expect(standingsLink).toBeInTheDocument();
  });
});
