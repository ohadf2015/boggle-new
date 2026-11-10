import { describe, it, expect, beforeEach } from 'vitest';
import { clearGuestData } from '@/utils/guestManager';
import { CARRYOVER_GUEST_SESSION_KEY } from '@/utils/dailyChallenge/constants';

beforeEach(() => {
  window.localStorage.clear();
});

describe('clearGuestData', () => {
  it('Given a guest session at sign-in, keeps its id for the streak carry-over while clearing the session', () => {
    window.localStorage.setItem('boggle_guest_session_id', 'gs1');
    clearGuestData();
    expect(window.localStorage.getItem('boggle_guest_session_id')).toBeNull();
    expect(window.localStorage.getItem(CARRYOVER_GUEST_SESSION_KEY)).toBe('gs1');
  });
});
