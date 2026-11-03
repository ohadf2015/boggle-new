import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PerkId } from '@/lib/wordTowerV2/rush/types';
import { useRush } from '../useRush';

const FLOOR_M = 3;

type Rush = ReturnType<typeof useRush>;

function ownPerk(result: { current: Rush }, id: PerkId): void {
  for (let seed = 1; seed < 2000; seed++) {
    act(() => result.current.reset(seed));
    act(() => result.current.onPeak(5 * FLOOR_M));
    act(() => {
      result.current.openDraft();
    });
    if (result.current.draftOffer?.some((p) => p.id === id)) {
      act(() => {
        result.current.pickPerk(id);
      });
      return;
    }
  }
  throw new Error(`no seed offers ${id}`);
}

describe('useRush', () => {
  it('given a fresh run, then three next-up slots show with the third sealed, rank is the first tier and nothing is owned', () => {
    const { result } = renderHook(() => useRush());
    act(() => result.current.reset(7));
    expect(result.current.slots).toHaveLength(3);
    expect(result.current.slots[2].sealed).toBe(true);
    expect(result.current.rank.tier).toBe(0);
    expect(result.current.draftOffer).toBeNull();
    expect(result.current.owned).toEqual([]);
    expect(result.current.mods.widthMul).toBe(1);
  });

  it('given a jump from 0 to 11 peak floors, when drafts are opened, then one draft per five floors is queued in order', () => {
    const { result } = renderHook(() => useRush());
    act(() => result.current.reset(3));
    act(() => result.current.onPeak(11 * FLOOR_M));
    expect(result.current.hasDraftDue()).toBe(true);
    act(() => {
      result.current.openDraft();
    });
    expect(result.current.draftFloor).toBe(5);
    expect(result.current.draftOffer).toHaveLength(3);
    let more = '';
    act(() => {
      more = result.current.pickPerk(result.current.draftOffer![0].id);
    });
    expect(more).toBe('next');
    expect(result.current.draftFloor).toBe(10);
    act(() => {
      more = result.current.pickPerk(result.current.draftOffer![1].id);
    });
    expect(more).toBe('done');
    expect(result.current.draftOffer).toBeNull();
    expect(result.current.owned).toHaveLength(2);
    expect(result.current.hasDraftDue()).toBe(false);
  });

  it('given an id that is not on offer, when picked, then nothing is owned', () => {
    const { result } = renderHook(() => useRush());
    act(() => result.current.reset(3));
    let res = '';
    act(() => {
      res = result.current.pickPerk('wideLoad');
    });
    expect(res).toBe('ignored');
    expect(result.current.owned).toEqual([]);
  });

  it('given the same seed, when the floor-5 draft opens twice, then the offer is identical', () => {
    const offer = () => {
      const { result } = renderHook(() => useRush());
      act(() => result.current.reset(99));
      act(() => result.current.onPeak(5 * FLOOR_M));
      act(() => {
        result.current.openDraft();
      });
      return result.current.draftOffer!.map((p) => p.id);
    };
    expect(offer()).toEqual(offer());
  });

  it('given the daily, when drafts open on many seeds, then a swing-speed card is never offered', () => {
    const { result } = renderHook(() => useRush({ daily: true }));
    for (let seed = 1; seed < 200; seed++) {
      act(() => result.current.reset(seed));
      act(() => result.current.onPeak(5 * FLOOR_M));
      act(() => {
        result.current.openDraft();
      });
      expect(result.current.draftOffer!.map((p) => p.id)).not.toContain('slowSwing');
    }
  });

  it('given owned perks, then mods combine them', () => {
    const { result } = renderHook(() => useRush());
    ownPerk(result, 'wideLoad');
    expect(result.current.mods.widthMul).toBeCloseTo(1.12, 5);
    expect(result.current.modsRef.current.widthMul).toBeCloseTo(1.12, 5);
  });

  it('given the queue, when a trait is taken, then slots advance, and when returned, then it shows first again', () => {
    const { result } = renderHook(() => useRush());
    act(() => result.current.reset(11));
    const before = result.current.slots.map((s) => s.trait);
    let taken = 'plain';
    act(() => {
      taken = result.current.takeTrait();
    });
    expect(taken).toBe(before[0]);
    expect(result.current.slots[0].trait).toBe(before[1]);
    act(() => result.current.returnTrait(taken as never));
    expect(result.current.slots[0].trait).toBe(before[0]);
    let again = 'plain';
    act(() => {
      again = result.current.takeTrait();
    });
    expect(again).toBe(before[0]);
    expect(result.current.slots[0].trait).toBe(before[1]);
  });

  it('given a perfect landing, then the sealed slot is revealed', () => {
    const { result } = renderHook(() => useRush());
    act(() => result.current.reset(5));
    act(() => result.current.onLanding('good'));
    expect(result.current.slots[2].sealed).toBe(true);
    act(() => result.current.onLanding('perfect'));
    expect(result.current.slots[2].sealed).toBe(false);
  });

  it('given the peak crosses a tier, then a rank-up fires once, and a lower peak never lowers rank', () => {
    const { result } = renderHook(() => useRush());
    act(() => result.current.reset(5));
    act(() => result.current.onPeak(7));
    expect(result.current.rank.tierId).toBe('scaffold');
    expect(result.current.rankUp?.tierId).toBe('scaffold');
    act(() => result.current.clearRankUp());
    act(() => result.current.onPeak(2));
    expect(result.current.rank.tierId).toBe('scaffold');
    expect(result.current.rankUp).toBeNull();
  });

  it('given a board, when the peak passes a rival, then an overtake fires for them and never for the viewer', () => {
    const { result } = renderHook(() => useRush());
    act(() => result.current.reset(5));
    act(() =>
      result.current.setBoard([
        { id: 'a', name: 'Ana', bestHeightM: 4 },
        { id: 'b', name: 'Ben', bestHeightM: 9 },
        { id: 'me', name: 'Me', bestHeightM: 6, isYou: true },
      ]),
    );
    expect(result.current.rivals.map((r) => r.id)).not.toContain('me');
    act(() => result.current.onPeak(5));
    expect(result.current.overtake?.name).toBe('Ana');
    act(() => result.current.shiftOvertake());
    expect(result.current.overtake).toBeNull();
    act(() => result.current.onPeak(10));
    expect(result.current.overtake?.name).toBe('Ben');
  });

  it('given no safety net, then no free recovery; given one, then exactly one', () => {
    const { result } = renderHook(() => useRush());
    act(() => result.current.reset(1));
    expect(result.current.consumeFreeRecovery()).toBe(false);
    ownPerk(result, 'safetyNet');
    let first = false;
    let second = true;
    act(() => {
      first = result.current.consumeFreeRecovery();
      second = result.current.consumeFreeRecovery();
    });
    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it('given a restored tower, when baselined, then no drafts are queued for floors already built', () => {
    const { result } = renderHook(() => useRush());
    act(() => result.current.reset(1));
    act(() => result.current.baseline(30 * FLOOR_M));
    expect(result.current.hasDraftDue()).toBe(false);
    act(() => result.current.onPeak(35 * FLOOR_M));
    expect(result.current.hasDraftDue()).toBe(true);
  });

  it('given a run with perks, when reset, then perks, offers and rank clear', () => {
    const { result } = renderHook(() => useRush());
    ownPerk(result, 'wideLoad');
    act(() => result.current.onPeak(60));
    act(() => result.current.reset(2));
    expect(result.current.owned).toEqual([]);
    expect(result.current.draftOffer).toBeNull();
    expect(result.current.rank.tier).toBe(0);
    expect(result.current.mods.widthMul).toBe(1);
  });
});
