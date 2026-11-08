/**
 * The 500-coin "recover your broken streak" path was never mounted anywhere.
 * It is gone: a broken streak simply resets, and the hook never spends coins.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const spendCoins = vi.fn(() => true);
vi.mock('@/utils/coinManager', () => ({ spendCoins: (...a: unknown[]) => spendCoins(...(a as [])), canAfford: () => true }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, isAuthenticated: false }) }));
vi.mock('@/utils/dailyChallenge/streakTelemetry', () => ({ emitStreakLifecycle: vi.fn() }));

import { useWinStreak } from '../useWinStreak';

describe('useWinStreak — no paid streak recovery', () => {
  beforeEach(() => {
    localStorage.clear();
    spendCoins.mockClear();
  });

  it('Given a streak broken 3 days ago, When the hook loads, Then it resets to 0 and offers no coin recovery', () => {
    const old = new Date();
    old.setDate(old.getDate() - 3);
    localStorage.setItem('lexiclash_win_streak', '6');
    localStorage.setItem('lexiclash_streak_date', old.toISOString());

    const { result } = renderHook(() => useWinStreak());

    expect(result.current.currentStreak).toBe(0);
    expect('recoverStreak' in result.current).toBe(false);
    expect('recoverableStreak' in result.current).toBe(false);
    expect(localStorage.getItem('lexiclash_broken_streak')).toBeNull();
    expect(spendCoins).not.toHaveBeenCalled();
  });
});
