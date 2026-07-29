/**
 * AchievementProgressCard Tests
 * Tests for individual achievement card display with tier, progress, and pinning
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AchievementProgressCard from './AchievementProgressCard';

// Mock LanguageContext
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, any>) => {
      const translations: Record<string, string> = {
        'education.achievements.word_master.name': 'Word Master',
        'education.achievements.word_master.hint': 'Master 50 words to unlock',
        'education.achievements.streak_champion.name': 'Secret Achievement',
        'education.achievements.streak_champion.hint': 'Hidden until discovered...',
        'education.achievements.tiers.bronze': 'Bronze',
        'education.achievements.tiers.silver': 'Silver',
        'education.achievements.tiers.gold': 'Gold',
        'education.achievements.tiers.platinum': 'Platinum',
        'education.achievements.maxTier': 'Max Tier!',
        'education.achievements.toNext': '{percent}% to {tier}',
        'education.achievements.progress': '{current}/{next}',
        'education.achievements.pin': 'Pin badge',
        'education.achievements.unpin': 'Unpin badge',
        'education.achievements.maxPinsReached': 'Unpin another badge first',
        'education.achievements.locked': 'Locked',
        'education.achievements.secret': 'Secret Achievement',
      };

      let result = translations[key] || key;
      if (vars) {
        Object.keys(vars).forEach(varKey => {
          result = result.replace(`{${varKey}}`, String(vars[varKey]));
        });
      }
      return result;
    },
    language: 'en',
    direction: 'ltr',
  }),
}));

describe('AchievementProgressCard', () => {
  describe('Earned Badge Display', () => {
    it('renders earned badge with correct tier color', () => {
      const achievement = {
        key: 'word_master',
        category: 'progress' as const,
        icon: '🎓',
        isSecret: false,
        currentTier: 'bronze' as const,
        progressValue: 75,
        nextThreshold: 150,
        isMaxTier: false,
        percentComplete: 50, // 75/150 = 50%
      };

      render(
        <AchievementProgressCard
          achievement={achievement}
          isPinned={false}
          onTogglePin={vi.fn()}
          canPin={true}
        />
      );

      expect(screen.getByText('Word Master')).toBeInTheDocument();
      expect(screen.getByText('Bronze')).toBeInTheDocument();
      expect(screen.getByText('🎓')).toBeInTheDocument();
    });

    it('shows progress bar with current/next values', () => {
      const achievement = {
        key: 'word_master',
        category: 'progress' as const,
        icon: '🎓',
        isSecret: false,
        currentTier: 'bronze' as const,
        progressValue: 75,
        nextThreshold: 150,
        isMaxTier: false,
        percentComplete: 50, // 75/150 = 50%
      };

      render(
        <AchievementProgressCard
          achievement={achievement}
          isPinned={false}
          onTogglePin={vi.fn()}
          canPin={true}
        />
      );

      expect(screen.getByText('75/150')).toBeInTheDocument();
    });

    it('shows percent to next tier', () => {
      const achievement = {
        key: 'word_master',
        category: 'progress' as const,
        icon: '🎓',
        isSecret: false,
        currentTier: 'bronze' as const,
        progressValue: 100,
        nextThreshold: 150,
        currentThreshold: 50, // Bronze threshold
        isMaxTier: false,
        percentComplete: 50, // (100-50)/(150-50) = 50%
      };

      render(
        <AchievementProgressCard
          achievement={achievement}
          isPinned={false}
          onTogglePin={vi.fn()}
          canPin={true}
        />
      );

      // Progress from bronze (50) to silver (150): (100-50)/(150-50) = 50%
      expect(screen.getByText(/50% to Silver/)).toBeInTheDocument();
    });

    it('shows "Max Tier!" when at platinum', () => {
      const achievement = {
        key: 'word_master',
        category: 'progress' as const,
        icon: '🎓',
        isSecret: false,
        currentTier: 'platinum' as const,
        progressValue: 1000,
        nextThreshold: null,
        isMaxTier: true,
        percentComplete: 100, // Max tier reached
      };

      render(
        <AchievementProgressCard
          achievement={achievement}
          isPinned={false}
          onTogglePin={vi.fn()}
          canPin={true}
        />
      );

      expect(screen.getByText('Max Tier!')).toBeInTheDocument();
      expect(screen.getByText('Platinum')).toBeInTheDocument();
    });

    it('applies correct tier color classes', () => {
      const tierColors = ['bronze', 'silver', 'gold', 'platinum'];

      tierColors.forEach((tier) => {
        const { container } = render(
          <AchievementProgressCard
            achievement={{
              key: 'word_master',
              category: 'progress',
              icon: '🎓',
              isSecret: false,
              currentTier: tier as any,
              progressValue: 100,
              nextThreshold: tier === 'platinum' ? null : 200,
              isMaxTier: tier === 'platinum',
              percentComplete: tier === 'platinum' ? 100 : 50, // 100/200 = 50%
            }}
            isPinned={false}
            onTogglePin={vi.fn()}
            canPin={true}
          />
        );

        // Check that tier-specific class is applied
        const badge = container.querySelector(`[data-tier="${tier}"]`);
        expect(badge).toBeInTheDocument();
      });
    });
  });

  describe('Locked Badge Display', () => {
    it('renders locked badge with hint', () => {
      const achievement = {
        key: 'word_master',
        category: 'progress' as const,
        icon: '🎓',
        isSecret: false,
        currentTier: null,
        progressValue: 25,
        nextThreshold: 50,
        isMaxTier: false,
        percentComplete: 0, // Locked - no progress yet
      };

      render(
        <AchievementProgressCard
          achievement={achievement}
          isPinned={false}
          onTogglePin={vi.fn()}
          canPin={true}
        />
      );

      expect(screen.getByText('Word Master')).toBeInTheDocument();
      expect(screen.getByText('Master 50 words to unlock')).toBeInTheDocument();
      expect(screen.getByText('Locked')).toBeInTheDocument();
    });

    it('applies muted styling to locked badges', () => {
      const achievement = {
        key: 'word_master',
        category: 'progress' as const,
        icon: '🎓',
        isSecret: false,
        currentTier: null,
        progressValue: 25,
        nextThreshold: 50,
        isMaxTier: false,
        percentComplete: 0, // Locked - no progress yet
      };

      const { container } = render(
        <AchievementProgressCard
          achievement={achievement}
          isPinned={false}
          onTogglePin={vi.fn()}
          canPin={true}
        />
      );

      const card = container.querySelector('[data-locked="true"]');
      expect(card).toBeInTheDocument();
    });

    it('does not show pin button for locked badges', () => {
      const achievement = {
        key: 'word_master',
        category: 'progress' as const,
        icon: '🎓',
        isSecret: false,
        currentTier: null,
        progressValue: 25,
        nextThreshold: 50,
        isMaxTier: false,
        percentComplete: 0, // Locked - no progress yet
      };

      render(
        <AchievementProgressCard
          achievement={achievement}
          isPinned={false}
          onTogglePin={vi.fn()}
          canPin={true}
        />
      );

      expect(screen.queryByLabelText(/pin/i)).not.toBeInTheDocument();
    });
  });

  describe('Secret Badge Display', () => {
    it('renders secret badge as "???"', () => {
      const achievement = {
        key: 'streak_champion',
        category: 'consistency' as const,
        icon: '👑',
        isSecret: true,
        currentTier: null,
        progressValue: 5,
        nextThreshold: 7,
        isMaxTier: false,
        percentComplete: 0, // Locked secret - no progress yet
      };

      render(
        <AchievementProgressCard
          achievement={achievement}
          isPinned={false}
          onTogglePin={vi.fn()}
          canPin={true}
        />
      );

      expect(screen.getByText('Secret Achievement')).toBeInTheDocument();
      expect(screen.getByText('Hidden until discovered...')).toBeInTheDocument();
      expect(screen.getByText('???')).toBeInTheDocument();
    });

    it('shows revealed secret when unlocked', () => {
      const achievement = {
        key: 'streak_champion',
        category: 'consistency' as const,
        icon: '👑',
        isSecret: true,
        currentTier: 'bronze' as const,
        progressValue: 10,
        nextThreshold: 30,
        isMaxTier: false,
        percentComplete: 33, // 10/30 = 33%
      };

      render(
        <AchievementProgressCard
          achievement={achievement}
          isPinned={false}
          onTogglePin={vi.fn()}
          canPin={true}
        />
      );

      expect(screen.getByText('Secret Achievement')).toBeInTheDocument();
      expect(screen.getByText('👑')).toBeInTheDocument();
      expect(screen.queryByText('???')).not.toBeInTheDocument();
    });
  });

  describe('Pin Functionality', () => {
    it('pin button toggles on click', () => {
      const onTogglePin = vi.fn();
      const achievement = {
        key: 'word_master',
        category: 'progress' as const,
        icon: '🎓',
        isSecret: false,
        currentTier: 'bronze' as const,
        progressValue: 75,
        nextThreshold: 150,
        isMaxTier: false,
        percentComplete: 50, // 75/150 = 50%
      };

      render(
        <AchievementProgressCard
          achievement={achievement}
          isPinned={false}
          onTogglePin={onTogglePin}
          canPin={true}
        />
      );

      const pinButton = screen.getByLabelText('Pin badge');
      fireEvent.click(pinButton);

      expect(onTogglePin).toHaveBeenCalledWith('word_master', false);
    });

    it('shows filled star when pinned', () => {
      const achievement = {
        key: 'word_master',
        category: 'progress' as const,
        icon: '🎓',
        isSecret: false,
        currentTier: 'bronze' as const,
        progressValue: 75,
        nextThreshold: 150,
        isMaxTier: false,
        percentComplete: 50, // 75/150 = 50%
      };

      render(
        <AchievementProgressCard
          achievement={achievement}
          isPinned={true}
          onTogglePin={vi.fn()}
          canPin={true}
        />
      );

      const unpinButton = screen.getByLabelText('Unpin badge');
      expect(unpinButton).toBeInTheDocument();
    });

    it('pin button disabled when canPin=false', () => {
      const achievement = {
        key: 'word_master',
        category: 'progress' as const,
        icon: '🎓',
        isSecret: false,
        currentTier: 'bronze' as const,
        progressValue: 75,
        nextThreshold: 150,
        isMaxTier: false,
        percentComplete: 50, // 75/150 = 50%
      };

      render(
        <AchievementProgressCard
          achievement={achievement}
          isPinned={false}
          onTogglePin={vi.fn()}
          canPin={false}
        />
      );

      const pinButton = screen.getByLabelText('Pin badge');
      expect(pinButton).toBeDisabled();
    });

    it('shows tooltip when max pins reached', () => {
      const achievement = {
        key: 'word_master',
        category: 'progress' as const,
        icon: '🎓',
        isSecret: false,
        currentTier: 'bronze' as const,
        progressValue: 75,
        nextThreshold: 150,
        isMaxTier: false,
        percentComplete: 50, // 75/150 = 50%
      };

      render(
        <AchievementProgressCard
          achievement={achievement}
          isPinned={false}
          onTogglePin={vi.fn()}
          canPin={false}
        />
      );

      const pinButton = screen.getByLabelText('Pin badge');
      expect(pinButton).toHaveAttribute('title', 'Unpin another badge first');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for screen readers', () => {
      const achievement = {
        key: 'word_master',
        category: 'progress' as const,
        icon: '🎓',
        isSecret: false,
        currentTier: 'bronze' as const,
        progressValue: 75,
        nextThreshold: 150,
        isMaxTier: false,
        percentComplete: 50, // 75/150 = 50%
      };

      render(
        <AchievementProgressCard
          achievement={achievement}
          isPinned={false}
          onTogglePin={vi.fn()}
          canPin={true}
        />
      );

      expect(screen.getByRole('article')).toHaveAttribute('aria-label', 'Word Master achievement');
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('progress bar has correct aria-valuenow and aria-valuemax', () => {
      const achievement = {
        key: 'word_master',
        category: 'progress' as const,
        icon: '🎓',
        isSecret: false,
        currentTier: 'bronze' as const,
        progressValue: 75,
        nextThreshold: 150,
        isMaxTier: false,
        percentComplete: 50, // 75/150 = 50%
      };

      render(
        <AchievementProgressCard
          achievement={achievement}
          isPinned={false}
          onTogglePin={vi.fn()}
          canPin={true}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      expect(progressBar).toHaveAttribute('aria-valuemax', '150');
    });

    it('emoji icon carries an aria-label so screen readers do not just say "graphic"', () => {
      const achievement = {
        key: 'word_master',
        category: 'progress' as const,
        icon: '🎓',
        isSecret: false,
        currentTier: 'bronze' as const,
        progressValue: 75,
        nextThreshold: 150,
        isMaxTier: false,
        percentComplete: 50,
      };

      render(
        <AchievementProgressCard
          achievement={achievement}
          isPinned={false}
          onTogglePin={vi.fn()}
          canPin={true}
        />
      );

      const iconWrapper = screen.getByTestId('achievement-icon');
      expect(iconWrapper).toHaveAttribute('role', 'img');
      expect(iconWrapper).toHaveAttribute('aria-label');
      expect(iconWrapper.getAttribute('aria-label')).toMatch(/Word Master/i);
    });
  });
});
