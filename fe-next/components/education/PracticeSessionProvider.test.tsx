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
const mockAwardPracticeXp = jest.fn();
const mockAcknowledgePersistence = jest.fn();
const mockCheckForUnlocks = jest.fn();
const mockAcknowledgeUnlock = jest.fn();

// Mock Supabase
const mockSupabaseUpsert = jest.fn().mockResolvedValue({ data: null, error: null });
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      upsert: mockSupabaseUpsert,
    })),
  },
}));

// Mock useEducationXp hook
jest.mock('@/hooks/useEducationXp', () => ({
  __esModule: true,
  default: jest.fn(() => ({
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
  useEducationXp: jest.fn(() => ({
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
jest.mock('@/hooks/useAchievementUnlock', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    pendingUnlocks: [],
    currentUnlock: null,
    acknowledgeUnlock: mockAcknowledgeUnlock,
    checkForUnlocks: mockCheckForUnlocks,
    isChecking: false,
  })),
}));

// Mock AchievementUnlockModal component
jest.mock('./AchievementUnlockModal', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="achievement-modal">Achievement Modal</div>),
}));

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: jest.fn(() => ({
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
    jest.clearAllMocks();
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

    it('calls Supabase to persist XP on session complete', async () => {
      const user = userEvent.setup();

      render(
        <PracticeSessionProvider studentId="student-1" lessonId="lesson-1">
          <TestConsumer />
        </PracticeSessionProvider>
      );

      await user.click(screen.getByTestId('complete-btn'));

      await waitFor(() => {
        expect(mockSupabaseUpsert).toHaveBeenCalled();
      });
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
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

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
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

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

    it('renders AchievementUnlockModal', () => {
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
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

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
});
