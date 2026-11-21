/**
 * PracticeSessionProvider Tests
 *
 * Tests for the practice session context provider that wraps
 * practice components with XP state and persistence.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock dependencies
const {
  mockAwardPracticeXp,
  mockAcknowledgePersistence,
  mockEnqueueUnlocks,
  mockAcknowledgeUnlock,
  mockSupabaseUpsert,
  mockUseAchievementUnlock,
} = vi.hoisted(() => ({
  mockAwardPracticeXp: vi.fn(),
  mockAcknowledgePersistence: vi.fn(),
  mockEnqueueUnlocks: vi.fn(),
  mockAcknowledgeUnlock: vi.fn(),
  mockSupabaseUpsert: vi.fn().mockResolvedValue({ data: null, error: null }),
  mockUseAchievementUnlock: vi.fn(),
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: mockSupabaseUpsert,
    })),
  },
}));

// Mock education telemetry — F1 wiring
const mockTrackEduPracticeComplete = vi.fn();
vi.mock('@/lib/education/telemetry', () => ({
  trackEduPracticeComplete: (...args: unknown[]) => mockTrackEduPracticeComplete(...args),
  trackEduError: vi.fn(),
}));

// Mock useEducationXp hook
vi.mock('@/hooks/useEducationXp', () => ({
  __esModule: true,
  default: vi.fn(() => ({
    totalXp: 500,
    currentLevel: 3,
    xpProgress: {
      currentLevel: 3,
      progressPercent: 50,
      xpInCurrentLevel: 100,
      xpNeededForNextLevel: 200,
      isMaxLevel: false,
    },
    streak: {
      currentStreak: 5,
      longestStreak: 10,
      lastPracticeDate: '2026-01-25',
    },
    awardPracticeXp: mockAwardPracticeXp,
    acknowledgePersistence: mockAcknowledgePersistence,
    isLoading: false,
    error: null,
    pendingUpdate: null,
  })),
  useEducationXp: vi.fn(() => ({
    totalXp: 500,
    currentLevel: 3,
    xpProgress: {
      currentLevel: 3,
      progressPercent: 50,
      xpInCurrentLevel: 100,
      xpNeededForNextLevel: 200,
      isMaxLevel: false,
    },
    streak: {
      currentStreak: 5,
      longestStreak: 10,
      lastPracticeDate: '2026-01-25',
    },
    awardPracticeXp: mockAwardPracticeXp,
    acknowledgePersistence: mockAcknowledgePersistence,
    isLoading: false,
    error: null,
    pendingUpdate: null,
  })),
}));

// Mock useAchievementUnlock hook
mockUseAchievementUnlock.mockReturnValue({
  pendingUnlocks: [],
  currentUnlock: null,
  acknowledgeUnlock: mockAcknowledgeUnlock,
  enqueueUnlocks: mockEnqueueUnlocks,
});
vi.mock('@/hooks/useAchievementUnlock', () => ({
  __esModule: true,
  default: mockUseAchievementUnlock,
}));

// Mock UnifiedAchievementModal component
vi.mock('@/components/achievements/UnifiedAchievementModal', () => ({
  __esModule: true,
  UnifiedAchievementModal: vi.fn(() => <div data-testid="achievement-modal">Achievement Modal</div>),
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  })),
}));

// Import after mocks
import { PracticeSessionProvider, usePracticeSession } from './PracticeSessionProvider';
import useEducationXp from '@/hooks/useEducationXp';
import type { Mock } from 'vitest';

// Test consumer component
function TestConsumer() {
  const context = usePracticeSession();
  return (
    <div>
      <span data-testid="total-xp">{context.totalXp}</span>
      <span data-testid="current-level">{context.currentLevel}</span>
      <span data-testid="session-xp">{context.sessionXpEarned}</span>
      <span data-testid="streak">{context.streak.currentStreak}</span>
      <span data-testid="mastery-message">{context.sessionMasteryMessage || 'none'}</span>
      <button
        data-testid="complete-btn"
        onClick={() => context.completePracticeSession({
          type: 'flashcard',
          cardsReviewed: 10,
          cardsCorrect: 9,
        })}
      >
        Complete
      </button>
    </div>
  );
}

describe('PracticeSessionProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAwardPracticeXp.mockResolvedValue({
      totalXp: 100,
      breakdown: { flashcardCorrect: 90, accuracyBonus: 10 },
      masteryMessage: 'Great job! You learned 9 words!',
      leveledUp: false,
      newTitles: [],
    });
  });

  describe('Context Provider', () => {
    it('renders children correctly', () => {
      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <div data-testid="child">Child content</div>
        </PracticeSessionProvider>
      );

      expect(screen.getByTestId('child')).toHaveTextContent('Child content');
    });

    it('provides XP state from useEducationXp hook', () => {
      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <TestConsumer />
        </PracticeSessionProvider>
      );

      expect(screen.getByTestId('total-xp')).toHaveTextContent('500');
      expect(screen.getByTestId('current-level')).toHaveTextContent('3');
      expect(screen.getByTestId('streak')).toHaveTextContent('5');
    });

    it('initializes session XP earned to 0', () => {
      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <TestConsumer />
        </PracticeSessionProvider>
      );

      expect(screen.getByTestId('session-xp')).toHaveTextContent('0');
    });

    it('initializes with no mastery message', () => {
      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <TestConsumer />
        </PracticeSessionProvider>
      );

      expect(screen.getByTestId('mastery-message')).toHaveTextContent('none');
    });
  });

  describe('completePracticeSession', () => {
    it('calls awardPracticeXp with correct parameters', async () => {
      const user = userEvent.setup();

      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <TestConsumer />
        </PracticeSessionProvider>
      );

      await user.click(screen.getByTestId('complete-btn'));

      await waitFor(() => {
        expect(mockAwardPracticeXp).toHaveBeenCalledWith({
          type: 'flashcard',
          sessionData: {
            cardsReviewed: 10,
            cardsCorrect: 9,
          },
          streakDays: 5, // From mock streak.currentStreak
        });
      });
    });

    it('updates session XP earned after completion', async () => {
      const user = userEvent.setup();

      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <TestConsumer />
        </PracticeSessionProvider>
      );

      await user.click(screen.getByTestId('complete-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('session-xp')).toHaveTextContent('100');
      });
    });

    it('updates session mastery message after completion', async () => {
      const user = userEvent.setup();

      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <TestConsumer />
        </PracticeSessionProvider>
      );

      await user.click(screen.getByTestId('complete-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('mastery-message')).toHaveTextContent('Great job! You learned 9 words!');
      });
    });

    it('given the client XP estimate says level-up, when completed, then the provider raises no celebration of its own', async () => {
      const user = userEvent.setup();
      mockAwardPracticeXp.mockResolvedValueOnce({
        totalXp: 200, breakdown: {}, masteryMessage: 'Level up!', leveledUp: true, newLevel: 4, newTitles: [],
      });
      function Spy() {
        const keys = Object.keys(usePracticeSession()).join(',');
        return <span data-testid="ctx-keys">{keys}</span>;
      }
      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <TestConsumer />
          <Spy />
        </PracticeSessionProvider>
      );
      await user.click(screen.getByTestId('complete-btn'));
      await waitFor(() => expect(screen.getByTestId('session-xp')).toHaveTextContent('200'));
      expect(screen.getByTestId('ctx-keys').textContent).not.toMatch(/levelUp/);
    });

    it('does NOT call Supabase directly — XP persistence is server-side only (C2 fix)', async () => {
      const user = userEvent.setup();

      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <TestConsumer />
        </PracticeSessionProvider>
      );

      await user.click(screen.getByTestId('complete-btn'));

      // C2 fix: persistToSupabase was removed — client should NOT write XP directly
      // All XP persistence goes through PATCH /api/education/practice server-side
      expect(mockSupabaseUpsert).not.toHaveBeenCalled();
    });
  });

  describe('usePracticeSession hook', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow('usePracticeSession must be used within a PracticeSessionProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Initial values from props', () => {
    it('passes initial XP to useEducationXp', () => {
      const mockUseEducationXp = useEducationXp as Mock;

      render(
        <PracticeSessionProvider
          studentId="student-1"
          lessonId="lesson-1"
          initialXp={1000}
          initialLevel={5}
          initialStreak={7}
        >
          <TestConsumer />
        </PracticeSessionProvider>
      );

      expect(mockUseEducationXp).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: 'student-1',
          lessonId: 'lesson-1',
          initialXp: 1000,
          initialLevel: 5,
          initialStreak: 7,
        })
      );
    });
  });

  describe('Solo board session', () => {
    it('handles solo board session data correctly', async () => {
      const user = userEvent.setup();

      // Custom test consumer for solo board
      function SoloBoardConsumer() {
        const context = usePracticeSession();
        return (
          <button
            data-testid="solo-btn"
            onClick={() => context.completePracticeSession({
              type: 'solo_board',
              vocabularyWordsFound: ['HELLO', 'WORLD'],
              newWordsFound: ['HELLO'],
            })}
          >
            Complete Solo
          </button>
        );
      }

      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <SoloBoardConsumer />
        </PracticeSessionProvider>
      );

      await user.click(screen.getByTestId('solo-btn'));

      await waitFor(() => {
        expect(mockAwardPracticeXp).toHaveBeenCalledWith({
          type: 'solo_board',
          sessionData: {
            vocabularyWordsFound: ['HELLO', 'WORLD'],
            newWordsFound: ['HELLO'],
          },
          streakDays: 5,
        });
      });
    });
  });

  describe('Error handling', () => {
    it('handles Supabase errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockSupabaseUpsert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <TestConsumer />
        </PracticeSessionProvider>
      );

      // Should not throw, just log error
      await user.click(screen.getByTestId('complete-btn'));

      // Session should still update even if persistence fails
      await waitFor(() => {
        expect(screen.getByTestId('session-xp')).toHaveTextContent('100');
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Achievement Integration', () => {
    beforeEach(() => {
      mockEnqueueUnlocks.mockClear();
      mockAcknowledgeUnlock.mockClear();
    });

    it('celebrates nothing when the server returns no awards', async () => {
      const user = userEvent.setup();

      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <TestConsumer />
        </PracticeSessionProvider>
      );

      await user.click(screen.getByTestId('complete-btn'));

      await waitFor(() => expect(mockAwardPracticeXp).toHaveBeenCalled());
      expect(mockEnqueueUnlocks).not.toHaveBeenCalled();
    });

    it('renders AchievementUnlockModal when currentUnlock is set', () => {
      // Import the mock to modify it
      // Set currentUnlock to a valid unlock payload via the hoisted mock
      mockUseAchievementUnlock.mockReturnValue({
        pendingUnlocks: [],
        currentUnlock: {
          achievementKey: 'test-achievement',
          tier: 'bronze',
          icon: '🏆',
          isNew: true,
          isUpgrade: false,
        },
        acknowledgeUnlock: mockAcknowledgeUnlock,
        enqueueUnlocks: mockEnqueueUnlocks,
      });

      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <TestConsumer />
        </PracticeSessionProvider>
      );

      expect(screen.getByTestId('achievement-modal')).toBeInTheDocument();
    });

    it('celebrates nothing if the XP award fails', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockAwardPracticeXp.mockRejectedValueOnce(new Error('XP award failed'));

      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <TestConsumer />
        </PracticeSessionProvider>
      );

      await user.click(screen.getByTestId('complete-btn'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      // Nothing is celebrated when the award fails
      expect(mockEnqueueUnlocks).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('telemetry (F1 wiring)', () => {
    beforeEach(() => {
      mockTrackEduPracticeComplete.mockClear();
    });

    it('emits edu_practice_complete with outcome metrics on session completion', async () => {
      const user = userEvent.setup();

      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <TestConsumer />
        </PracticeSessionProvider>
      );

      await user.click(screen.getByTestId('complete-btn'));

      await waitFor(() => {
        expect(mockTrackEduPracticeComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            lessonId: 'lesson-1',
            practiceType: 'flashcard',
            cardsReviewed: 10,
            cardsCorrect: 9,
          }),
        );
      });
    });

    it('does not emit telemetry when XP award fails', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockAwardPracticeXp.mockRejectedValueOnce(new Error('boom'));

      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <TestConsumer />
        </PracticeSessionProvider>
      );

      await user.click(screen.getByTestId('complete-btn'));
      await waitFor(() => expect(consoleSpy).toHaveBeenCalled());

      expect(mockTrackEduPracticeComplete).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
