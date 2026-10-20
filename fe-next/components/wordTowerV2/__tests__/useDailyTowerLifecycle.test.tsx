import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const trackGameEnd = vi.fn();
const updateActiveGameExtras = vi.fn();

vi.mock('@/utils/growthTracking', () => ({
  trackGameEnd: (...args: unknown[]) => trackGameEnd(...args),
  trackGameStart: vi.fn(),
}));
vi.mock('@/utils/abandonOnPagehide', () => ({
  updateActiveGameExtras: (...args: unknown[]) => updateActiveGameExtras(...args),
}));

import { useDailyTowerLifecycle } from '../useDailyTowerLifecycle';

describe('useDailyTowerLifecycle', () => {
  beforeEach(() => {
    trackGameEnd.mockClear();
    updateActiveGameExtras.mockClear();
  });

  it('SPA leave with floors > 0 emits one game_completed and does not abandon', () => {
    const { unmount } = renderHook(() =>
      useDailyTowerLifecycle({ daily: true, floors: 5, peakM: 15.2, score: 40 }),
    );
    expect(trackGameEnd).not.toHaveBeenCalled();
    unmount();
    expect(trackGameEnd).toHaveBeenCalledTimes(1);
    expect(trackGameEnd).toHaveBeenCalledWith(
      'word-tower',
      40,
      5,
      true,
      expect.any(Number),
      expect.objectContaining({ v2: true, daily: true, floors: 5, heightM: 15, words_found: 5 }),
    );
  });

  it('pagehide with floors > 0 completes once; a later unmount does not abandon', () => {
    const { rerender, unmount } = renderHook(
      ({ floors }: { floors: number }) =>
        useDailyTowerLifecycle({ daily: true, floors, peakM: 9.4, score: 12 }),
      { initialProps: { floors: 0 } },
    );
    rerender({ floors: 3 });
    expect(trackGameEnd).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('pagehide'));
    expect(trackGameEnd).toHaveBeenCalledTimes(1);
    expect(trackGameEnd.mock.calls[0][3]).toBe(true);
    expect(trackGameEnd.mock.calls[0][5]).toMatchObject({
      daily: true,
      floors: 3,
      words_found: 3,
      heightM: 9,
    });
    unmount();
    expect(trackGameEnd).toHaveBeenCalledTimes(1);
  });

  it('does not complete a daily visit that built nothing; leave keeps the generic abandon', () => {
    const { unmount } = renderHook(() =>
      useDailyTowerLifecycle({ daily: true, floors: 0, peakM: 0, score: 0 }),
    );
    window.dispatchEvent(new Event('pagehide'));
    unmount();
    expect(trackGameEnd).not.toHaveBeenCalled();
    expect(updateActiveGameExtras).toHaveBeenCalledWith({ words_found: 0, floors: 0 });
  });

  it('does not emit a word-tower end for the free tower', () => {
    const { unmount } = renderHook(() =>
      useDailyTowerLifecycle({ daily: false, floors: 6, peakM: 18, score: 9 }),
    );
    window.dispatchEvent(new Event('pagehide'));
    unmount();
    expect(trackGameEnd).not.toHaveBeenCalled();
  });
});
