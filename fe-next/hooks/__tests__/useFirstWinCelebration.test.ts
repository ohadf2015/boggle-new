/**
 * useFirstWinCelebration Hook Tests
 * Verifies celebration fires once + coin award wired.
 */

import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFirstWinCelebration } from '../useFirstWinCelebration';
import * as coinManager from '@/utils/coinManager';

vi.mock('@/utils/confettiUtils', () => ({ fireFirstWinConfetti: vi.fn() }));
vi.mock('@/utils/haptics', () => ({ hapticGameWin: vi.fn() }));
vi.mock('@/utils/coinManager', async () => {
  const actual = await vi.importActual<typeof coinManager>('@/utils/coinManager');
  return { ...actual, addCoins: vi.fn() };
});

const localStore: Record<string, string> = {};
beforeEach(() => {
  for (const k of Object.keys(localStore)) delete localStore[k];
  (localStorage.getItem as any).mockImplementation((key: string) => localStore[key] ?? null);
  (localStorage.setItem as any).mockImplementation((key: string, val: string) => { localStore[key] = val; });
  (localStorage.removeItem as any).mockImplementation((key: string) => { delete localStore[key]; });
  vi.clearAllMocks();
});

describe('useFirstWinCelebration', () => {
  it('awards FIRST_WIN_BONUS coins on first multiplayer win', () => {
    renderHook(() =>
      useFirstWinCelebration({ isWinner: true, gamesPlayed: 1, isMultiplayer: true })
    );
    expect(coinManager.addCoins).toHaveBeenCalledTimes(1);
    expect(coinManager.addCoins).toHaveBeenCalledWith(
      coinManager.FIRST_WIN_BONUS,
      expect.any(String),
    );
  });

  it('does not award coins if already celebrated', () => {
    localStore['lexiclash_first_win_celebrated'] = 'true';
    renderHook(() =>
      useFirstWinCelebration({ isWinner: true, gamesPlayed: 1, isMultiplayer: true })
    );
    expect(coinManager.addCoins).not.toHaveBeenCalled();
  });

  it('does not award coins for non-winners', () => {
    renderHook(() =>
      useFirstWinCelebration({ isWinner: false, gamesPlayed: 1, isMultiplayer: true })
    );
    expect(coinManager.addCoins).not.toHaveBeenCalled();
  });

  it('does not award coins in singleplayer', () => {
    renderHook(() =>
      useFirstWinCelebration({ isWinner: true, gamesPlayed: 1, isMultiplayer: false })
    );
    expect(coinManager.addCoins).not.toHaveBeenCalled();
  });
});
