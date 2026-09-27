import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const showToastMock = vi.fn();
vi.mock('@/components/cosmetics/CosmeticUnlockToast', () => ({
  showCosmeticUnlockToast: (...args: unknown[]) => showToastMock(...args),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

import { useUnlockNotifier } from '../useUnlockNotifier';

const NOTIFIED_KEY = 'lexiclash_cosmetics_notified_v1';

describe('useUnlockNotifier', () => {
  beforeEach(() => {
    showToastMock.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('does not fire a toast on first encounter — it silently seeds owned cosmetics', () => {
    renderHook(() => useUnlockNotifier({ rankTier: 'bronze', streakDays: 0 }));
    expect(showToastMock).not.toHaveBeenCalled();
    // The seed records every currently-unlocked id so they are never announced.
    expect(localStorage.getItem(NOTIFIED_KEY)).not.toBeNull();
  });

  it('fires a toast for each genuinely new cosmetic when rank advances', () => {
    // Seed: a player who had only the Bronze tier already acknowledged.
    localStorage.setItem(
      NOTIFIED_KEY,
      JSON.stringify(['tile-default', 'board-classic', 'victory-confetti', 'frame-none', 'frame-bronze']),
    );
    renderHook(() => useUnlockNotifier({ rankTier: 'silver', streakDays: 0 }));
    // Silver newly unlocks tile-neon + frame-silver → 2 toasts.
    expect(showToastMock).toHaveBeenCalledTimes(2);
  });

  it('never announces the same cosmetic twice — even when streak resets and re-climbs', () => {
    // Seed everything below the 7-day streak as already known.
    localStorage.setItem(
      NOTIFIED_KEY,
      JSON.stringify(['tile-default', 'board-classic', 'victory-confetti', 'frame-none']),
    );
    const { rerender } = renderHook(
      ({ streak }: { streak: number }) => useUnlockNotifier({ rankTier: 'stone', streakDays: streak }),
      { initialProps: { streak: 7 } },
    );
    // 7-day streak unlocks board-ocean → 1 toast.
    expect(showToastMock).toHaveBeenCalledTimes(1);
    showToastMock.mockReset();

    // Streak breaks (back to 0)…
    rerender({ streak: 0 });
    expect(showToastMock).not.toHaveBeenCalled();
    // …then re-climbs past 7. The OLD diff-based notifier re-fired here; the
    // id-set notifier stays silent because board-ocean was already announced.
    rerender({ streak: 7 });
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it('does not re-toast on a plain re-render with unchanged inputs', () => {
    localStorage.setItem(
      NOTIFIED_KEY,
      JSON.stringify(['tile-default', 'board-classic', 'victory-confetti', 'frame-none', 'frame-bronze']),
    );
    const { rerender } = renderHook(
      ({ rank }: { rank: string }) => useUnlockNotifier({ rankTier: rank, streakDays: 0 }),
      { initialProps: { rank: 'silver' } },
    );
    expect(showToastMock).toHaveBeenCalledTimes(2);
    showToastMock.mockReset();
    rerender({ rank: 'silver' });
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it('scopes the notified record per account', () => {
    renderHook(() => useUnlockNotifier({ rankTier: 'silver', streakDays: 0, accountId: 'user-a' }));
    // Seeded silently under the account-scoped key, not the bare key.
    expect(localStorage.getItem(`${NOTIFIED_KEY}:user-a`)).not.toBeNull();
    expect(localStorage.getItem(NOTIFIED_KEY)).toBeNull();
  });

  it('passes the cosmetic and locale through to the toast', () => {
    localStorage.setItem(
      NOTIFIED_KEY,
      JSON.stringify(['tile-default', 'board-classic', 'victory-confetti', 'frame-none', 'frame-bronze']),
    );
    renderHook(() => useUnlockNotifier({ rankTier: 'silver', streakDays: 0 }));
    expect(showToastMock).toHaveBeenCalled();
    const arg = showToastMock.mock.calls[0][0] as { cosmetic: { id: string }; language: string; isRtl: boolean };
    expect(typeof arg.cosmetic.id).toBe('string');
    expect(arg.language).toBe('en');
    expect(arg.isRtl).toBe(false);
  });
});
