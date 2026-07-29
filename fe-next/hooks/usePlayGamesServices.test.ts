/**
 * Test: usePlayGamesServices hook
 *
 * Thin React glue over utils/nativePGS. Verifies it reflects availability
 * after lazy init and that its actions delegate to the bridge.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { usePlayGamesServices } from './usePlayGamesServices';
import * as pgs from '@/utils/nativePGS';

vi.mock('@/utils/nativePGS', () => ({
  initializePlayGames: vi.fn(),
  signInPlayGames: vi.fn(),
  submitLeaderboardScore: vi.fn(),
  unlockAchievement: vi.fn(),
  incrementAchievement: vi.fn(),
  showLeaderboard: vi.fn(),
  showAchievements: vi.fn(),
}));

describe('usePlayGamesServices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (pgs.initializePlayGames as jest.Mock).mockResolvedValue(true);
  });

  it('reports available=false until init resolves, then true on Android', async () => {
    // GIVEN: init resolves true (Android)
    const { result } = renderHook(() => usePlayGamesServices());
    // THEN: initially false, flips true after lazy init
    expect(result.current.available).toBe(false);
    await waitFor(() => expect(result.current.available).toBe(true));
    expect(pgs.initializePlayGames).toHaveBeenCalledTimes(1);
  });

  it('stays unavailable when init resolves false (web/iOS)', async () => {
    (pgs.initializePlayGames as jest.Mock).mockResolvedValue(false);
    const { result } = renderHook(() => usePlayGamesServices());
    await waitFor(() => expect(pgs.initializePlayGames).toHaveBeenCalled());
    expect(result.current.available).toBe(false);
  });

  it('delegates actions to the bridge', async () => {
    const { result } = renderHook(() => usePlayGamesServices());
    await waitFor(() => expect(result.current.available).toBe(true));

    await result.current.submitScore('lb_words', 99);
    await result.current.unlockAchievement('ach_x');
    expect(pgs.submitLeaderboardScore).toHaveBeenCalledWith('lb_words', 99);
    expect(pgs.unlockAchievement).toHaveBeenCalledWith('ach_x');
  });
});
