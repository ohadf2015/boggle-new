/**
 * TabbedDailyLeaderboard Component Tests
 *
 * Tests for the tabbed daily leaderboard component that displays
 * today's and all-time leaderboard rankings with proper avatar display
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, onError, ...props }: {
    src: string;
    alt: string;
    onError?: () => void;
    [key: string]: unknown;
  }) => {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        {...props}
        onError={onError}
        data-testid="avatar-image"
      />
    );
  },
}));

// Mock framer-motion to simplify testing
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<Record<string, unknown>>) => <>{children}</>,
}));

// Mock avatar config utilities
jest.mock('@/utils/avatarConfig', () => ({
  AVATARS: [
    { id: 'broccoli-bob', name: 'Broccoli Bob', filename: 'broccoli-bob.png' },
    { id: 'shroom-shelly', name: 'Shroom Shelly', filename: 'shroom-shelly.png' },
    { id: 'pizza-pete', name: 'Pizza Pete', filename: 'pizza-pete.png' },
  ],
  PROFILE_AVATAR_ID: '__profile_avatar__',
  getAvatarPath: (avatar: { id: string; filename: string } | string) => {
    if (typeof avatar === 'string') {
      return `/avatars/${avatar}.png`;
    }
    return `/avatars/${avatar.filename}`;
  },
  getRandomAvatar: () => ({ id: 'broccoli-bob', name: 'Broccoli Bob', filename: 'broccoli-bob.png' }),
}));

// Mock shared utils
jest.mock('@/shared/utils', () => ({
  formatDistanceToNow: () => '5 minutes ago',
  getCountryFlag: (code: string | null | undefined) => code ? '🇺🇸' : null,
}));

// Mock ranking styles
jest.mock('@/utils/rankingStyles', () => ({
  getRankDisplay: (rank: number) => `#${rank}`,
}));

// Mock daily challenge utils
jest.mock('@/utils/dailyChallenge', () => ({
  getPuzzleNumber: () => 42,
}));

// Import the component types for mock data
import type { DailyParticipant, AllTimeParticipant } from '../TabbedDailyLeaderboard';

// Helper to create mock participant data
const createMockParticipant = (overrides: Partial<DailyParticipant> = {}): DailyParticipant => ({
  player_id: 'user-123',
  guest_fingerprint: null,
  display_name: 'TestPlayer',
  avatar_emoji: '🦊',
  avatar_color: '#FF5733',
  avatar_image: 'shroom-shelly',  // Custom avatar
  profile_picture_url: null,
  country_code: 'US',
  score: 100,
  word_count: 10,
  time_seconds: 60,
  completed_at: new Date().toISOString(),
  rank_position: 1,
  solved: true,
  attempts_used: 3,
  efficiency_score: 85,
  ...overrides,
});

const createMockAllTimeParticipant = (overrides: Partial<AllTimeParticipant> = {}): AllTimeParticipant => ({
  player_id: 'user-123',
  guest_fingerprint: null,
  player_identifier: 'user-123',
  display_name: 'TestPlayer',
  avatar_emoji: '🦊',
  avatar_color: '#FF5733',
  avatar_image: 'pizza-pete',  // Custom avatar
  profile_picture_url: null,
  country_code: 'US',
  total_efficiency_score: 500,
  total_games: 10,
  games_won: 8,
  avg_attempts: 3.5,
  best_efficiency: 95,
  last_played_at: new Date().toISOString(),
  rank_position: 1,
  ...overrides,
});

// Mock fetch for API calls
global.fetch = jest.fn();

describe('TabbedDailyLeaderboard', () => {
  const mockT = (key: string) => key;

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/word-hunt/leaderboard')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [createMockParticipant()],
            totalParticipants: 1,
            totalPlayers: 1,
            totalSolved: 1,
            guestPlayerCount: 0,
          }),
        });
      }
      if (url.includes('/alltime')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [createMockAllTimeParticipant()],
            totalParticipants: 1,
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  describe('avatar_image support', () => {
    it('should include avatar_image in DailyParticipant interface', () => {
      // This test verifies the interface has avatar_image field
      const participant: DailyParticipant = createMockParticipant();
      expect(participant.avatar_image).toBe('shroom-shelly');
    });

    it('should include avatar_image in AllTimeParticipant interface', () => {
      // This test verifies the interface has avatar_image field
      const participant: AllTimeParticipant = createMockAllTimeParticipant();
      expect(participant.avatar_image).toBe('pizza-pete');
    });

    it('should render custom avatar image when avatar_image is provided and no profile_picture_url', async () => {
      // Dynamically import after mocks are set up
      const { default: TabbedDailyLeaderboard } = await import('../TabbedDailyLeaderboard');

      render(
        <TabbedDailyLeaderboard
          puzzleDate="2026-01-09"
          language="en"
          t={mockT}
        />
      );

      // Wait for API call and render
      await screen.findByText('TestPlayer');

      // Should render the custom avatar image (shroom-shelly), NOT the emoji
      const avatarImages = screen.getAllByTestId('avatar-image');
      expect(avatarImages.length).toBeGreaterThan(0);

      // The avatar should use the custom avatar path, not just show emoji
      const hasCustomAvatar = avatarImages.some(
        img => img.getAttribute('src')?.includes('/avatars/shroom-shelly')
      );
      expect(hasCustomAvatar).toBe(true);
    });

    it('should render profile picture when avatar_image is PROFILE_AVATAR_ID', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/word-hunt/leaderboard')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              data: [createMockParticipant({
                profile_picture_url: 'https://example.com/profile.jpg',
                avatar_image: '__profile_avatar__',  // Use profile picture
              })],
              totalParticipants: 1,
              totalPlayers: 1,
              totalSolved: 1,
              guestPlayerCount: 0,
            }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { default: TabbedDailyLeaderboard } = await import('../TabbedDailyLeaderboard');

      render(
        <TabbedDailyLeaderboard
          puzzleDate="2026-01-09"
          language="en"
          t={mockT}
        />
      );

      await screen.findByText('TestPlayer');

      // Should render the profile picture URL when avatar_image is PROFILE_AVATAR_ID
      const avatarImages = screen.getAllByTestId('avatar-image');
      const hasProfilePicture = avatarImages.some(
        img => img.getAttribute('src')?.includes('example.com/profile.jpg')
      );
      expect(hasProfilePicture).toBe(true);
    });

    it('should NOT show emoji when avatar_image is available', async () => {
      const { default: TabbedDailyLeaderboard } = await import('../TabbedDailyLeaderboard');

      render(
        <TabbedDailyLeaderboard
          puzzleDate="2026-01-09"
          language="en"
          t={mockT}
        />
      );

      await screen.findByText('TestPlayer');

      // The emoji should NOT be visible as an avatar when avatar_image is available
      // (emoji might appear elsewhere, but not as the main avatar)
      const emojiAvatarDivs = document.querySelectorAll('[style*="background-color: rgb(255, 87, 51)"]');

      // If avatar_image is properly used, there should be no emoji-based avatar div
      // with the background color (which is how emoji avatars are rendered)
      expect(emojiAvatarDivs.length).toBe(0);
    });
  });
});
