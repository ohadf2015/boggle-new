import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils';
import { dailyBestKey } from '@/lib/wordTower/dailyBest';
import { utcDateKey } from '@/lib/wordTower/dailySeed';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false }),
}));

import { useDailyPlayedStatus } from '../useDailyPlayedStatus';

describe('useDailyPlayedStatus — guest on the client', () => {
  it('given this device finished Word Hunt today, reports it on the first committed render', () => {
    localStorage.setItem(`wh_played_${getDailyChallengeDate()}`, '1');
    const { result } = renderHook(() => useDailyPlayedStatus());
    expect(result.current.today.wordHunt).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('given this device climbed today\'s daily Word Tower, reports Word Tower as played', () => {
    localStorage.clear();
    localStorage.setItem(dailyBestKey(utcDateKey()), '12');
    const { result } = renderHook(() => useDailyPlayedStatus());
    expect(result.current.today.wordTower).toBe(true);
  });

  it('given no tower climb today (or a stale zero), Word Tower is not played', () => {
    localStorage.clear();
    localStorage.setItem(dailyBestKey(utcDateKey()), '0');
    const { result } = renderHook(() => useDailyPlayedStatus());
    expect(result.current.today.wordTower).toBe(false);
  });
});
