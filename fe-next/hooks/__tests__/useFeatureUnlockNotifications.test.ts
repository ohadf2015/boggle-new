/**
 * useFeatureUnlockNotifications Hook Tests
 *
 * Tests hook that detects and displays feature unlock notifications
 */

import { renderHook } from '@testing-library/react';
import { useFeatureUnlockNotifications } from '../useFeatureUnlockNotifications';
import { useUserStats } from '../useUserStats';
import { toast } from 'react-hot-toast';

// Mock dependencies
jest.mock('../useUserStats');
jest.mock('react-hot-toast');
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: jest.fn(),
    dir: 'ltr',
  }),
}));

describe('useFeatureUnlockNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should not show notification for users with 0 games', () => {
    // GIVEN - New user with 0 games
    (useUserStats as jest.Mock).mockReturnValue({
      userStats: { totalGamesPlayed: 0 },
      isLoading: false,
    });

    // WHEN
    renderHook(() => useFeatureUnlockNotifications());

    // THEN - No toast shown
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('should not show notification for users with 4 games (below threshold)', () => {
    // GIVEN - User with 4 games (below first threshold)
    (useUserStats as jest.Mock).mockReturnValue({
      userStats: { totalGamesPlayed: 4 },
      isLoading: false,
    });

    // WHEN
    renderHook(() => useFeatureUnlockNotifications());

    // THEN - No toast shown
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('should show notification when user reaches 5 games (advanced settings unlock)', () => {
    // GIVEN - User just reached 5 games
    (useUserStats as jest.Mock).mockReturnValue({
      userStats: { totalGamesPlayed: 5 },
      isLoading: false,
    });

    // WHEN
    renderHook(() => useFeatureUnlockNotifications());

    // THEN - Toast shown for advanced settings unlock
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('features.unlocked.advancedSettings'),
      expect.any(Object)
    );
  });

  it('should show notification when user reaches 10 games (custom bot count unlock)', () => {
    // GIVEN - User just reached 10 games (had already unlocked advancedSettings)
    localStorage.setItem('feature_unlock_advancedSettings', 'true');
    (useUserStats as jest.Mock).mockReturnValue({
      userStats: { totalGamesPlayed: 10 },
      isLoading: false,
    });

    // WHEN
    renderHook(() => useFeatureUnlockNotifications());

    // THEN - Toast shown for custom bot count unlock
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('features.unlocked.customBotCount'),
      expect.any(Object)
    );
  });

  it('should NOT show notification twice for same unlock', () => {
    // GIVEN - User already saw advancedSettings unlock
    localStorage.setItem('feature_unlock_advancedSettings', 'true');
    (useUserStats as jest.Mock).mockReturnValue({
      userStats: { totalGamesPlayed: 5 },
      isLoading: false,
    });

    // WHEN
    renderHook(() => useFeatureUnlockNotifications());

    // THEN - No toast shown (already seen)
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('should not show notification while loading', () => {
    // GIVEN - Stats are still loading
    (useUserStats as jest.Mock).mockReturnValue({
      userStats: { totalGamesPlayed: 5 },
      isLoading: true,
    });

    // WHEN
    renderHook(() => useFeatureUnlockNotifications());

    // THEN - No toast shown (wait until loaded)
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('should not show notification for unauthenticated users', () => {
    // GIVEN - No user logged in
    (useUserStats as jest.Mock).mockReturnValue({
      userStats: null,
      isLoading: false,
    });

    // WHEN
    renderHook(() => useFeatureUnlockNotifications());

    // THEN - No toast shown
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('should handle multiple unlocks at once (e.g., returning user)', () => {
    // GIVEN - User returns after playing many games offline (15 games total)
    // They've never seen any unlock notifications
    (useUserStats as jest.Mock).mockReturnValue({
      userStats: { totalGamesPlayed: 15 },
      isLoading: false,
    });

    // WHEN
    renderHook(() => useFeatureUnlockNotifications());

    // THEN - Multiple toasts shown (advancedSettings, customBotCount, challengeMode)
    expect(toast.success).toHaveBeenCalledTimes(3);
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('features.unlocked.advancedSettings'),
      expect.any(Object)
    );
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('features.unlocked.customBotCount'),
      expect.any(Object)
    );
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('features.unlocked.challengeMode'),
      expect.any(Object)
    );
  });
});
