// @vitest-environment happy-dom
import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useWordHuntPuzzleInit } from '../useWordHuntPuzzleInit';

vi.mock('@/utils/dailyChallenge', async (orig) => ({
  ...(await orig<typeof import('@/utils/dailyChallenge')>()),
  getGuestFingerprint: vi.fn(async () => 'fp-1'),
  getTodaysWordHuntResult: vi.fn(() => null),
}));

describe('useWordHuntPuzzleInit when sign-in resolves mid-run', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (
      url.includes('check-played')
        ? new Response(JSON.stringify({ hasPlayed: false }), { status: 200 })
        : new Response('null', { status: 404 })
    )));
  });

  it('Given a run already started, When auth resolves, Then the run is not reloaded or counted as abandoned', async () => {
    const setPhase = vi.fn();
    const setForfeitedToday = vi.fn();
    let live = false;
    const props = {
      gameLanguage: 'en' as const, today: '2026-11-20', resetCount: 0, profileId: null, catchupDate: null,
      isPractice: false, online: true, setPhase, setPuzzleDate: vi.fn(), setPuzzleNumber: vi.fn(), setForfeitedToday,
      setStoredResult: vi.fn(), setGrid: vi.fn(), setTargetWord: vi.fn(), setMeaning: vi.fn(),
      isRunLive: () => live,
    };
    const { rerender } = renderHook((p: { isAuthenticated: boolean }) => useWordHuntPuzzleInit({ ...props, ...p }), {
      initialProps: { isAuthenticated: false },
    });
    await waitFor(() => expect(setPhase).toHaveBeenLastCalledWith('ready'));
    live = true;
    setPhase.mockClear();
    setForfeitedToday.mockClear();

    rerender({ isAuthenticated: true });
    await new Promise((r) => setTimeout(r, 50));
    expect(setPhase).not.toHaveBeenCalled();
    expect(setForfeitedToday).not.toHaveBeenCalled();
  });
});
