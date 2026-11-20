import { describe, it, expect, beforeEach } from 'vitest';
import { clearStoredProfile, getStoredUsername } from '@/utils/profileStorage';
import { ensureGuestDisplayName, getGuestName, getGuestStats, saveGuestNameEverywhere } from '@/utils/guestManager';
import { returningName } from '../useReturningStudent';
import { isDefaultPlayerName } from '@/utils/defaultPlayerNames';

const TEACHER = 'Ms Stadler';

describe('clearing the stored profile before a student joins on the teacher device', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('leaves no name for the next page load to bring back', () => {
    saveGuestNameEverywhere(TEACHER);

    clearStoredProfile();
    // Every page load runs this for a signed-out visitor (presence heartbeat).
    const nextName = ensureGuestDisplayName('en');

    expect(nextName).not.toBe(TEACHER);
    expect(getStoredUsername()).not.toBe(TEACHER);
    expect(getGuestName()).not.toBe(TEACHER);
    expect(returningName(null, getStoredUsername())).toBeNull();
  });

  it('forgets a name kept only inside the guest stats', () => {
    localStorage.setItem(
      'boggle_guest_stats',
      JSON.stringify({ ...getGuestStats(), games: 3, guestName: TEACHER }),
    );

    clearStoredProfile();
    ensureGuestDisplayName('en');

    expect(getStoredUsername()).not.toBe(TEACHER);
    expect(getGuestStats().games).toBe(3);
    expect(returningName(null, getStoredUsername())).toBeNull();
  });

  it('forgets the name on the daily guest player', () => {
    saveGuestNameEverywhere(TEACHER);

    clearStoredProfile();

    expect(localStorage.getItem('lexiclash_guest_daily_player') ?? '').not.toContain(TEACHER);
  });

  it('replaces it with a generated name that the join screen does not offer back', () => {
    saveGuestNameEverywhere(TEACHER);

    clearStoredProfile();
    const generated = ensureGuestDisplayName('en');

    expect(generated === '' || isDefaultPlayerName(generated)).toBe(true);
  });
});
