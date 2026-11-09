import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toRushRows, useRushBoard } from '../useRushBoard';

const auth = { isAuthenticated: false, loading: false };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
const getWithAuth = vi.fn();
vi.mock('@/utils/authFetch', () => ({ getWithAuth: (url: string) => getWithAuth(url) }));
vi.mock('@/utils/guestManager', () => ({ getGuestFingerprint: () => 'fp-1' }));

const ok = (leaderboard: unknown[]) => Promise.resolve({ ok: true, json: () => Promise.resolve({ leaderboard }) });

beforeEach(() => {
  getWithAuth.mockReset();
  auth.isAuthenticated = false;
  auth.loading = false;
});

describe('toRushRows', () => {
  it('given rows with and without playerId, when mapped, then ids are unique and heights shift by the offset', () => {
    const rows = toRushRows(
      [
        { rank: 1, playerId: 'p1', username: 'Ana', bestHeightM: 40, isYou: false },
        { rank: 2, username: 'Bo', bestHeightM: 12 },
        { rank: 3, username: 'Bo', bestHeightM: 9, isYou: true },
      ],
      5,
    );
    expect(rows).toEqual([
      { id: 'p1', name: 'Ana', bestHeightM: 45, isYou: false },
      { id: '2-Bo', name: 'Bo', bestHeightM: 17, isYou: undefined },
      { id: '3-Bo', name: 'Bo', bestHeightM: 14, isYou: true },
    ]);
  });
});

describe('useRushBoard', () => {
  it('given free play signed in, when mounted and re-rendered, then the leaderboard is fetched once and fed to the board', async () => {
    auth.isAuthenticated = true;
    getWithAuth.mockReturnValue(ok([{ rank: 1, playerId: 'p1', username: 'Ana', bestHeightM: 40 }]));
    const setBoard = vi.fn();
    const { rerender } = renderHook(() => useRushBoard({ setBoard, daily: false, language: 'en', dailyBoard: null, dailyBaseM: 0 }));
    rerender();
    await waitFor(() => expect(setBoard).toHaveBeenCalledWith([{ id: 'p1', name: 'Ana', bestHeightM: 40, isYou: undefined }]));
    expect(getWithAuth).toHaveBeenCalledTimes(1);
    expect(getWithAuth.mock.calls[0][0]).toBe('/api/word-tower/leaderboard?lang=en');
  });

  it('given free play as a guest, when mounted, then it falls back to the daily board with the guest fingerprint', async () => {
    getWithAuth.mockReturnValue(ok([]));
    renderHook(() => useRushBoard({ setBoard: vi.fn(), daily: false, language: 'he', dailyBoard: null, dailyBaseM: 0 }));
    await waitFor(() => expect(getWithAuth).toHaveBeenCalledTimes(1));
    expect(getWithAuth.mock.calls[0][0]).toBe('/api/word-tower/daily/score?language=he&guestFingerprint=fp-1');
  });

  it('given auth still loading, when mounted, then nothing is fetched until it resolves', async () => {
    auth.loading = true;
    auth.isAuthenticated = false;
    getWithAuth.mockReturnValue(ok([]));
    const props = { setBoard: vi.fn(), daily: false, language: 'en', dailyBoard: null, dailyBaseM: 0 };
    const { rerender } = renderHook(() => useRushBoard(props));
    expect(getWithAuth).not.toHaveBeenCalled();
    auth.loading = false;
    auth.isAuthenticated = true;
    rerender();
    await waitFor(() => expect(getWithAuth).toHaveBeenCalledTimes(1));
    expect(getWithAuth.mock.calls[0][0]).toBe('/api/word-tower/leaderboard?lang=en');
  });

  it('given the request fails, when mounted, then it stays silent and feeds no rivals', async () => {
    auth.isAuthenticated = true;
    getWithAuth.mockReturnValue(Promise.reject(new Error('offline')));
    const setBoard = vi.fn();
    renderHook(() => useRushBoard({ setBoard, daily: false, language: 'en', dailyBoard: null, dailyBaseM: 0 }));
    await waitFor(() => expect(getWithAuth).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 0));
    expect(setBoard).not.toHaveBeenCalled();
  });

  it('given the daily, when the shared daily board arrives, then it is reused (no fetch) and lifted onto the restored tower', () => {
    const setBoard = vi.fn();
    const { rerender } = renderHook((p: { board: { rank: number; username: string; bestHeightM: number }[] | null }) =>
      useRushBoard({ setBoard, daily: true, language: 'en', dailyBoard: p.board, dailyBaseM: 30 }),
      { initialProps: { board: null } },
    );
    expect(setBoard).not.toHaveBeenCalled();
    rerender({ board: [{ rank: 1, username: 'Ana', bestHeightM: 8 }] });
    expect(setBoard).toHaveBeenLastCalledWith([{ id: '1-Ana', name: 'Ana', bestHeightM: 38, isYou: undefined }]);
    expect(getWithAuth).not.toHaveBeenCalled();
  });
});
