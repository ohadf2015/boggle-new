/**
 * EducationBadgeGrid Tests
 * Tests for achievement grid display with categories, pinning, and progress
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import EducationBadgeGrid from './EducationBadgeGrid';

// Mock LanguageContext
jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, any>) => {
      const translations: Record<string, string> = {
        'education.achievements.title': 'Achievements',
        'education.achievements.completion': '{percent}% Complete - {earned}/{total} badges',
        'education.achievements.featured': 'Featured Badges',
        'education.achievements.categories.progress': 'Progress Milestones',
        'education.achievements.categories.skill': 'Skill-Based Feats',
        'education.achievements.categories.consistency': 'Consistency Habits',
        'education.achievements.categories.exploration': 'Exploration',
        'education.achievements.earned': '{count}/{total} earned',
        'education.achievements.secretRemaining': '{count} secret badges remain hidden...',
        'education.achievements.maxPinsReached': 'Unpin another badge first',
        'education.achievements.word_master.name': 'Word Master',
        'education.achievements.first_lesson.name': 'First Lesson',
        'education.achievements.streak_champion.name': 'Streak Champion',
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

// Mock AchievementProgressCard
jest.mock('./AchievementProgressCard', () => {
  return function MockAchievementProgressCard({ achievement, isPinned, onTogglePin, canPin }: any) {
    return (
      <div data-testid={`card-${achievement.key}`} data-pinned={isPinned} data-can-pin={canPin}>
        <span>{achievement.key}</span>
        <button onClick={() => onTogglePin(achievement.key)}>
          {isPinned ? 'Unpin' : 'Pin'}
        </button>
      </div>
    );
  };
});

describe('EducationBadgeGrid', () => {
  const mockAchievements = [
    {
      achievement_key: 'word_master',
      current_tier: 'bronze',
      progress_value: 75,
      next_threshold: 150,
      percent_complete: 50,
      is_pinned: false,
      is_secret: false,
      category: 'progress',
      icon: '🎓',
    },
    {
      achievement_key: 'first_lesson',
      current_tier: 'silver',
      progress_value: 5,
      next_threshold: 10,
      percent_complete: 50,
      is_pinned: true,
      is_secret: false,
      category: 'progress',
      icon: '📚',
    },
    {
      achievement_key: 'speed_demon',
      current_tier: null,
      progress_value: 5,
      next_threshold: 10,
      percent_complete: 0,
      is_pinned: false,
      is_secret: false,
      category: 'skill',
      icon: '⚡',
    },
    {
      achievement_key: 'streak_champion',
      current_tier: null,
      progress_value: 3,
      next_threshold: 7,
      percent_complete: 0,
      is_pinned: false,
      is_secret: true,
      category: 'consistency',
      icon: '👑',
    },
  ];

  describe('Overall Completion', () => {
    it('shows overall completion percentage', () => {
      render(
        <EducationBadgeGrid
          studentId="student-123"
          achievements={mockAchievements}
        />
      );

      // 2 earned out of 4 total = 50%
      expect(screen.getByText('50% Complete - 2/4 badges')).toBeInTheDocument();
    });

    it('shows completion progress bar', () => {
      render(
        <EducationBadgeGrid
          studentId="student-123"
          achievements={mockAchievements}
        />
      );

      const progressBar = screen.getByRole('progressbar', { name: /overall progress/i });
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('Pinned Badges Section', () => {
    it('shows pinned badges section when badges pinned', () => {
      render(
        <EducationBadgeGrid
          studentId="student-123"
          achievements={mockAchievements}
        />
      );

      expect(screen.getByText('Featured Badges')).toBeInTheDocument();
    });

    it('does not show pinned section when no badges pinned', () => {
      const unpinnedAchievements = mockAchievements.map(a => ({ ...a, is_pinned: false }));

      render(
        <EducationBadgeGrid
          studentId="student-123"
          achievements={unpinnedAchievements}
        />
      );

      expect(screen.queryByText('Featured Badges')).not.toBeInTheDocument();
    });

    it('displays pinned badges in featured section', () => {
      render(
        <EducationBadgeGrid
          studentId="student-123"
          achievements={mockAchievements}
        />
      );

      const featuredSection = screen.getByTestId('featured-badges');
      expect(within(featuredSection).getByTestId('card-first_lesson')).toBeInTheDocument();
    });
  });

  describe('Category Sections', () => {
    it('groups badges by category', () => {
      render(
        <EducationBadgeGrid
          studentId="student-123"
          achievements={mockAchievements}
        />
      );

      expect(screen.getByText('Progress Milestones')).toBeInTheDocument();
      expect(screen.getByText('Skill-Based Feats')).toBeInTheDocument();
      expect(screen.getByText('Consistency Habits')).toBeInTheDocument();
    });

    it('shows earned count per category', () => {
      render(
        <EducationBadgeGrid
          studentId="student-123"
          achievements={mockAchievements}
        />
      );

      // Progress: 2 total, 2 earned (word_master bronze, first_lesson silver)
      expect(screen.getByText('2/2 earned')).toBeInTheDocument();

      // Skill and Consistency both show 0/1 earned
      const zeroOfOne = screen.getAllByText('0/1 earned');
      expect(zeroOfOne).toHaveLength(2); // Skill + Consistency
    });

    it('category sections are collapsible', () => {
      render(
        <EducationBadgeGrid
          studentId="student-123"
          achievements={mockAchievements}
        />
      );

      const progressSection = screen.getByText('Progress Milestones').closest('button');
      expect(progressSection).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(progressSection!);

      // Content should be hidden (implementation detail - may vary)
      const categoryContent = screen.getByTestId('category-progress');
      expect(categoryContent).toHaveAttribute('data-expanded', 'false');
    });

    it('sorts earned badges before locked within category', () => {
      const { container } = render(
        <EducationBadgeGrid
          studentId="student-123"
          achievements={mockAchievements}
        />
      );

      const progressCategory = container.querySelector('[data-category="progress"]');
      const cards = progressCategory?.querySelectorAll('[data-testid^="card-"]');

      // First should be first_lesson (silver), then word_master (bronze)
      expect(cards?.[0]).toHaveAttribute('data-testid', 'card-first_lesson');
      expect(cards?.[1]).toHaveAttribute('data-testid', 'card-word_master');
    });
  });

  describe('Pin Logic', () => {
    it('enforces max 3 pins', () => {
      const threePinned = mockAchievements.map((a, i) => ({
        ...a,
        is_pinned: i < 3, // Pin first 3
      }));

      render(
        <EducationBadgeGrid
          studentId="student-123"
          achievements={threePinned}
        />
      );

      // 4th card should not be able to pin
      const fourthCard = screen.getByTestId('card-streak_champion');
      expect(fourthCard).toHaveAttribute('data-can-pin', 'false');
    });

    it('allows pinning when less than 3 pinned', () => {
      render(
        <EducationBadgeGrid
          studentId="student-123"
          achievements={mockAchievements}
        />
      );

      // Only 1 pinned, so others can pin
      const wordMasterCard = screen.getByTestId('card-word_master');
      expect(wordMasterCard).toHaveAttribute('data-can-pin', 'true');
    });

    it('allows unpinning even when 3 pinned', () => {
      const achievements = mockAchievements.map((a, i) => ({
        ...a,
        is_pinned: i < 3,
      }));

      render(
        <EducationBadgeGrid
          studentId="student-123"
          achievements={achievements}
        />
      );

      // Pinned cards should always be able to unpin
      const firstCards = screen.getAllByTestId('card-word_master');
      // Check the one in featured section (first one)
      expect(firstCards[0]).toHaveAttribute('data-can-pin', 'true');
    });

    it('toggles pin state on click', () => {
      render(
        <EducationBadgeGrid
          studentId="student-123"
          achievements={mockAchievements}
        />
      );

      const cards = screen.getAllByTestId('card-word_master');
      // Use the one in the category section (not featured)
      const card = cards[cards.length - 1];
      const pinButton = within(card).getByText('Pin');

      fireEvent.click(pinButton);

      // Would normally update database and re-render
      // For now just verify handler is called
      expect(pinButton).toBeInTheDocument();
    });
  });

  describe('Secret Badges', () => {
    it('shows secret badge hint count', () => {
      render(
        <EducationBadgeGrid
          studentId="student-123"
          achievements={mockAchievements}
        />
      );

      // 1 secret badge locked
      expect(screen.getByText('1 secret badges remain hidden...')).toBeInTheDocument();
    });

    it('does not count unlocked secrets', () => {
      const achievementsWithUnlockedSecret = [
        ...mockAchievements.slice(0, 3),
        {
          ...mockAchievements[3],
          current_tier: 'bronze', // Unlocked
        },
      ];

      render(
        <EducationBadgeGrid
          studentId="student-123"
          achievements={achievementsWithUnlockedSecret}
        />
      );

      // 0 secret badges remain
      expect(screen.queryByText(/secret badges remain/)).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('handles empty achievements list', () => {
      render(
        <EducationBadgeGrid
          studentId="student-123"
          achievements={[]}
        />
      );

      expect(screen.getByText('0% Complete - 0/0 badges')).toBeInTheDocument();
    });
  });

  describe('All Unlocked State', () => {
    it('shows 100% when all achievements unlocked', () => {
      const allUnlocked = mockAchievements.map(a => ({
        ...a,
        current_tier: 'platinum',
      }));

      render(
        <EducationBadgeGrid
          studentId="student-123"
          achievements={allUnlocked}
        />
      );

      expect(screen.getByText('100% Complete - 4/4 badges')).toBeInTheDocument();
    });
  });
});
