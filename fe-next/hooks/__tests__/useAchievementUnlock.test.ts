import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAchievementUnlock, type UnlockPayload } from '../useAchievementUnlock';

const store: Record<string, string> = {};
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  (localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation((key: string) => store[key] ?? null);
  (localStorage.setItem as ReturnType<typeof vi.fn>).mockImplementation((key: string, val: string) => { store[key] = val; });
});

const FIRST: UnlockPayload = { achievementKey: 'first_lesson', tier: 'bronze', icon: '📚', isNew: true, isUpgrade: false };
const XP: UnlockPayload = { achievementKey: 'xp_collector', tier: 'silver', icon: '💎', isNew: false, isUpgrade: true };
const stored = () => JSON.parse(store['achievement-acknowledged-S1'] ?? '[]');

describe('useAchievementUnlock server unlocks', () => {
  it('GIVEN server-confirmed unlocks WHEN enqueued THEN the first shows at once and is remembered while on screen', () => {
    const { result } = renderHook(() => useAchievementUnlock({ studentId: 'S1' }));

    act(() => result.current.enqueueUnlocks([FIRST, XP]));

    expect(result.current.currentUnlock).toEqual(FIRST);
    expect(stored()).toEqual(['first_lesson:bronze']);

    act(() => result.current.acknowledgeUnlock());
    expect(result.current.currentUnlock).toEqual(XP);
    expect(stored()).toEqual(['first_lesson:bronze', 'xp_collector:silver']);
  });

  it('GIVEN an unlock already shown WHEN the same one arrives again, even after a reload THEN it never shows twice', () => {
    const first = renderHook(() => useAchievementUnlock({ studentId: 'S1' }));
    act(() => first.result.current.enqueueUnlocks([FIRST]));
    act(() => first.result.current.enqueueUnlocks([FIRST]));
    expect(first.result.current.pendingUnlocks).toHaveLength(1);
    first.unmount();

    const reloaded = renderHook(() => useAchievementUnlock({ studentId: 'S1' }));
    act(() => reloaded.result.current.enqueueUnlocks([FIRST]));
    expect(reloaded.result.current.currentUnlock).toBeNull();
  });

  it('GIVEN the hook is disabled WHEN unlocks arrive THEN nothing is queued', () => {
    const { result } = renderHook(() => useAchievementUnlock({ studentId: 'S1', enabled: false }));
    act(() => result.current.enqueueUnlocks([FIRST]));
    expect(result.current.currentUnlock).toBeNull();
  });
});

describe('useAchievementUnlock initial state', () => {
  it('starts with nothing queued, and dismissing an empty queue is harmless', () => {
    const { result } = renderHook(() => useAchievementUnlock({ studentId: 'S1' }));
    expect(result.current.currentUnlock).toBeNull();
    act(() => result.current.acknowledgeUnlock());
    expect(result.current.pendingUnlocks).toEqual([]);
  });
});
