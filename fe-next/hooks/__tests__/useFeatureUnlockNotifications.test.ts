/**
 * useFeatureUnlockNotifications Hook Tests
 *
 * Tests hook that detects and displays feature unlock notifications
 */

import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFeatureUnlockNotifications } from '../useFeatureUnlockNotifications';
import { useUserStats } from '../useUserStats';
import { toast } from 'react-hot-toast';

// Mock dependencies
vi.mock('../useUserStats');
vi.mock('react-hot-toast');
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
    dir: 'ltr',
  }),
}));

describe('useFeatureUnlockNotifications', () => {
  const storageBackend: Record<string, string> = {};
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(storageBackend).forEach(k => delete storageBackend[k]);
    (localStorage.getItem as any).mockImplementation((key: string) => storageBackend[key] ?? null);
    (localStorage.setItem as any).mockImplementation((key: string, value: string) => { storageBackend[key] = value; });
    (localStorage.clear as any).mockImplementation(() => { Object.keys(storageBackend).forEach(k => delete storageBackend[k]); });
  });

  it('should not show notification for users with 0 games', () => {
    // GIVEN - New user with 0 games
    (useUserStats as any).mockReturnValue({
      userStats: { totalGamesPlayed: 0 },
      isLoading: false,
    });

    // WHEN
    renderHook(() => useFeatureUnlockNotifications());

    // THEN - No toast shown
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('should not show notification for users with 2 games (below modeRoster threshold)', () => {
    // GIVEN - User with 2 games (below modeRoster=3 threshold)
    (useUserStats as any).mockReturnValue({
      userStats: { totalGamesPlayed: 2 },
      isLoading: false,
    });

    // WHEN
    renderHook(() => useFeatureUnlockNotifications());

    // THEN - No toast shown
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('should celebrate the modeRoster unlock at 3 games (mode-reveal threshold)', () => {
    // GIVEN - Player just crossed 3 games — all home-screen modes now visible
    (useUserStats as any).mockReturnValue({
      userStats: { totalGamesPlayed: 3 },
      isLoading: false,
    });

    // WHEN
    renderHook(() => useFeatureUnlockNotifications());

    // THEN
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('singlePlayer.features.unlocked.modeRoster'),
      expect.any(Object)
    );
    expect(localStorage.getItem('feature_unlock_modeRoster')).toBe('true');
  });

  it('should show notification when user reaches 5 games (advanced settings unlock)', () => {
    // GIVEN - User just reached 5 games
    (useUserStats as any).mockReturnValue({
      userStats: { totalGamesPlayed: 5 },
      isLoading: false,
    });

    // WHEN
    renderHook(() => useFeatureUnlockNotifications());

    // THEN - Toast shown for advanced settings unlock
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('singlePlayer.features.unlocked.advancedSettings'),
      expect.any(Object)
    );
  });

  it('should show notification when user reaches 10 games (custom bot count unlock)', () => {
    // GIVEN - User just reached 10 games (had already unlocked advancedSettings)
    localStorage.setItem('feature_unlock_advancedSettings', 'true');
    (useUserStats as any).mockReturnValue({
      userStats: { totalGamesPlayed: 10 },
      isLoading: false,
    });

    // WHEN
    renderHook(() => useFeatureUnlockNotifications());

    // THEN - Toast shown for custom bot count unlock
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('singlePlayer.features.unlocked.customBotCount'),
      expect.any(Object)
    );
  });

  it('should NOT show notification twice for same unlock', () => {
    // GIVEN - User already saw both unlocks they've crossed at 5 games
    // (modeRoster at 3, advancedSettings at 5)
    localStorage.setItem('feature_unlock_modeRoster', 'true');
    localStorage.setItem('feature_unlock_advancedSettings', 'true');
    (useUserStats as any).mockReturnValue({
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
    (useUserStats as any).mockReturnValue({
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
    (useUserStats as any).mockReturnValue({
      userStats: null,
      isLoading: false,
    });

    // WHEN
    renderHook(() => useFeatureUnlockNotifications());

    // THEN - No toast shown
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('should only show the highest-threshold unlock when multiple are new (e.g., returning user)', () => {
    // GIVEN - User returns after playing many games offline (15 games total)
    // They've never seen any unlock notifications
    (useUserStats as any).mockReturnValue({
      userStats: { totalGamesPlayed: 15 },
      isLoading: false,
    });

    // WHEN
    renderHook(() => useFeatureUnlockNotifications());

    // THEN - Only ONE toast shown (the highest threshold: challengeMode at 15 games)
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('singlePlayer.features.unlocked.challengeMode'),
      expect.any(Object)
    );

    // But all lower unlocks are still marked as seen in localStorage
    expect(localStorage.getItem('feature_unlock_advancedSettings')).toBe('true');
    expect(localStorage.getItem('feature_unlock_customBotCount')).toBe('true');
    expect(localStorage.getItem('feature_unlock_challengeMode')).toBe('true');
  });
});
