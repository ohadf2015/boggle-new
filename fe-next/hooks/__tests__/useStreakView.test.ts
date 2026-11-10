import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStreakView } from '../useStreakView';
import { useAccountStreak } from '../useAccountStreak';

let mockAuth = { isAuthenticated: false, loading: false };
let mockChest: Record<string, unknown> = {};
let mockRetention: Record<string, unknown> = {};
const refresh = vi.fn();
let mockSession = true;

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockAuth }));
vi.mock('@/hooks/useWeeklyChest', () => ({ useWeeklyChest: () => mockChest }));
vi.mock('@/hooks/useRetentionStreak', () => ({ useRetentionStreak: () => mockRetention }));
vi.mock('@/utils/onboardingStorage', () => ({ hasSupabaseSession: () => mockSession }));

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-12T12:00:00Z'));
});
afterAll(() => vi.useRealTimers());

const serverBlock = {
  current: 7,
  playedToday: false,
  atRisk: true,
  week: [],
  freezeSaved: null,
  milestone: { claimable: { days: 7, coins: 60 }, next: { days: 14, coins: 120, remaining: 7, from: 7 } },
};

describe('useStreakView', () => {
  beforeEach(() => {
    mockAuth = { isAuthenticated: false, loading: false };
    mockChest = { loading: false, currentStreak: 0, completedDates: [], cycleStart: '', freezesAvailable: 0, streak: null, refresh };
    mockRetention = { streak: 0, best: 0, freezeAvailable: false, lastPlayedDate: null };
    mockSession = true;
  });

  it('Given auth still resolving, is loading even when this device holds a guest streak (no guest flash)', () => {
    mockAuth = { isAuthenticated: false, loading: true };
    mockRetention = { streak: 5, best: 5, freezeAvailable: true, lastPlayedDate: '2026-11-11' };
    const { result } = renderHook(() => useStreakView());
    expect(result.current.loading).toBe(true);
    expect(result.current.current).toBe(0);
  });

  it('Given auth deferred on the landing and no saved session on this device, shows the guest streak (no endless skeleton)', () => {
    mockAuth = { isAuthenticated: false, loading: true };
    mockSession = false;
    mockRetention = { streak: 5, best: 5, freezeAvailable: true, lastPlayedDate: '2026-11-11' };
    const { result } = renderHook(() => useStreakView());
    expect(result.current).toMatchObject({ loading: false, isGuest: true, current: 5, atRisk: true });
  });

  it('Given a guest who just signed in, stays loading until the account answers instead of showing the device count', () => {
    mockAuth = { isAuthenticated: true, loading: false };
    mockChest = { ...mockChest, loading: true };
    mockRetention = { streak: 5, best: 5, freezeAvailable: true, lastPlayedDate: '2026-11-11' };
    const { result } = renderHook(() => useStreakView());
    expect(result.current).toMatchObject({ loading: true, current: 0, isGuest: false });
  });

  it('Given the sign-in flip before the first account answer arrives, stays loading instead of showing 0', () => {
    mockAuth = { isAuthenticated: true, loading: false };
    mockChest = { ...mockChest, loading: false, awaitingFirstLoad: true };
    mockRetention = { streak: 6, best: 6, freezeAvailable: true, lastPlayedDate: '2026-11-11' };
    const { result } = renderHook(() => useStreakView());
    expect(result.current).toMatchObject({ loading: true, current: 0, isGuest: false });
  });

  it('Given the account answered, shows the server streak, risk, freezes and milestone', () => {
    mockAuth = { isAuthenticated: true, loading: false };
    mockChest = { ...mockChest, currentStreak: 7, freezesAvailable: 1, streak: serverBlock };
    const { result } = renderHook(() => useStreakView());
    expect(result.current).toMatchObject({
      loading: false, current: 7, atRisk: true, playedToday: false, freezes: 1,
      milestone: serverBlock.milestone, isGuest: false,
    });
  });

  it('Given an older server without the streak block, falls back to the chest numbers and hides milestones', () => {
    mockAuth = { isAuthenticated: true, loading: false };
    mockChest = { ...mockChest, currentStreak: 2, completedDates: ['2026-11-11', '2026-11-12'], cycleStart: '2026-11-09' };
    const { result } = renderHook(() => useStreakView());
    expect(result.current).toMatchObject({ current: 2, playedToday: true, atRisk: false, milestone: null });
    expect(result.current.week.find((d) => d.isToday)?.state).toBe('played');
  });

  it('Given a guest who played yesterday, shows the device streak at risk with a next goal but nothing to claim', () => {
    mockRetention = { streak: 3, best: 3, freezeAvailable: true, lastPlayedDate: '2026-11-11' };
    const { result } = renderHook(() => useStreakView());
    expect(result.current).toMatchObject({ loading: false, isGuest: true, current: 3, atRisk: true, freezes: 0 });
    expect(result.current.milestone).toEqual({ claimable: null, next: { days: 7, coins: 60, remaining: 4, from: 3 } });
    expect(result.current.week.filter((d) => d.state === 'played').map((d) => d.date)).toEqual(['2026-11-09', '2026-11-10', '2026-11-11']);
  });

  it('useAccountStreak reads the same numbers', () => {
    mockAuth = { isAuthenticated: true, loading: false };
    mockChest = { ...mockChest, currentStreak: 7, freezesAvailable: 1, streak: serverBlock };
    const { result } = renderHook(() => [useStreakView(), useAccountStreak()] as const);
    expect(result.current[1]).toEqual({ streak: result.current[0].current, loading: false, freezes: 1, isGuest: false });
  });
});
