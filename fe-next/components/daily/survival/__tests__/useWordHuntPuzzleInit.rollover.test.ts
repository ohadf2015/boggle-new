import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useWordHuntPuzzleInit } from '../useWordHuntPuzzleInit';

vi.mock('@/utils/dailyChallenge', async (orig) => ({
  ...(await orig<typeof import('@/utils/dailyChallenge')>()),
  getGuestFingerprint: vi.fn(async () => 'fp-1'),
  getTodaysWordHuntResult: vi.fn(() => null),
}));

describe('useWordHuntPuzzleInit day change', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (
      url.includes('check-played')
        ? new Response(JSON.stringify({ hasPlayed: false }), { status: 200 })
        : new Response('null', { status: 404 })
    )));
  });

  it('loads the new day when today moves on', async () => {
    const setPuzzleDate = vi.fn();
    const setPhase = vi.fn();
    const props = {
      gameLanguage: 'he' as const, wasReset: false, isAuthenticated: false, profileId: null, catchupDate: null,
      isPractice: false, online: true, setPhase, setPuzzleDate, setPuzzleNumber: vi.fn(), setForfeitedToday: vi.fn(),
      setStoredResult: vi.fn(), setGrid: vi.fn(), setTargetWord: vi.fn(), setMeaning: vi.fn(),
    };
    const { rerender } = renderHook((p: { today: string }) => useWordHuntPuzzleInit({ ...props, today: p.today }), {
      initialProps: { today: '2026-11-12' },
    });
    await waitFor(() => expect(setPuzzleDate).toHaveBeenLastCalledWith('2026-11-12'));

    rerender({ today: '2026-11-13' });
    await waitFor(() => expect(setPuzzleDate).toHaveBeenLastCalledWith('2026-11-13'));
    await waitFor(() => expect(setPhase).toHaveBeenLastCalledWith('ready'));
  });
});
