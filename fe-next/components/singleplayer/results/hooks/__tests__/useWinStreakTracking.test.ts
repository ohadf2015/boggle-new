/**
 * useWinStreakTracking Hook Tests
 *
 * Tests for the hook that tracks win streaks in competitive game modes.
 * This specifically tests the fix for the race condition where streak data
 * was read before localStorage was loaded, causing static "1 day streak" display.
 */

import { renderHook, waitFor, act } from '@testing-library/react';

// Mock useWinStreak hook directly to control isLoaded state
let mockStreakData = {
  currentStreak: 0,
  bestStreak: 0,
  totalWins: 0,
  lastWinDate: null as string | null,
  isStreakActive: false,
  streakBroken: false,
  freezesAvailable: 1,
  recoverableStreak: null as number | null,
  recoveryTimeRemaining: null as number | null,
  isLoaded: false,
};

// Create a function that computes the mock result based on current state
function computeRecordWinResult() {
  const previousStreak = mockStreakData.currentStreak;
  const alreadyWonToday = mockStreakData.lastWinDate &&
    new Date(mockStreakData.lastWinDate).toDateString() === new Date().toDateString();

  let newStreak: number;
  if (alreadyWonToday) {
    newStreak = mockStreakData.currentStreak;
  } else if (mockStreakData.isStreakActive && !mockStreakData.streakBroken) {
    newStreak = mockStreakData.currentStreak + 1;
  } else {
    newStreak = 1;
  }

  return {
    newStreak,
    bestStreak: Math.max(newStreak, mockStreakData.bestStreak),
    previousStreak,
    alreadyWonToday: !!alreadyWonToday,
  };
}

// Track what recordWin should return based on current mock state
const mockRecordWin = jest.fn().mockImplementation(computeRecordWinResult);

jest.mock('@/hooks/useWinStreak', () => ({
  useWinStreak: () => ({
    ...mockStreakData,
    recordWin: mockRecordWin,
    applyStreakFreeze: jest.fn(),
    recoverStreak: jest.fn(),
    purchaseFreeze: jest.fn(),
    getStreakEmoji: jest.fn(),
    getStreakTier: jest.fn(),
    isStreakAtRisk: false,
  }),
}));

// Import after mocking
import { useWinStreakTracking } from '../useWinStreakTracking';

/**
 * Helper to simulate localStorage being loaded with existing streak data
 */
function simulateLoadedStreak(streak: number, bestStreak?: number, lastWinDate?: string) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  mockStreakData = {
    ...mockStreakData,
    currentStreak: streak,
    bestStreak: bestStreak ?? streak,
    lastWinDate: lastWinDate ?? yesterday.toISOString(),
    totalWins: streak,
    isStreakActive: true,
    isLoaded: true,
  };
}

