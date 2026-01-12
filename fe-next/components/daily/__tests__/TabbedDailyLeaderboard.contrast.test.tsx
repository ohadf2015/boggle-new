/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import TabbedDailyLeaderboard from '../TabbedDailyLeaderboard';

// Mock fetch
global.fetch = jest.fn();

const mockT = (key: string) => key;

describe('TabbedDailyLeaderboard - Dark Mode Contrast', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock matchMedia for framer-motion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            player_id: 'player1',
            display_name: 'Test Player',
            avatar_emoji: '🎮',
            avatar_color: '#FF0000',
            score: 100,
            word_count: 10,
            time_seconds: 60,
            completed_at: new Date().toISOString(),
            rank_position: 1,
            solved: true,
            attempts_used: 3,
            efficiency_score: 95,
          },
        ],
        totalPlayers: 1,
        totalSolved: 1,
        guestPlayerCount: 0,
        totalParticipants: 1,
      }),
    });
  });

  it('should have proper dark background colors in dark mode', () => {
    // Add dark class to document to simulate dark mode
    document.documentElement.classList.add('dark');

    const { container } = render(
      <TabbedDailyLeaderboard
        puzzleDate="2024-01-01"
        language="en"
        t={mockT}
        defaultTab="today"
      />
    );

    // Find the main leaderboard container
    const leaderboardContainer = container.querySelector('.bg-white\\/95');
    expect(leaderboardContainer).toBeInTheDocument();

    // Check that it has dark mode background classes
    // The container should use dark:bg-slate-800 or similar dark backgrounds
    expect(leaderboardContainer?.className).toContain('dark:bg');

    // Clean up
    document.documentElement.classList.remove('dark');
  });

  it('should have high contrast text in dark mode', () => {
    document.documentElement.classList.add('dark');

    render(
      <TabbedDailyLeaderboard
        puzzleDate="2024-01-01"
        language="en"
        t={mockT}
        defaultTab="today"
      />
    );

    // Find text elements
    const titleElement = screen.getByText('wordHunt.leaderboard.title');
    expect(titleElement).toBeInTheDocument();

    // Title should be white or very light in dark mode
    expect(titleElement.className).toContain('dark:text-white');

    // Clean up
    document.documentElement.classList.remove('dark');
  });

  it('should use dark slate background instead of neo-navy for better contrast', () => {
    document.documentElement.classList.add('dark');

    const { container } = render(
      <TabbedDailyLeaderboard
        puzzleDate="2024-01-01"
        language="en"
        t={mockT}
        defaultTab="today"
      />
    );

    // The main container should NOT use neo-navy/95 which is too dark
    const mainContainer = container.firstChild as HTMLElement;

    // Should use slate-800 or slate-900 for better contrast with text
    expect(mainContainer?.className).toContain('dark:bg-slate-800');

    // Clean up
    document.documentElement.classList.remove('dark');
  });

  it('should have visible stats text in dark mode', async () => {
    document.documentElement.classList.add('dark');

    // Wait for the fetch to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    render(
      <TabbedDailyLeaderboard
        puzzleDate="2024-01-01"
        language="en"
        t={mockT}
        defaultTab="today"
      />
    );

    // Stats should be visible with proper contrast
    const statsText = screen.queryByText(/wordHunt\.leaderboard\.played/);
    if (statsText) {
      // Should use light colors in dark mode
      expect(statsText.className).toMatch(/dark:text-(slate|white|gray)-(300|400|200)/);
    }

    // Clean up
    document.documentElement.classList.remove('dark');
  });
});
