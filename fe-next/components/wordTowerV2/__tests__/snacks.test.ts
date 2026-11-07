import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { skyAt } from '@/lib/wordTowerV2/biomes';
import { MAX_SNACKS, SNACK_COINS, clampRunSummary, runCoins, type RunSummary } from '@/lib/wordTowerV2/estate';
import { createRun, type RunState } from '@/lib/wordTowerV2/run';
import type { SkyProp } from '@/lib/wordTowerV2/scenery';
import { SNACK_HIT_PX, SkyLayer, isSnack, snackPop } from '../skyArt';
import { useRunRewards } from '../rewards/useRunRewards';

const frame = (ts: number) => ({ w: 390, h: 844, ts, dt: 0.016, sky: skyAt(0), groundY: 844, scale: 1, floorPx: 60, reducedMotion: true });

describe('snack coins (server formula)', () => {
  const base: RunSummary = { floors: 6, perfects: 0, bestCombo: 0, crates: 0, heightM: 18 };

  it('given caught snacks, when the run is priced, then each is worth SNACK_COINS', () => {
    expect(runCoins({ ...base, snacks: 2 }) - runCoins(base)).toBe(2 * SNACK_COINS);
  });

  it('given more snacks than floors, when clamped, then only as many as floors count', () => {
    expect(clampRunSummary({ ...base, floors: 2, snacks: 9 }).snacks).toBe(2);
    expect(clampRunSummary({ ...base, floors: 400, snacks: 999 }).snacks).toBe(MAX_SNACKS);
  });

  it('given no snacks, when clamped, then the summary is unchanged (no new key)', () => {
    expect('snacks' in clampRunSummary(base)).toBe(false);
  });
});

describe('catching a snack in the sky', () => {
  const prop = (kind: SkyProp['kind']): SkyProp => ({ kind, floor: 0, x: 0.6, size: 1, phase: 0.3 });

  it('given the snack kinds, when checked, then food counts and the sky furniture does not', () => {
    expect(isSnack('pizza')).toBe(true);
    expect(isSnack('cloud')).toBe(false);
    expect(isSnack('whale')).toBe(false);
  });

  it('given a tap on a visible snack, when caught, then it is caught once and pops away', () => {
    const sky = new SkyLayer([prop('avocado')]);
    sky.update(frame(1000));
    const x = 390 / 2 + 0.6 * (390 / 2);
    const hit = sky.catchAt(x + 5, 844 - 3, 1000);
    expect(hit?.kind).toBe('avocado');
    expect(sky.catchAt(x, 844, 1001)).toBeNull();
    sky.destroy();
  });

  it('given a tap away from every snack, when checked, then nothing is caught', () => {
    const sky = new SkyLayer([prop('donut')]);
    sky.update(frame(1000));
    expect(sky.catchAt(20, 100, 1000)).toBeNull();
    sky.destroy();
  });

  it('given a tap on a cloud, when checked, then clouds cannot be caught', () => {
    const sky = new SkyLayer([prop('cloud')]);
    sky.update(frame(1000));
    expect(sky.catchAt(390 / 2 + 0.6 * (390 / 2), 844, 1000)).toBeNull();
    sky.destroy();
  });

  it('given the pop, when sampled, then it swells and fades to nothing', () => {
    expect(snackPop(0)).toEqual({ scale: 1, alpha: 1 });
    expect(snackPop(10_000).alpha).toBe(0);
    expect(snackPop(100).scale).toBeGreaterThan(1);
    expect(SNACK_HIT_PX).toBeGreaterThan(20);
  });
});

describe('useRunRewards catchSnack', () => {
  const land = (run: RunState, over: Partial<RunState>): RunState => ({ ...run, floors: run.floors + 1, ...over });

  it('given a climb, when a snack is caught, then it pays the server delta and the next landing keeps it', () => {
    let run = createRun(1);
    const { result, rerender } = renderHook((p: { run: RunState }) => useRunRewards({ run: p.run, heightM: 3 }), { initialProps: { run } });
    run = land(run, { combo: 0 });
    rerender({ run });
    const before = result.current.coins;
    let paid = 0;
    act(() => {
      paid = result.current.catchSnack();
    });
    expect(paid).toBe(SNACK_COINS);
    expect(result.current.coins).toBe(before + SNACK_COINS);
    run = land(run, { combo: 0 });
    rerender({ run });
    expect(result.current.getSummary().snacks).toBe(1);
  });

  it('given no floor yet, when a snack is caught, then it pays nothing (you see the sky by climbing)', () => {
    const { result } = renderHook(() => useRunRewards({ run: createRun(1), heightM: 0 }));
    let paid = -1;
    act(() => {
      paid = result.current.catchSnack();
    });
    expect(paid).toBe(0);
  });
});