describe('useWinStreakTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock data to unloaded state
    mockStreakData = {
      currentStreak: 0,
      bestStreak: 0,
      totalWins: 0,
      lastWinDate: null,
      isStreakActive: false,
      streakBroken: false,
      freezesAvailable: 1,
      recoverableStreak: null,
      recoveryTimeRemaining: null,
      isLoaded: false,
    };
    // Restore mock implementation after clearAllMocks
    mockRecordWin.mockImplementation(computeRecordWinResult);
  });

  describe('streak continuation bug fix', () => {
    /**
     * This test reproduces the bug where users always see "1 day streak"
     * because the hook reads currentStreak before localStorage is loaded.
     *
     * BUG: useWinStreak initializes with DEFAULT_STREAK_DATA (currentStreak: 0)
     * and loads from localStorage in useEffect. But useWinStreakTracking
     * runs its effect before localStorage is loaded, so it always sees
     * currentStreak as 0 and computes newStreak as 1.
     *
     * FIX: useWinStreakTracking now waits for isLoaded=true before processing.
     */
    it('should correctly continue streak when user already has a 5-day streak', async () => {
      // GIVEN: User has an existing 5-day streak from yesterday
      simulateLoadedStreak(5, 5);

      // WHEN: User wins a game in solo-bots mode
      const { result } = renderHook(() =>
        useWinStreakTracking({ mode: 'solo-bots', isWinner: true })
      );

      // Wait for state to stabilize
      await waitFor(() => {
        expect(result.current.winStreakData).not.toBeNull();
      });

      // THEN: The new streak should be 6 (not 1!)
      expect(result.current.winStreakData?.currentStreak).toBe(6);
      expect(result.current.winStreakData?.previousStreak).toBe(5);
      expect(mockRecordWin).toHaveBeenCalledTimes(1);
    });

    it('should show correct milestone for reaching 7-day streak', async () => {
      // GIVEN: User has a 6-day streak
      simulateLoadedStreak(6, 6);

      // WHEN: User wins
      const { result } = renderHook(() =>
        useWinStreakTracking({ mode: 'solo-bots', isWinner: true })
      );

      await waitFor(() => {
        expect(result.current.winStreakData).not.toBeNull();
      });

      // THEN: Should reach 7-day milestone
      expect(result.current.winStreakData?.currentStreak).toBe(7);
      expect(result.current.winStreakData?.isNewMilestone).toBe(true);
    });

    it('should not process win before isLoaded is true', async () => {
      // GIVEN: Data is NOT loaded yet (isLoaded = false)
      // mockStreakData.isLoaded is already false from beforeEach

      // WHEN: Hook renders with isWinner=true
      const { result } = renderHook(() =>
        useWinStreakTracking({ mode: 'solo-bots', isWinner: true })
      );

      // THEN: Should NOT have processed the win yet
      expect(result.current.winStreakData).toBeNull();
      expect(mockRecordWin).not.toHaveBeenCalled();
    });
  });

  describe('practice mode', () => {
    it('should not track wins in practice mode', async () => {
      simulateLoadedStreak(3);

      const { result } = renderHook(() =>
        useWinStreakTracking({ mode: 'practice', isWinner: true })
      );

      // winStreakData should remain null in practice mode
      expect(result.current.winStreakData).toBeNull();
      expect(mockRecordWin).not.toHaveBeenCalled();
    });
  });

  describe('loss handling', () => {
    it('should not track losses', async () => {
      simulateLoadedStreak(3);

      const { result } = renderHook(() =>
        useWinStreakTracking({ mode: 'solo-bots', isWinner: false })
      );

      // winStreakData should remain null for losses
      expect(result.current.winStreakData).toBeNull();
      expect(mockRecordWin).not.toHaveBeenCalled();
    });
  });

  describe('same-day wins', () => {
    it('should not increment streak for multiple wins on same day', async () => {
      // GIVEN: User already won today with a 5-day streak
      const today = new Date().toISOString();
      simulateLoadedStreak(5, 5, today);

      // WHEN: User wins again today
      const { result } = renderHook(() =>
        useWinStreakTracking({ mode: 'solo-bots', isWinner: true })
      );

      await waitFor(() => {
        expect(result.current.winStreakData).not.toBeNull();
      });

      // THEN: Streak should stay at 5, not increment
      expect(result.current.winStreakData?.currentStreak).toBe(5);
      expect(result.current.winStreakData?.isNewMilestone).toBe(false);
    });
  });

  describe('new streak', () => {
    it('should start streak at 1 when no previous streak exists', async () => {
      // GIVEN: No previous streak (isLoaded but currentStreak=0)
      mockStreakData = {
        ...mockStreakData,
        currentStreak: 0,
        bestStreak: 0,
        lastWinDate: null,
        isStreakActive: false,
        isLoaded: true,
      };

      // WHEN: User wins
      const { result } = renderHook(() =>
        useWinStreakTracking({ mode: 'solo-bots', isWinner: true })
      );

      await waitFor(() => {
        expect(result.current.winStreakData).not.toBeNull();
      });

      // THEN: Should start at 1
      expect(result.current.winStreakData?.currentStreak).toBe(1);
      expect(result.current.winStreakData?.previousStreak).toBe(0);
    });
  });
});
