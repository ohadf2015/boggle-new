/**
 * SinglePlayerLobby Feature Gates Tests
 *
 * Tests progressive feature unlocking for bot customization in SinglePlayerLobby
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SinglePlayerLobby from '../SinglePlayerLobby';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUserStats } from '@/hooks/useUserStats';

// Mock dependencies
jest.mock('@/contexts/LanguageContext');
jest.mock('@/hooks/useUserStats');
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});
jest.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: jest.fn(() => true), // Mock as landscape to show bot controls
}));

describe('SinglePlayerLobby - Feature Gates', () => {
  const mockInitialSettings = {
    mode: 'solo-bots' as const,
    difficulty: 'EASY' as const,
    language: 'en' as const,
    timerSeconds: 120,
    grid: null, // Grid not needed for feature gate tests
    minWordLength: 3,
    bots: [{
      id: 'bot-1',
      name: 'TestBot',
      difficulty: 'medium' as const,
      score: 0,
      wordsFound: [],
    }],
  };

  const mockProps = {
    initialSettings: mockInitialSettings,
    onStartGame: jest.fn(),
    onBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useLanguage as jest.Mock).mockReturnValue({
      t: (key: string) => {
        const translations: Record<string, string> = {
          'singlePlayer.soloVsBots': 'Solo vs Bots',
          'singlePlayer.practiceMode': 'Practice Mode',
          'singlePlayer.challengeMode': 'Challenge Mode',
          'singlePlayer.difficulty': 'Difficulty',
          'singlePlayer.bots': 'Bots',
          'singlePlayer.addBot': 'Add Bot',
          'singlePlayer.features.locked.customBotCount': 'Play 10 games to unlock',
          'common.back': 'Back',
        };
        return translations[key] || key;
      },
      language: 'en',
      setLanguage: jest.fn(),
      dir: 'ltr',
    });
  });

  describe('New Users (0-9 games)', () => {
    it('should NOT show bot add button for users with 0 games', () => {
      // GIVEN - New user with 0 games
      (useUserStats as jest.Mock).mockReturnValue({
        userStats: { totalGamesPlayed: 0 },
        isLoading: false,
      });

      // WHEN
      render(<SinglePlayerLobby {...mockProps} />);

      // THEN - Add bot button should not exist
      const addButtons = screen.queryAllByRole('button', { name: /add bot/i });
      expect(addButtons.length).toBe(0);
    });

    it('should NOT show bot add button for users with 9 games (below threshold)', () => {
      // GIVEN - User with 9 games (1 below threshold)
      (useUserStats as jest.Mock).mockReturnValue({
        userStats: { totalGamesPlayed: 9 },
        isLoading: false,
      });

      // WHEN
      render(<SinglePlayerLobby {...mockProps} />);

      // THEN - Add bot button should not exist
      const addButtons = screen.queryAllByRole('button', { name: /add bot/i });
      expect(addButtons.length).toBe(0);
    });
  });

  describe('Experienced Users (10+ games)', () => {
    it('should show bot add button for users with 10 games (exact threshold)', () => {
      // GIVEN - User with 10 games (meets threshold)
      (useUserStats as jest.Mock).mockReturnValue({
        userStats: { totalGamesPlayed: 10 },
        isLoading: false,
      });

      // WHEN
      render(<SinglePlayerLobby {...mockProps} />);

      // THEN - Add bot button should be visible (Plus icon button with aria-label)
      const addButtons = screen.queryAllByRole('button', { name: /add/i });
      expect(addButtons.length).toBeGreaterThan(0);
    });

    it('should show bot add button for users with 20+ games', () => {
      // GIVEN - User with 20 games
      (useUserStats as jest.Mock).mockReturnValue({
        userStats: { totalGamesPlayed: 20 },
        isLoading: false,
      });

      // WHEN
      render(<SinglePlayerLobby {...mockProps} />);

      // THEN - Add bot button should be visible
      const addButtons = screen.queryAllByRole('button', { name: /add/i });
      expect(addButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Unauthenticated Users', () => {
    it('should NOT show bot add button for unauthenticated users', () => {
      // GIVEN - No user logged in
      (useUserStats as jest.Mock).mockReturnValue({
        userStats: null,
        isLoading: false,
      });

      // WHEN
      render(<SinglePlayerLobby {...mockProps} />);

      // THEN - Add bot button should not exist
      const addButtons = screen.queryAllByRole('button', { name: /add bot/i });
      expect(addButtons.length).toBe(0);
    });
  });

  describe('Loading State', () => {
    it('should NOT show bot add button while loading user stats', () => {
      // GIVEN - User stats are loading
      (useUserStats as jest.Mock).mockReturnValue({
        userStats: null,
        isLoading: true,
      });

      // WHEN
      render(<SinglePlayerLobby {...mockProps} />);

      // THEN - Add bot button should not exist (conservative approach)
      const addButtons = screen.queryAllByRole('button', { name: /add bot/i });
      expect(addButtons.length).toBe(0);
    });
  });
});
