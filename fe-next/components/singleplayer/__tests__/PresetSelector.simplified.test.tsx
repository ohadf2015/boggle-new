/**
 * PresetSelector Simplified UI Tests
 *
 * Tests the new simplified single player entry point:
 * - Single "Play" button (no mode selection)
 * - "How to Play" tutorial button
 * - "Custom Game" for advanced options
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PresetSelector from '../PresetSelector';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUserStats } from '@/hooks/useUserStats';

// Mock dependencies
jest.mock('@/contexts/LanguageContext');
jest.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));
jest.mock('@/hooks/useUserStats');
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

describe('PresetSelector - Simplified UI', () => {
  const mockOnSelectPreset = jest.fn();
  const mockOnCustomGame = jest.fn();
  const mockOnStartTutorial = jest.fn();

  const defaultProps = {
    onSelectPreset: mockOnSelectPreset,
    onCustomGame: mockOnCustomGame,
    onStartTutorial: mockOnStartTutorial,
    challengeInfo: { highScore: null },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock user stats with enough games to unlock Custom Game (5+ games)
    (useUserStats as jest.Mock).mockReturnValue({
      userStats: { totalGamesPlayed: 5 },
      isLoading: false,
    });

    (useLanguage as jest.Mock).mockReturnValue({
      t: (key: string) => {
        const translations: Record<string, string> = {
          'landing.singlePlayer': 'Single Player',
          'singlePlayer.play': 'Play',
          'singlePlayer.playDesc': 'Jump into a game',
          'singlePlayer.howToPlay': 'How to Play',
          'singlePlayer.preset.customGame': 'Custom Game',
          'common.back': 'Back',
          'common.or': 'or',
        };
        return translations[key] || key;
      },
      language: 'en',
      setLanguage: jest.fn(),
      dir: 'ltr',
    });
  });

  describe('Simplified Entry Point', () => {
    it('should display single "Play" button as primary CTA', () => {
      render(<PresetSelector {...defaultProps} />);

      // Use getAllByRole to check there's exactly one Play button
      const playButtons = screen.getAllByRole('button').filter(button =>
        button.getAttribute('aria-label') === 'Play'
      );
      expect(playButtons).toHaveLength(1);
      expect(playButtons[0]).toBeInTheDocument();
    });

    it('should NOT display mode selection cards (solo-bots, practice, challenge)', () => {
      render(<PresetSelector {...defaultProps} />);

      // Mode names should not appear
      expect(screen.queryByText(/solo.*bots/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/practice/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/challenge/i)).not.toBeInTheDocument();
    });

    it('should display "How to Play" button for tutorial access', () => {
      render(<PresetSelector {...defaultProps} />);

      const tutorialButton = screen.getByRole('button', { name: /how to play/i });
      expect(tutorialButton).toBeInTheDocument();
    });

    it('should display "Custom Game" button for advanced settings', () => {
      render(<PresetSelector {...defaultProps} />);

      const customButton = screen.getByRole('button', { name: /custom game/i });
      expect(customButton).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onSelectPreset when "Play" button is clicked', () => {
      render(<PresetSelector {...defaultProps} />);

      // Find Play button by aria-label
      const playButtons = screen.getAllByRole('button').filter(button =>
        button.getAttribute('aria-label') === 'Play'
      );
      expect(playButtons).toHaveLength(1);

      fireEvent.click(playButtons[0]);

      expect(mockOnSelectPreset).toHaveBeenCalledTimes(1);
      expect(mockOnSelectPreset).toHaveBeenCalledWith(
        expect.objectContaining({
          modes: expect.arrayContaining(['solo-bots']), // Default unified mode
        })
      );
    });

    it('should call onStartTutorial when "How to Play" button is clicked', () => {
      render(<PresetSelector {...defaultProps} />);

      const tutorialButton = screen.getByRole('button', { name: /how to play/i });
      fireEvent.click(tutorialButton);

      expect(mockOnStartTutorial).toHaveBeenCalledTimes(1);
    });

    it('should call onCustomGame when "Custom Game" button is clicked', () => {
      render(<PresetSelector {...defaultProps} />);

      const customButton = screen.getByRole('button', { name: /custom game/i });
      fireEvent.click(customButton);

      expect(mockOnCustomGame).toHaveBeenCalledTimes(1);
    });
  });

  describe('Challenge High Score Display', () => {
    it('should display high score when available', () => {
      const propsWithScore = {
        ...defaultProps,
        challengeInfo: {
          highScore: 1250,
          wordCount: 15,
          longestWord: 'EXAMPLE',
        },
      };

      render(<PresetSelector {...propsWithScore} />);

      // High score text might be split across elements, use regex matcher
      expect(screen.getByText(/1250/)).toBeInTheDocument();
    });

    it('should NOT display high score section when null', () => {
      render(<PresetSelector {...defaultProps} />);

      // High score elements should not be in document
      expect(screen.queryByText(/record/i)).not.toBeInTheDocument();
    });
  });
});
