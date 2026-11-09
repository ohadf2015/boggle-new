import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useWordWheelLoad } from '../useWordWheelLoad';
import { saveWordWheelResult } from '@/utils/dailyChallenge';

vi.mock('@/utils/dailyChallenge/guestPlayer', () => ({ getGuestFingerprint: vi.fn(async () => 'fp-1') }));
vi.mock('@/hooks/useDictionaryCache', () => ({ prewarmDictionary: vi.fn(async () => undefined) }));

const base = {
  language: 'he' as const, isPractice: false, catchupDate: null, authLoading: false, isAuthenticated: false,
  playerId: undefined, guestFingerprint: null, setGameActive: vi.fn(), catchupAdUnlockedRef: { current: false },
};

function comeBack() {
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
}

describe('useWordWheelLoad day rollover', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-12T21:00:00Z'));
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ hasPlayed: false }), { status: 200 })));
  });
  afterEach(() => { vi.useRealTimers(); });

  it("shows the new day's wheel when a player who finished yesterday comes back", async () => {
    saveWordWheelResult({
      puzzleNumber: 1, puzzleDate: '2026-11-12', language: 'he', centerLetter: 'א', wordsFound: ['אבא'],
      totalPossible: 0, score: 3, timeSeconds: 60, streakDays: 1, completedAt: '2026-11-12T20:00:00Z',
    }, { submitted: true });
    const { result } = renderHook(() => useWordWheelLoad(base));
    await waitFor(() => expect(result.current.phase).toBe('already-played'));

    vi.setSystemTime(new Date('2026-11-13T06:00:00Z'));
    comeBack();

    await waitFor(() => expect(result.current.puzzle?.puzzleDate).toBe('2026-11-13'));
    expect(['ready', 'playing']).toContain(result.current.phase);
  });

  it('keeps the board in play when midnight passes mid-run', async () => {
    const { result } = renderHook(() => useWordWheelLoad(base));
    await waitFor(() => expect(result.current.puzzle?.puzzleDate).toBe('2026-11-12'));
    act(() => result.current.enterPlaying());
    const board = result.current.puzzle;

    vi.setSystemTime(new Date('2026-11-13T00:00:05Z'));
    comeBack();
    await act(async () => { await Promise.resolve(); });

    expect(result.current.phase).toBe('playing');
    expect(result.current.puzzle).toBe(board);
  });
});
