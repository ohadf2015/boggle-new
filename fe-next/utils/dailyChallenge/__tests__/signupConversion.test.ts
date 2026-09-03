// @vitest-environment happy-dom
/**
 * Signup Conversion — guest→account sync must not orphan history
 *
 * syncGuestDailyResultsToAccount() migrates a guest's local Word Hunt history
 * onto a freshly authenticated player_id by replaying each stored result
 * through POST /submit. But /submit only accepts today plus the last
 * CATCH_UP_WINDOW_DAYS (3) days — isSubmittableDate — so anything older 400s
 * and is silently skipped in the replay loop.
 *
 * The bug this pins: the old clearAllGuestDailyResults() ran unconditionally
 * on ANY success (successCount > 0) and wiped every stored day AND
 * GUEST_FINGERPRINT_KEY, even though most days for a guest with real history
 * would have failed to sync. That deletes the local copies of the unsynced
 * days AND destroys the only handle (the fingerprint) to the matching rows
 * still sitting in daily_word_hunt_attempts — the exact "silently orphaned"
 * failure mode. The fix (clearSyncedGuestDailyResults) only removes the
 * specific (date, language) keys that were confirmed synced, and never
 * touches the fingerprint.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Language } from '@/types';
import type { StoredWordHuntResult } from '../types';
import { WORD_HUNT_STORAGE_KEY, GUEST_FINGERPRINT_KEY, DAILY_STREAK_KEY, GUEST_DAILY_PLAYER_KEY } from '../constants';

const mockGetAllWordHuntResults = vi.fn();

vi.mock('../storage', () => ({
  getAllWordHuntResults: (language: Language) => mockGetAllWordHuntResults(language),
}));

import { getAllGuestDailyResults, syncGuestDailyResultsToAccount } from '../signupConversion';

function stubResult(date: string, language: Language, puzzleNumber: number): StoredWordHuntResult {
  return {
    date,
    puzzleNumber,
    completedAt: `${date}T00:00:00.000Z`,
    result: {
      puzzleNumber,
      puzzleDate: date,
      language,
      solved: true,
      attemptsUsed: 3,
      targetWord: 'WORD',
      attempts: [{ word: 'WORD', feedback: [], timestamp: 0 }],
      streakDays: 1,
      completedAt: `${date}T00:00:00.000Z`,
    },
  };
}

describe('getAllGuestDailyResults', () => {
  beforeEach(() => {
    mockGetAllWordHuntResults.mockReset();
  });

  it('combines every language storage returns', () => {
    mockGetAllWordHuntResults.mockImplementation((language: Language) =>
      language === 'en' ? [stubResult('2026-08-30', 'en', 103)] : []
    );

    expect(getAllGuestDailyResults()).toEqual([
      { result: expect.objectContaining({ puzzleDate: '2026-08-30' }), puzzleNumber: 103, puzzleDate: '2026-08-30', language: 'en' },
    ]);
  });

  it('returns an empty array when the guest has no stored results', () => {
    mockGetAllWordHuntResults.mockReturnValue([]);
    expect(getAllGuestDailyResults()).toEqual([]);
  });
});

describe('syncGuestDailyResultsToAccount', () => {
  const IN_WINDOW_DATE = '2026-08-30'; // /submit will accept this (mocked 200 below)
  const OUT_OF_WINDOW_DATE = '2026-08-01'; // older than the 3-day catch-up window (mocked 400 below)
  const inWindowKey = `${WORD_HUNT_STORAGE_KEY}_en_${IN_WINDOW_DATE}`;
  const outOfWindowKey = `${WORD_HUNT_STORAGE_KEY}_en_${OUT_OF_WINDOW_DATE}`;

  beforeEach(() => {
    mockGetAllWordHuntResults.mockReset();
    mockGetAllWordHuntResults.mockImplementation((language: Language) =>
      language === 'en'
        ? [stubResult(IN_WINDOW_DATE, 'en', 103), stubResult(OUT_OF_WINDOW_DATE, 'en', 95)]
        : []
    );

    localStorage.clear();
    localStorage.setItem(inWindowKey, JSON.stringify(stubResult(IN_WINDOW_DATE, 'en', 103)));
    localStorage.setItem(outOfWindowKey, JSON.stringify(stubResult(OUT_OF_WINDOW_DATE, 'en', 95)));
    localStorage.setItem(GUEST_FINGERPRINT_KEY, 'guest-fp-abc123');
    localStorage.setItem(DAILY_STREAK_KEY, JSON.stringify({ currentStreak: 5 }));
    localStorage.setItem(GUEST_DAILY_PLAYER_KEY, JSON.stringify({ displayName: 'WordNinja' }));

    // Default; each test below overrides this with its own fetch behavior.
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 400 } as Response)) as unknown as typeof fetch;
  });

  it('only clears the (date, language) pairs that actually synced — unsynced days and the fingerprint survive', async () => {
    // Simulate /submit: 200 for the in-window date, 400 for the out-of-window
    // one — exactly what isSubmittableDate's 3-day catch-up gate does for real.
    global.fetch = vi.fn((_url: string, opts?: RequestInit) => {
      const body = JSON.parse(String(opts?.body ?? '{}'));
      const ok = body.puzzleDate === IN_WINDOW_DATE;
      return Promise.resolve({ ok, status: ok ? 200 : 400 } as Response);
    }) as unknown as typeof fetch;

    const synced = await syncGuestDailyResultsToAccount('new-player-id', {
      display_name: 'New Player',
      username: 'newplayer',
      avatar_emoji: null,
      avatar_color: null,
      avatar_image: null,
    });

    expect(synced).toBe(1);

    // Synced day: removed.
    expect(localStorage.getItem(inWindowKey)).toBeNull();
    // Unsynced (out-of-window) day: NOT removed — still there for a future retry.
    expect(localStorage.getItem(outOfWindowKey)).not.toBeNull();
    // The fingerprint is the only handle to whatever the guest_fingerprint rows
    // still hold in the DB for the unsynced days — must survive a partial sync.
    expect(localStorage.getItem(GUEST_FINGERPRINT_KEY)).toBe('guest-fp-abc123');

    // Local-only bookkeeping (backs no DB row) is still safe to clear.
    expect(localStorage.getItem(DAILY_STREAK_KEY)).toBeNull();
    expect(localStorage.getItem(GUEST_DAILY_PLAYER_KEY)).toBeNull();
  });

  it('clears nothing at all when every submit fails', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 400 } as Response)) as unknown as typeof fetch;

    const synced = await syncGuestDailyResultsToAccount('new-player-id', {
      display_name: 'New Player',
      username: 'newplayer',
      avatar_emoji: null,
      avatar_color: null,
      avatar_image: null,
    });

    expect(synced).toBe(0);
    expect(localStorage.getItem(inWindowKey)).not.toBeNull();
    expect(localStorage.getItem(outOfWindowKey)).not.toBeNull();
    expect(localStorage.getItem(GUEST_FINGERPRINT_KEY)).toBe('guest-fp-abc123');
  });
});
