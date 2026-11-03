import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SWING } from '@/lib/wordTowerV2/crane';
import { snapshotWorld, stepWorld } from '@/lib/wordTowerV2/engine';
import type { PerkId } from '@/lib/wordTowerV2/rush/types';
import { blockWidthForWord } from '@/lib/wordTowerV2/scoring';
import { useRush } from '../rush/useRush';
import { useTowerRun } from '../useTowerRun';

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound: vi.fn(), playComboSound: vi.fn(), playWordLengthSound: vi.fn(), setGameActive: vi.fn() }),
}));

function setup() {
  return renderHook(() => {
    const rush = useRush();
    const game = useTowerRun({ rush });
    return { rush, game };
  });
}

type Result = ReturnType<typeof setup>['result'];

function own(result: Result, id: PerkId): void {
  for (let seed = 1; seed < 2000; seed++) {
    act(() => result.current.rush.reset(seed));
    act(() => result.current.rush.onPeak(15));
    act(() => {
      result.current.rush.openDraft();
    });
    if (result.current.rush.draftOffer?.some((p) => p.id === id)) {
      act(() => {
        result.current.rush.pickPerk(id);
      });
      return;
    }
  }
  throw new Error(`no seed offers ${id}`);
}

describe('useTowerRun with Rush', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('given no rush, when a floor is hoisted, then the run plays exactly as before', () => {
    const { result } = renderHook(() => useTowerRun());
    act(() => result.current.hoist('tower'));
    expect(result.current.hangingRef.current?.swing.periodMs).toBe(SWING.periodMs);
    expect(snapshotWorld(result.current.worldRef.current).blocks[0].widthPx).toBe(blockWidthForWord('tower'));
    expect(result.current.getPerfectWindowMult()).toBe(1);
  });

  it('given Wide Load, when previewed and hoisted, then the ghost and the body share the wider width', () => {
    const { result } = setup();
    own(result, 'wideLoad');
    const want = Math.round(blockWidthForWord('tower') * 1.12);
    expect(result.current.game.previewWidth('tower')).toBe(want);
    act(() => result.current.game.hoist('tower'));
    expect(snapshotWorld(result.current.game.worldRef.current).blocks[0].widthPx).toBe(want);
  });

  it('given Slow Swing, when a floor is hoisted, then the crane period stretches by the speed multiplier', () => {
    const { result } = setup();
    own(result, 'slowSwing');
    act(() => result.current.game.hoist('tower'));
    expect(result.current.game.hangingRef.current?.swing.periodMs).toBeCloseTo(SWING.periodMs / 0.88, 5);
  });

  it('given Steady Hands, then the window the canvas draws is the one the judge uses', () => {
    const { result } = setup();
    own(result, 'steadyHands');
    const trait = result.current.rush.slots[0].trait;
    const feather = trait === 'feather' ? 1.2 : 1;
    expect(result.current.game.getPerfectWindowMult()).toBeCloseTo(1.25 * feather, 5);
  });

  it('given the next-up queue, when a floor is hoisted, then it carries the first trait, and cancelling hands it back', () => {
    const { result } = setup();
    const first = result.current.rush.slots[0].trait;
    act(() => result.current.game.hoist('tower'));
    const id = result.current.game.hangingRef.current!.id;
    expect(result.current.game.getTrait(id)).toBe(first);
    expect(result.current.game.traitRef.current.get(id)).toBe(first);
    act(() => {
      result.current.game.cancelHoist();
    });
    expect(result.current.rush.slots[0].trait).toBe(first);
  });

  it('given a draft comes due, when the poll runs, then the run pauses on the draft, blocks hoists, and resumes after a pick', () => {
    const { result } = setup();
    act(() => result.current.rush.onPeak(15));
    act(() => vi.advanceTimersByTime(150));
    expect(result.current.game.phase).toBe('draft');
    expect(result.current.rush.draftOffer).toHaveLength(3);
    act(() => result.current.game.hoist('tower'));
    expect(result.current.game.hangingRef.current).toBeNull();
    act(() => result.current.game.pickPerk(result.current.rush.draftOffer![0].id));
    expect(result.current.game.phase).toBe('composing');
    expect(result.current.rush.owned).toHaveLength(1);
  });

  it('given two drafts are due, when the first is picked, then the run stays on the draft for the second', () => {
    const { result } = setup();
    act(() => result.current.rush.onPeak(33));
    act(() => vi.advanceTimersByTime(150));
    act(() => result.current.game.pickPerk(result.current.rush.draftOffer![0].id));
    expect(result.current.game.phase).toBe('draft');
    act(() => result.current.game.pickPerk(result.current.rush.draftOffer![0].id));
    expect(result.current.game.phase).toBe('composing');
  });

  it('given a Safety Net, when the whole tower comes down, then the run goes on once, and ends on the next fall', () => {
    const { result } = setup();
    own(result, 'safetyNet');
    act(() => result.current.game.hoist('tower'));
    act(() => result.current.game.drop());
    act(() => {
      result.current.game.worldRef.current.collapsed = true;
    });
    act(() => vi.advanceTimersByTime(150));
    expect(result.current.game.phase).not.toBe('over');
    expect(result.current.game.worldRef.current.collapsed).toBe(false);
    act(() => {
      result.current.game.worldRef.current.collapsed = true;
    });
    act(() => vi.advanceTimersByTime(150));
    expect(result.current.game.phase).toBe('over');
  });

  it('given a Safety Net fired while a floor hangs, when that floor lands and the tower wobbles again, then it is the base the run rebuilds on', () => {
    const { result } = setup();
    own(result, 'safetyNet');
    act(() => result.current.game.hoist('tower'));
    act(() => {
      result.current.game.worldRef.current.collapsed = true;
    });
    act(() => vi.advanceTimersByTime(150));
    act(() => result.current.game.drop());
    act(() => {
      for (let t = 0; t < 2500; t += 16.667) stepWorld(result.current.game.worldRef.current, 16.667);
    });
    act(() => vi.advanceTimersByTime(150));
    act(() => {
      result.current.game.worldRef.current.collapsed = true;
    });
    act(() => vi.advanceTimersByTime(150));
    expect(result.current.game.phase).not.toBe('over');
    expect(snapshotWorld(result.current.game.worldRef.current).blocks).toHaveLength(1);
  });

  it('given a restored tower many floors tall, when the poll runs, then no draft opens for floors already built', () => {
    const { result } = setup();
    act(() => {
      result.current.game.restoreTower(Array(16).fill('tower'));
    });
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.game.phase).toBe('composing');
    expect(result.current.rush.hasDraftDue()).toBe(false);
  });

  it('given no Safety Net, when the whole tower comes down, then the run ends', () => {
    const { result } = setup();
    act(() => {
      result.current.game.worldRef.current.collapsed = true;
    });
    act(() => vi.advanceTimersByTime(150));
    expect(result.current.game.phase).toBe('over');
  });

  it('given a run with perks, when restarted, then the rush state resets', () => {
    const { result } = setup();
    own(result, 'wideLoad');
    act(() => result.current.game.restart());
    expect(result.current.rush.owned).toEqual([]);
    expect(result.current.game.phase).toBe('composing');
  });
});
