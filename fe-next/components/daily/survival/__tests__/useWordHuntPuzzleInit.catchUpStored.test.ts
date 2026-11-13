import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useWordHuntPuzzleInit } from '../useWordHuntPuzzleInit';

vi.mock('@/utils/dailyChallenge', async (orig) => ({
  ...(await orig<typeof import('@/utils/dailyChallenge')>()),
  getGuestFingerprint: vi.fn(async () => 'fp-1'),
}));

describe('useWordHuntPuzzleInit catch-up day already played on this device', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ hasPlayed: false }), { status: 200 })));
  });

  it('Given a stored result for the catch-up date, Then it opens that result instead of a fresh game', async () => {
    const stored = { date: '2026-11-11', puzzleNumber: 317, result: { attemptsUsed: 3, solved: true }, completedAt: 'x' };
    localStorage.setItem('lexiclash_word_hunt_en_2026-11-11', JSON.stringify(stored));
    const setPhase = vi.fn();
    const setStoredResult = vi.fn();
    renderHook(() => useWordHuntPuzzleInit({
      gameLanguage: 'en', today: '2026-11-13', wasReset: false, isAuthenticated: false, profileId: null,
      catchupDate: '2026-11-11', isPractice: false, online: true, setPhase, setPuzzleDate: vi.fn(),
      setPuzzleNumber: vi.fn(), setForfeitedToday: vi.fn(), setStoredResult, setGrid: vi.fn(),
      setTargetWord: vi.fn(), setMeaning: vi.fn(),
    }));
    await waitFor(() => expect(setPhase).toHaveBeenLastCalledWith('already-played'));
    expect(setStoredResult).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-11-11', puzzleNumber: 317 }));
  });
});
