import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useWordWheelLoad } from '../useWordWheelLoad';

vi.mock('@/utils/dailyChallenge/guestPlayer', () => ({ getGuestFingerprint: vi.fn(async () => 'fp-1') }));
vi.mock('@/hooks/useDictionaryCache', () => ({ prewarmDictionary: vi.fn(async () => undefined) }));

describe('useWordWheelLoad re-run after the player started', () => {
  let resolveFetch: ((r: Response) => void) | null = null;

  beforeEach(() => {
    localStorage.clear();
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn(() => {
      calls += 1;
      if (calls === 1) return Promise.resolve(new Response(JSON.stringify({ hasPlayed: false }), { status: 200 }));
      return new Promise<Response>((resolve) => { resolveFetch = resolve; });
    }));
  });

  it('keeps the board when sign-in lands while the server check is in flight', async () => {
    const base = {
      language: 'en' as const, isPractice: false, catchupDate: null, authLoading: false,
      guestFingerprint: null, setGameActive: vi.fn(), catchupAdUnlockedRef: { current: false },
    };
    const { result, rerender } = renderHook((p: { auth: boolean }) => useWordWheelLoad({
      ...base, isAuthenticated: p.auth, playerId: p.auth ? 'user-1' : undefined,
    }), { initialProps: { auth: false } });

    await waitFor(() => expect(result.current.phase).toBe('ready'));
    const board = result.current.puzzle;

    rerender({ auth: true });
    await waitFor(() => expect(resolveFetch).not.toBeNull());
    act(() => result.current.enterPlaying());
    await act(async () => {
      resolveFetch!(new Response(JSON.stringify({ hasPlayed: false }), { status: 200 }));
    });

    expect(result.current.phase).toBe('playing');
    expect(result.current.puzzle).toBe(board);
  });
});
