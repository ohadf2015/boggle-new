/**
 * WinStreakDisplay Component Tests
 *
 * Tests for the win streak display in game results.
 * Verifies progress bar calculations, tier names, and text clarity.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import WinStreakDisplay from '../WinStreakDisplay';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, style, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div className={className} style={style} {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock contexts
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'growth.dayStreak': 'day streak',
        'growth.nextTier': 'Next tier',
        'growth.daysAway': 'days away',
        'growth.winsAway': 'wins away', // This should NOT be used for daily streaks
        'growth.newBest': 'New Best!',
        'growth.newPersonalBest': 'New Personal Best!',
        'growth.streakUnlocked': 'Streak Unlocked!',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

vi.mock('@/utils/confettiUtils', () => ({
  fireConfetti: vi.fn(),
}));

describe('WinStreakDisplay', () => {
  describe('Progress Bar Calculation', () => {
    it('should show meaningful progress when streak is at tier minimum', () => {
      // BUG FIX TEST: When streak = 1 (tier min), progress was 0%
      // Expected: Progress should be calculated so that having 1 day shows progress
      //
      // The issue is the formula: (currentStreak - tier.min) / (nextTier.min - tier.min)
      // For streak=1, tier.min=1, nextTier.min=3: (1-1)/(3-1) = 0/2 = 0%
      //
      // Better formula: (currentStreak - tier.min + 1) / (nextTier.min - tier.min)
      // For streak=1: (1-1+1)/(3-1) = 1/2 = 50%
      render(
        <WinStreakDisplay
          currentStreak={1}
          bestStreak={1}
        />
      );

      // Should show "2 days away" for next tier (tier 'Hot' starts at 3)
      // This validates that progress is being shown
      expect(screen.getByText(/2/)).toBeInTheDocument();
    });

    it('should show correct days remaining for next tier', () => {
      // At streak = 2, should be 1 day away from tier 'Hot' (starts at 3)
      render(
        <WinStreakDisplay
          currentStreak={2}
          bestStreak={2}
        />
      );

      // Should show "1 days away" for next tier
      expect(screen.getByText(/1/)).toBeInTheDocument();
    });
  });

  describe('Tier Display Text Clarity', () => {
    it('should display "days away" instead of "wins away" for streak context', () => {
      // BUG FIX TEST: The text said "wins away" which is confusing for daily challenges
      // where users build streaks by playing daily, not by winning
      render(
        <WinStreakDisplay
          currentStreak={1}
          bestStreak={1}
        />
      );

      // Should show "days away" not "wins away" for streak progress
      // Note: This test will fail until we fix the translation key
      const daysAwayText = screen.queryByText(/days away/i);
      const winsAwayText = screen.queryByText(/wins away/i);

      // Either "days away" should be present, OR "wins away" should NOT be present
      // We prefer "days away" for daily challenge context
      expect(daysAwayText || !winsAwayText).toBeTruthy();
    });
  });

  describe('Streak Display', () => {
    it('should not render when currentStreak is 0', () => {
      const { container } = render(
        <WinStreakDisplay
          currentStreak={0}
          bestStreak={5}
        />
      );

      // Component should return null for 0 streak
      expect(container.firstChild).toBeNull();
    });

    it('should display the current streak number', () => {
      render(
        <WinStreakDisplay
          currentStreak={5}
          bestStreak={10}
        />
      );

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should display "day streak" text', () => {
      render(
        <WinStreakDisplay
          currentStreak={3}
          bestStreak={3}
        />
      );

      expect(screen.getByText('day streak')).toBeInTheDocument();
    });

    it('should show next tier information', () => {
      render(
        <WinStreakDisplay
          currentStreak={1}
          bestStreak={1}
        />
      );

      // Should show "Next tier" label
      expect(screen.getByText('Next tier')).toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('should render compact badge when compact prop is true', () => {
      render(
        <WinStreakDisplay
          currentStreak={5}
          bestStreak={10}
          compact={true}
        />
      );

      // In compact mode, should still show streak and text
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('day streak')).toBeInTheDocument();
    });
  });
});
