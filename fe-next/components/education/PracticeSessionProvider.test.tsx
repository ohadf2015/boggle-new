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
  mockCheckForUnlocks,
  mockAcknowledgeUnlock,
  mockSupabaseUpsert,
  mockUseAchievementUnlock,
} = vi.hoisted(() => ({
  mockAwardPracticeXp: vi.fn(),
  mockAcknowledgePersistence: vi.fn(),
  mockCheckForUnlocks: vi.fn(),
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
  checkForUnlocks: mockCheckForUnlocks,
  isChecking: false,
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
      <span data-testid="level-up">{context.levelUpData ? 'yes' : 'no'}</span>
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
      <button
        data-testid="dismiss-btn"
        onClick={() => context.dismissLevelUp()}
      >
        Dismiss
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

    it('initializes with no level up data', () => {
      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <TestConsumer />
        </PracticeSessionProvider>
      );

      expect(screen.getByTestId('level-up')).toHaveTextContent('no');
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

    it('sets level up data when player levels up', async () => {
      const user = userEvent.setup();

      // Configure mock to return level up
      mockAwardPracticeXp.mockResolvedValueOnce({
        totalXp: 200,
        breakdown: {},
        masteryMessage: 'Level up!',
        leveledUp: true,
        newLevel: 4,
        newTitles: ['Word Master'],
      });

      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <TestConsumer />
        </PracticeSessionProvider>
      );

      await user.click(screen.getByTestId('complete-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('level-up')).toHaveTextContent('yes');
      });
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

  describe('dismissLevelUp', () => {
    it('clears level up data when dismissed', async () => {
      const user = userEvent.setup();

      // Configure mock to return level up
      mockAwardPracticeXp.mockResolvedValueOnce({
        totalXp: 200,
        breakdown: {},
        masteryMessage: 'Level up!',
        leveledUp: true,
        newLevel: 4,
        newTitles: [],
      });

      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <TestConsumer />
        </PracticeSessionProvider>
      );

      // Trigger level up
      await user.click(screen.getByTestId('complete-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('level-up')).toHaveTextContent('yes');
      });

      // Dismiss level up
      await user.click(screen.getByTestId('dismiss-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('level-up')).toHaveTextContent('no');
      });
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
      const mockUseEducationXp = useEducationXp as jest.Mock;

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
      mockCheckForUnlocks.mockClear();
      mockAcknowledgeUnlock.mockClear();
    });

    it('calls checkForUnlocks after XP is awarded', async () => {
      const user = userEvent.setup();

      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <TestConsumer />
        </PracticeSessionProvider>
      );

      await user.click(screen.getByTestId('complete-btn'));

      await waitFor(() => {
        expect(mockCheckForUnlocks).toHaveBeenCalled();
      });
    });

    it('passes correct progress data to checkForUnlocks', async () => {
      const user = userEvent.setup();

      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <TestConsumer />
        </PracticeSessionProvider>
      );

      await user.click(screen.getByTestId('complete-btn'));

      await waitFor(() => {
        expect(mockCheckForUnlocks).toHaveBeenCalledWith(
          expect.objectContaining({
            totalXp: 600, // 500 initial + 100 earned
            currentLevel: 3,
            currentStreak: 5,
            practiceSessions: 1,
          })
        );
      });
    });

    it('increments total practice sessions on each completion', async () => {
      const user = userEvent.setup();

      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <TestConsumer />
        </PracticeSessionProvider>
      );

      // First completion
      await user.click(screen.getByTestId('complete-btn'));

      await waitFor(() => {
        expect(mockCheckForUnlocks).toHaveBeenCalledWith(
          expect.objectContaining({
            practiceSessions: 1,
          })
        );
      });

      // Second completion
      await user.click(screen.getByTestId('complete-btn'));

      await waitFor(() => {
        expect(mockCheckForUnlocks).toHaveBeenCalledWith(
          expect.objectContaining({
            practiceSessions: 2,
          })
        );
      });
    });

    it('does not count flashcard sessions as completed lessons', async () => {
      const user = userEvent.setup();

      render(
        <PracticeSessionProvider studentId="student-lc-1" lessonId="lesson-A">
          <TestConsumer />
        </PracticeSessionProvider>
      );

      await user.click(screen.getByTestId('complete-btn'));

      await waitFor(() => {
        expect(mockCheckForUnlocks).toHaveBeenCalledWith(
          expect.objectContaining({
            practiceSessions: 1,
            lessonsCompleted: 0,
            lessonsCollected: 0,
          })
        );
      });
    });

    it('counts distinct lesson IDs on lesson_completion sessions', async () => {
      try { localStorage.removeItem('education_completed_lessons_student-lc-2'); } catch { /* noop */ }

      function LessonCompletionConsumer() {
        const ctx = usePracticeSession();
        return (
          <button
            data-testid="lc-btn"
            onClick={() => ctx.completePracticeSession({ type: 'lesson_completion', masteryLevel: 'mastered' })}
          >
            Complete Lesson
          </button>
        );
      }

      const user = userEvent.setup();

      const { unmount } = render(
        <PracticeSessionProvider studentId="student-lc-2" lessonId="lesson-A">
          <LessonCompletionConsumer />
        </PracticeSessionProvider>
      );

      // Complete lesson-A twice — should count as 1 distinct lesson
      await user.click(screen.getByTestId('lc-btn'));
      await user.click(screen.getByTestId('lc-btn'));

      await waitFor(() => {
        expect(mockCheckForUnlocks).toHaveBeenLastCalledWith(
          expect.objectContaining({
            lessonsCompleted: 1,
            lessonsCollected: 1,
          })
        );
      });

      unmount();

      // Now complete a different lesson — should become 2 distinct
      render(
        <PracticeSessionProvider studentId="student-lc-2" lessonId="lesson-B">
          <LessonCompletionConsumer />
        </PracticeSessionProvider>
      );

      await user.click(screen.getByTestId('lc-btn'));

      await waitFor(() => {
        expect(mockCheckForUnlocks).toHaveBeenLastCalledWith(
          expect.objectContaining({
            lessonsCompleted: 2,
            lessonsCollected: 2,
          })
        );
      });
    });

    it('tracks total words mastered from flashcard sessions', async () => {
      const user = userEvent.setup();

      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <TestConsumer />
        </PracticeSessionProvider>
      );

      // Complete flashcard with 9 correct
      await user.click(screen.getByTestId('complete-btn'));

      await waitFor(() => {
        expect(mockCheckForUnlocks).toHaveBeenCalledWith(
          expect.objectContaining({
            wordsMastered: 9, // cardsCorrect from first session
          })
        );
      });
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
        checkForUnlocks: mockCheckForUnlocks,
        isChecking: false,
      });

      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <TestConsumer />
        </PracticeSessionProvider>
      );

      expect(screen.getByTestId('achievement-modal')).toBeInTheDocument();
    });

    it('updates level in progress data when leveling up', async () => {
      const user = userEvent.setup();

      // Configure mock to return level up
      mockAwardPracticeXp.mockResolvedValueOnce({
        totalXp: 200,
        breakdown: {},
        masteryMessage: 'Level up!',
        leveledUp: true,
        newLevel: 4,
        newTitles: ['Word Master'],
      });

      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <TestConsumer />
        </PracticeSessionProvider>
      );

      await user.click(screen.getByTestId('complete-btn'));

      await waitFor(() => {
        expect(mockCheckForUnlocks).toHaveBeenCalledWith(
          expect.objectContaining({
            currentLevel: 4, // New level from XP award
          })
        );
      });
    });

    it('does not re-trigger achievement check if XP award fails', async () => {
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

      // Should not call checkForUnlocks when award fails
      expect(mockCheckForUnlocks).not.toHaveBeenCalled();

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
