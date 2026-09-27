import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils';

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
});
