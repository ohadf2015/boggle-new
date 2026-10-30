import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn((..._a: unknown[]) => Promise.resolve({ ok: true }));
vi.mock('@/utils/authFetch', () => ({ postWithAuth: (...a: unknown[]) => post(...a) }));
vi.mock('@/utils/guestManager', () => ({ getGuestFingerprint: () => 'g1' }));

const tower = { words: ['cat'], standingM: 3 };
vi.mock('../runHelpers', () => ({ standingTower: () => ({ ...tower, words: [...tower.words] }) }));

import { useDailyTower } from '../useDailyTower';
import { emptySave, saveDailyTower } from '@/lib/wordTowerV2/dailyTower';

function mount() {
  return renderHook(() =>
    useDailyTower({
      daily: true,
      language: 'en',
      phase: 'composing',
      worldRef: { current: {} as never },
      labelsRef: { current: new Map() },
      hangingIdRef: { current: null },
      restoreTower: () => 0,
    }),
  );
}

const bodies = () => post.mock.calls.map((c) => c[1] as { heightM: number; final?: boolean });

describe('useDailyTower', () => {
  beforeEach(() => {
    window.localStorage.clear();
    post.mockClear();
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-10-29T23:59:00Z'));
    tower.words = ['cat'];
    tower.standingM = 3;
  });
  afterEach(() => vi.useRealTimers());

  it('leaving the screen banks the climb as final', () => {
    const { result, unmount } = mount();
    tower.words = ['cat', 'dog', 'emu'];
    tower.standingM = 9;
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(result.current.growthM).toBeGreaterThan(0);
    unmount();
    expect(bodies().some((b) => b.final)).toBe(true);
  });

  it('past midnight UTC, yesterday’s growth does not count for today', () => {
    saveDailyTower({ ...emptySave('en'), dayKey: '2026-10-29' }, window.localStorage);
    const { result } = mount();
    tower.words = ['cat', 'dog', 'emu', 'fox'];
    tower.standingM = 12;
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(result.current.growthM).toBe(12);

    vi.setSystemTime(new Date('2026-10-30T00:00:30Z'));
    tower.words = ['cat', 'dog', 'emu', 'fox', 'gnu'];
    tower.standingM = 15;
    post.mockClear();
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(result.current.growthM).toBe(3);
    expect(bodies().every((b) => b.heightM <= 3)).toBe(true);
  });
});
