import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAccountStreak } from '../useAccountStreak';

let mockAuth = { isAuthenticated: false, loading: false };
let mockChest: { loading: boolean; currentStreak: number; cycleStart: string; freezesAvailable?: number } = { loading: false, currentStreak: 0, cycleStart: '' };
let mockRetention = { streak: 0, best: 0, freezeAvailable: false };

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('@/hooks/useWeeklyChest', () => ({
  useWeeklyChest: () => mockChest,
}));

vi.mock('@/hooks/useRetentionStreak', () => ({
  useRetentionStreak: () => mockRetention,
}));

vi.mock('@/utils/onboardingStorage', () => ({ hasSupabaseSession: () => true }));

describe('useAccountStreak', () => {
  beforeEach(() => {
    mockAuth = { isAuthenticated: false, loading: false };
    mockChest = { loading: false, currentStreak: 0, cycleStart: '' };
    mockRetention = { streak: 0, best: 0, freezeAvailable: false };
  });

  it('falls back to the device-local retention streak for a guest', () => {
    mockAuth = { isAuthenticated: false, loading: false };
    mockRetention = { streak: 3, best: 5, freezeAvailable: false };
    mockChest = { loading: false, currentStreak: 99, cycleStart: '2026-09-15' };

    const { result } = renderHook(() => useAccountStreak());
    expect(result.current).toEqual({ streak: 3, loading: false, freezes: 0, isGuest: true });
  });

  it('shows the server/account streak for a signed-in player, NOT the local device value', () => {
    mockAuth = { isAuthenticated: true, loading: false };
    mockRetention = { streak: 3, best: 5, freezeAvailable: false };
    mockChest = { loading: false, currentStreak: 1, cycleStart: '2026-09-15' };

    const { result } = renderHook(() => useAccountStreak());
    expect(result.current).toEqual({ streak: 1, loading: false, freezes: 0, isGuest: false });
  });

  it('surfaces the banked streak freezes for a signed-in player', () => {
    mockAuth = { isAuthenticated: true, loading: false };
    mockChest = { loading: false, currentStreak: 4, cycleStart: '2026-11-09', freezesAvailable: 2 };

    const { result } = renderHook(() => useAccountStreak());
    expect(result.current.freezes).toBe(2);
  });

  it('reports loading (not a guessed number) while the account streak is still resolving', () => {
    mockAuth = { isAuthenticated: true, loading: false };
    mockChest = { loading: true, currentStreak: 0, cycleStart: '' };

    const { result } = renderHook(() => useAccountStreak());
    expect(result.current.loading).toBe(true);
  });

  it('reports loading while a saved session is still being restored', () => {
    mockAuth = { isAuthenticated: false, loading: true };

    const { result } = renderHook(() => useAccountStreak());
    expect(result.current.loading).toBe(true);
  });
});
