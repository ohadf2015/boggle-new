import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const toastSuccessMock = vi.fn();
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: (...args: unknown[]) => toastSuccessMock(...args) },
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key }),
}));

import { useUnlockNotifier } from '../useUnlockNotifier';

const SNAPSHOT_KEY = 'lexiclash_cosmetics_snapshot';

describe('useUnlockNotifier', () => {
  beforeEach(() => {
    toastSuccessMock.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('does not fire toast on first mount when no prior snapshot exists', () => {
    renderHook(() => useUnlockNotifier({ rankTier: 'Bronze', streakDays: 0 }));
    expect(toastSuccessMock).not.toHaveBeenCalled();
  });

  it('fires toast for each newly-unlocked cosmetic when rank advances', () => {
    // Seed a prior snapshot at Bronze
    localStorage.setItem(
      SNAPSHOT_KEY,
      JSON.stringify({ rankTier: 'Bronze', streakDays: 0 }),
    );
    renderHook(() => useUnlockNotifier({ rankTier: 'Silver', streakDays: 0 }));
    // Silver unlocks tile-neon + frame-silver → 2 toasts
    expect(toastSuccessMock).toHaveBeenCalledTimes(2);
  });

  it('updates snapshot after firing so the same unlock is not announced twice', () => {
    localStorage.setItem(
      SNAPSHOT_KEY,
      JSON.stringify({ rankTier: 'Bronze', streakDays: 0 }),
    );
    const { rerender } = renderHook(
      ({ rank }: { rank: string }) => useUnlockNotifier({ rankTier: rank, streakDays: 0 }),
      { initialProps: { rank: 'Silver' } },
    );
    expect(toastSuccessMock).toHaveBeenCalledTimes(2);
    toastSuccessMock.mockReset();
    // Re-render with same rank — should NOT re-toast
    rerender({ rank: 'Silver' });
    expect(toastSuccessMock).not.toHaveBeenCalled();
  });
});
