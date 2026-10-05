import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound: vi.fn(), playComboSound: vi.fn(), playWordLengthSound: vi.fn(), setGameActive: vi.fn() }),
}));

import type { RunSnapshot } from '@/lib/wordTowerV2/runPersist';
import { useTowerRun } from '../useTowerRun';

const META = { daily: false, date: '2026-09-21', lang: 'en', runSeed: 'wt2-x', draw: 3, wheel: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] };

describe('useTowerRun — resume a saved run', () => {
  beforeEach(() => window.localStorage.clear());

  it('given a snapshotted run, when resumed in a fresh mount, then the tower, run state and words come back', () => {
    const a = renderHook(() => useTowerRun());
    act(() => a.result.current.seedDemo(['tower', 'slab']));
    let snap: RunSnapshot;
    act(() => {
      snap = a.result.current.snapshotRun(META);
    });
    expect(snap.blocks).toHaveLength(2);
    expect(snap.words).toEqual(['tower', 'slab']);
    expect(snap.dropCount).toBe(2);

    const b = renderHook(() => useTowerRun());
    let ok = false;
    act(() => {
      ok = b.result.current.resume(snap);
    });
    expect(ok).toBe(true);
    expect(b.result.current.worldRef.current.blocks.size).toBe(2);
    expect(Array.from(b.result.current.labelsRef.current.values())).toEqual(['tower', 'slab']);

    // A StrictMode double-invoke must not stack a second tower on top.
    let again = true;
    act(() => {
      again = b.result.current.resume(snap);
    });
    expect(again).toBe(false);
    expect(b.result.current.worldRef.current.blocks.size).toBe(2);

    // The resumed run re-snapshots to an equivalent state.
    let snap2: RunSnapshot;
    act(() => {
      snap2 = b.result.current.snapshotRun(META);
    });
    expect(snap2.blocks.map((x) => x.id)).toEqual(snap.blocks.map((x) => x.id));
    expect(snap2.words).toEqual(snap.words);
    expect(snap2.run).toEqual(snap.run);
  });

  it('given a shape-only snapshot (no run state), when resumed, then it refuses instead of half-restoring', () => {
    const { result } = renderHook(() => useTowerRun());
    let ok = true;
    act(() => {
      ok = result.current.resume({ daily: false, date: '2026-09-21', words: ['tower'], peakM: 1, floors: 1 });
    });
    expect(ok).toBe(false);
    expect(result.current.worldRef.current.blocks.size).toBe(0);
  });

  it('given a resumed run, when the next floor hoists, then its id continues the saved sequence', () => {
    const a = renderHook(() => useTowerRun());
    act(() => a.result.current.seedDemo(['tower', 'slab']));
    let snap: RunSnapshot;
    act(() => {
      snap = a.result.current.snapshotRun(META);
    });

    const b = renderHook(() => useTowerRun());
    act(() => {
      b.result.current.resume(snap);
    });
    act(() => b.result.current.hoist('skyscraper'));
    expect(b.result.current.hangingRef.current?.id).toBe('r0-b2');
  });
});
