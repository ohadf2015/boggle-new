import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/utils/dailyChallenge/guestPlayer', () => ({ getGuestFingerprint: async () => 'fp-1' }));
vi.mock('@/hooks/useDictionaryCache', () => ({ prewarmDictionary: async () => undefined }));

import { useWordWheelLoad } from '../useWordWheelLoad';
import { saveWordWheelResult, getDailyChallengeDate } from '@/utils/dailyChallenge';
import { startWordWheelRun, recordWordWheelRunProgress, markWordWheelResultSubmitted } from '@/utils/dailyChallenge/wordWheelRun';

const today = getDailyChallengeDate();
const opts = (over: Record<string, unknown> = {}) => ({
  language: 'en' as const, isPractice: false, catchupDate: null, isAuthenticated: false, playerId: undefined,
  guestFingerprint: 'fp-1', setGameActive: vi.fn(), catchupAdUnlockedRef: { current: false }, ...over,
});

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ hasPlayed: false }) }));
});

describe('useWordWheelLoad resume paths', () => {
  it('a run started on this device and left unfinished settles instead of dealing a fresh board', async () => {
    startWordWheelRun('en', today);
    recordWordWheelRunProgress('en', today, { wordsFound: ['CAT'], score: 12 });
    const onUnfinishedRun = vi.fn(() => ({ wordsFound: ['CAT'], score: 12, timeSeconds: 0 }));
    const { result } = renderHook(() => useWordWheelLoad(opts({ onUnfinishedRun })));
    await waitFor(() => expect(result.current.phase).toBe('already-played'));
    expect(onUnfinishedRun).toHaveBeenCalledWith(
      expect.objectContaining({ wordsFound: ['CAT'], score: 12 }),
      expect.objectContaining({ puzzleDate: today }),
    );
    expect(result.current.gameResult?.wordsFound).toEqual(['CAT']);
  });

  it('a stored result the server never acknowledged is handed back for a retry', async () => {
    saveWordWheelResult({
      puzzleNumber: 1, puzzleDate: today, language: 'en', centerLetter: 'A', wordsFound: ['CAT'],
      totalPossible: 0, score: 12, timeSeconds: 120, streakDays: 0, completedAt: '',
    });
    const onUnsent = vi.fn();
    const { result } = renderHook(() => useWordWheelLoad(opts({ onUnsent })));
    await waitFor(() => expect(result.current.phase).toBe('already-played'));
    expect(onUnsent).toHaveBeenCalledTimes(1);
  });

  it('an acknowledged result is not retried', async () => {
    saveWordWheelResult({
      puzzleNumber: 1, puzzleDate: today, language: 'en', centerLetter: 'A', wordsFound: ['CAT'],
      totalPossible: 0, score: 12, timeSeconds: 120, streakDays: 0, completedAt: '',
    });
    markWordWheelResultSubmitted('en', today);
    const onUnsent = vi.fn();
    const { result } = renderHook(() => useWordWheelLoad(opts({ onUnsent })));
    await waitFor(() => expect(result.current.phase).toBe('already-played'));
    expect(onUnsent).not.toHaveBeenCalled();
  });
});

describe('bonus intro on the first bonus day', () => {
  const pastResult = {
    puzzleNumber: 1, puzzleDate: '2026-10-20', language: 'en' as const, centerLetter: 'A', wordsFound: ['CAT'],
    totalPossible: 0, score: 12, timeSeconds: 120, streakDays: 0, completedAt: '',
  };
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-05T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('a returning player sees the ready card once so combo and gold are explained', async () => {
    saveWordWheelResult(pastResult, { submitted: true });
    const { result } = renderHook(() => useWordWheelLoad(opts()));
    await waitFor(() => expect(result.current.phase).toBe('ready'));
  });

  it('after the intro is seen, a returning player skips straight in again', async () => {
    saveWordWheelResult(pastResult, { submitted: true });
    localStorage.setItem('lc:wheel-bonus-intro-seen', '1');
    const { result } = renderHook(() => useWordWheelLoad(opts()));
    await waitFor(() => expect(result.current.phase).toBe('playing'));
  });

  it('the first-game bridge still lands a first-timer straight in the game', async () => {
    const { result } = renderHook(() => useWordWheelLoad(opts({ autoStart: true })));
    await waitFor(() => expect(result.current.phase).toBe('playing'));
  });
});
