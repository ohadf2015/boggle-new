import { describe, it, expect, vi, beforeEach } from 'vitest';

const getSession = vi.fn();
vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({ auth: { getSession } }) }));
vi.mock('@/utils/dailyChallenge/guestPlayer', () => ({
  getGuestFingerprint: async () => 'fp-1',
  getGuestDailyPlayer: async () => ({ displayName: 'Guest', avatarEmoji: '🎯', avatarColor: '#000' }),
}));

import { submitWordWheelDailyResult } from '../submitWordWheelDailyResult';
import { saveWordWheelResult, getWordWheelResultForDate } from '@/utils/dailyChallenge/storage';

const DATE = '2026-11-05';
const args = (over: Record<string, unknown> = {}) => ({
  result: { wordsFound: ['CAT'], score: 12, timeSeconds: 120 },
  date: DATE, puzzleNumber: 1, language: 'en' as const, centerLetter: 'A',
  isAuthenticated: true, profile: { id: 'p1' }, guestFingerprint: null, isCatchup: false, streakDays: 0,
  onReconciled: vi.fn(), onSettled: vi.fn(), ...over,
});

beforeEach(() => {
  localStorage.clear();
  getSession.mockReset();
  saveWordWheelResult({
    puzzleNumber: 1, puzzleDate: DATE, language: 'en', centerLetter: 'A', wordsFound: ['CAT'],
    totalPossible: 0, score: 12, timeSeconds: 120, streakDays: 0, completedAt: '',
  });
});

describe('submitWordWheelDailyResult', () => {
  it('sends the session token as a Bearer header when signed in', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok-1' } } });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', fetchMock);
    await submitWordWheelDailyResult(args());
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok-1');
  });

  it('omits the header when the session lookup fails', async () => {
    getSession.mockRejectedValue(new Error('no storage'));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', fetchMock);
    await submitWordWheelDailyResult(args());
    expect((fetchMock.mock.calls[0][1].headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('marks the stored result submitted only after the server accepts it', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }));
    await submitWordWheelDailyResult(args());
    expect(getWordWheelResultForDate('en', DATE)?.submittedToServer).toBe(false);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) }));
    await submitWordWheelDailyResult(args());
    expect(getWordWheelResultForDate('en', DATE)?.submittedToServer).toBe(true);
  });

  it('stops retrying a submit the server refuses outright', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({}) }));
    await submitWordWheelDailyResult(args());
    expect(getWordWheelResultForDate('en', DATE)?.submittedToServer).toBe(true);
  });

  it('keeps it unsubmitted when the network throws', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await submitWordWheelDailyResult(args());
    expect(getWordWheelResultForDate('en', DATE)?.submittedToServer).toBe(false);
  });
});
