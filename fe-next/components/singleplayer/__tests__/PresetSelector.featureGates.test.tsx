/**
 * PresetSelector Feature Gates Tests
 *
 * Tests progressive feature unlocking in PresetSelector
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PresetSelector from '../PresetSelector';
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

describe('PresetSelector - Feature Gates', () => {
  const mockProps = {
    onSelectPreset: jest.fn(),
    onCustomGame: jest.fn(),
    onStartTutorial: jest.fn(),
    challengeInfo: { highScore: null },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useLanguage as jest.Mock).mockReturnValue({
      t: (key: string) => {
        const translations: Record<string, string> = {
          'singlePlayer.play': 'Play',
          'singlePlayer.howToPlay': 'How to Play',
          'singlePlayer.preset.customGame': 'Custom Game',
          'singlePlayer.features.locked.advancedSettings': 'Play 5 games to unlock',
        };
        return translations[key] || key;
      },
      language: 'en',
      setLanguage: jest.fn(),
      dir: 'ltr',
    });
  });

  describe('New Users (0 games)', () => {
    it('should NOT show Custom Game button for new users', () => {
      // GIVEN - New user with 0 games
      (useUserStats as jest.Mock).mockReturnValue({
        userStats: { totalGamesPlayed: 0 },
        isLoading: false,
      });

      // WHEN
      render(<PresetSelector {...mockProps} />);

      // THEN - Custom Game button should not exist
      expect(screen.queryByText(/custom game/i)).not.toBeInTheDocument();
    });
  });

  describe('Experienced Users (5+ games)', () => {
    it('should show Custom Game button for users with 5+ games', () => {
      // GIVEN - User with 5 games (unlocks advanced settings)
      (useUserStats as jest.Mock).mockReturnValue({
        userStats: { totalGamesPlayed: 5 },
        isLoading: false,
      });

      // WHEN
      render(<PresetSelector {...mockProps} />);

      // THEN - Custom Game button should be visible
      expect(screen.getByText(/custom game/i)).toBeInTheDocument();
    });

    it('should show Custom Game button for users with 10+ games', () => {
      // GIVEN - User with 10 games
      (useUserStats as jest.Mock).mockReturnValue({
        userStats: { totalGamesPlayed: 10 },
        isLoading: false,
      });

      // WHEN
      render(<PresetSelector {...mockProps} />);

      // THEN - Custom Game button should be visible
      expect(screen.getByText(/custom game/i)).toBeInTheDocument();
    });
  });

  describe('Threshold Boundary (4 vs 5 games)', () => {
    it('should hide Custom Game at 4 games (below threshold)', () => {
      // GIVEN - User with 4 games (1 below threshold)
      (useUserStats as jest.Mock).mockReturnValue({
        userStats: { totalGamesPlayed: 4 },
        isLoading: false,
      });

      // WHEN
      render(<PresetSelector {...mockProps} />);

      // THEN - Custom Game button should NOT be visible
      expect(screen.queryByText(/custom game/i)).not.toBeInTheDocument();
    });

    it('should show Custom Game at 5 games (exact threshold)', () => {
      // GIVEN - User with 5 games (meets threshold)
      (useUserStats as jest.Mock).mockReturnValue({
        userStats: { totalGamesPlayed: 5 },
        isLoading: false,
      });

      // WHEN
      render(<PresetSelector {...mockProps} />);

      // THEN - Custom Game button SHOULD be visible
      expect(screen.getByText(/custom game/i)).toBeInTheDocument();
    });
  });

  describe('Unauthenticated Users', () => {
    it('should NOT show Custom Game for unauthenticated users', () => {
      // GIVEN - No user logged in
      (useUserStats as jest.Mock).mockReturnValue({
        userStats: null,
        isLoading: false,
      });

      // WHEN
      render(<PresetSelector {...mockProps} />);

      // THEN - Custom Game button should not exist
      expect(screen.queryByText(/custom game/i)).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should NOT show Custom Game while loading user stats', () => {
      // GIVEN - User stats are loading
      (useUserStats as jest.Mock).mockReturnValue({
        userStats: null,
        isLoading: true,
      });

      // WHEN
      render(<PresetSelector {...mockProps} />);

      // THEN - Custom Game button should not exist (conservative approach)
      expect(screen.queryByText(/custom game/i)).not.toBeInTheDocument();
    });
  });
});
