import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadRunSnapshot, saveRunSnapshot } from '@/lib/wordTowerV2/runPersist';
import type { TowerWorld } from '@/lib/wordTowerV2/engine';

let standing = { words: ['ab', 'cd'], standingM: 6 };
vi.mock('../runHelpers', () => ({ standingTower: () => standing }));

import { useFreeTowerSave } from '../useFreeTowerSave';

const world = (collapsed = false) => ({ current: { collapsed } as unknown as TowerWorld });
const base = {
  enabled: true,
  language: 'he',
  floors: 2,
  labelsRef: { current: new Map<string, string>() },
  hangingIdRef: { current: null },
  adoptBest: vi.fn(),
};

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  standing = { words: ['ab', 'cd'], standingM: 6 };
});
afterEach(() => vi.useRealTimers());

const saved = () => loadRunSnapshot(false, window.localStorage)?.words ?? null;

describe('useFreeTowerSave', () => {
  it('given a climb, when time passes, then the tower is saved without any action', () => {
    renderHook(() => useFreeTowerSave({ ...base, phase: 'composing', worldRef: world(), restoreTower: vi.fn(() => 0) }));
    act(() => void vi.advanceTimersByTime(1600));
    expect(saved()).toEqual(['ab', 'cd']);
  });

  it('given the tab is closed between saves, then the latest tower is written', () => {
    renderHook(() => useFreeTowerSave({ ...base, phase: 'composing', worldRef: world(), restoreTower: vi.fn(() => 0) }));
    standing = { words: ['ab', 'cd', 'ef'], standingM: 9 };
    act(() => void window.dispatchEvent(new Event('pagehide')));
    expect(saved()).toEqual(['ab', 'cd', 'ef']);
  });

  it('given a saved tower, when reopened, then it is rebuilt and counted', () => {
    saveRunSnapshot({ daily: false, date: '', language: 'he', words: ['גג', 'בית'], peakM: 6, floors: 2 }, window.localStorage);
    const restoreTower = vi.fn(() => 2);
    const { result } = renderHook(() => useFreeTowerSave({ ...base, phase: 'composing', worldRef: world(), restoreTower }));
    expect(restoreTower).toHaveBeenCalledWith(['גג', 'בית']);
    expect(result.current.restoredFloors).toBe(2);
    expect(base.adoptBest).toHaveBeenCalledWith(6);
  });

  it('given a tower saved in another language, when reopened, then it is left alone', () => {
    saveRunSnapshot({ daily: false, date: '', language: 'en', words: ['roof'], peakM: 3, floors: 1 }, window.localStorage);
    const restoreTower = vi.fn(() => 0);
    renderHook(() => useFreeTowerSave({ ...base, phase: 'composing', worldRef: world(), restoreTower }));
    expect(restoreTower).not.toHaveBeenCalled();
  });

  it('given a cash-out, then the tower stays saved and the next run resumes it', () => {
    const restoreTower = vi.fn(() => 2);
    const { result, rerender } = renderHook((p: { phase: string }) => useFreeTowerSave({ ...base, phase: p.phase, worldRef: world(), restoreTower }), {
      initialProps: { phase: 'composing' },
    });
    rerender({ phase: 'over' });
    expect(saved()).toEqual(['ab', 'cd']);
    act(() => void result.current.resume());
    expect(restoreTower).toHaveBeenLastCalledWith(['ab', 'cd']);
  });

  it('given a total collapse after building, then the save is gone', () => {
    saveRunSnapshot({ daily: false, date: '', language: 'he', words: ['ab'], peakM: 3, floors: 1 }, window.localStorage);
    const worldRef = world(true);
    const { rerender } = renderHook((p: { phase: string }) => useFreeTowerSave({ ...base, phase: p.phase, worldRef, restoreTower: vi.fn(() => 1) }), {
      initialProps: { phase: 'composing' },
    });
    rerender({ phase: 'over' });
    expect(saved()).toBeNull();
  });

  it('given a restored tower falls before a new floor lands, then the save survives', () => {
    saveRunSnapshot({ daily: false, date: '', language: 'he', words: ['ab'], peakM: 3, floors: 1 }, window.localStorage);
    const worldRef = world(true);
    const { rerender } = renderHook((p: { phase: string }) => useFreeTowerSave({ ...base, floors: 0, phase: p.phase, worldRef, restoreTower: vi.fn(() => 1) }), {
      initialProps: { phase: 'composing' },
    });
    rerender({ phase: 'over' });
    expect(saved()).toEqual(['ab']);
  });

  it('given the daily tower, then this hook stays out of the way', () => {
    const restoreTower = vi.fn(() => 0);
    renderHook(() => useFreeTowerSave({ ...base, enabled: false, phase: 'composing', worldRef: world(), restoreTower }));
    act(() => void vi.advanceTimersByTime(5000));
    expect(saved()).toBeNull();
    expect(restoreTower).not.toHaveBeenCalled();
  });
});
