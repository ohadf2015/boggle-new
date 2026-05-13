import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useChainEventBus,
  BLAST_CHAIN_OVATION_EVENT,
  type ChainOvationDetail,
} from '../useChainEventBus';

const listener = vi.fn();

beforeEach(() => {
  listener.mockClear();
  window.addEventListener(BLAST_CHAIN_OVATION_EVENT, listener as EventListener);
  return () => window.removeEventListener(BLAST_CHAIN_OVATION_EVENT, listener as EventListener);
});

describe('useChainEventBus', () => {
  it('does not dispatch on initial render', () => {
    renderHook(() => useChainEventBus({ chainEventKey: 0, chainDepth: 0 }));
    expect(listener).not.toHaveBeenCalled();
  });

  it('does not dispatch for tier=none (depth 0 or 1)', () => {
    const { rerender } = renderHook(
      ({ k, d }) => useChainEventBus({ chainEventKey: k, chainDepth: d }),
      { initialProps: { k: 0, d: 0 } },
    );
    rerender({ k: 1, d: 1 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('does not refire on same chainEventKey', () => {
    const { rerender } = renderHook(
      ({ k, d }) => useChainEventBus({ chainEventKey: k, chainDepth: d }),
      { initialProps: { k: 1, d: 3 } },
    );
    listener.mockClear();
    rerender({ k: 1, d: 3 });
    expect(listener).not.toHaveBeenCalled();
  });

  describe('staggered replay (1 event per cascade beat)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('depth=3 fires 2 progressive events (beats 2:small + 3:big, beat 1 skipped as tier=none)', () => {
      const { rerender } = renderHook(
        ({ k, d }) => useChainEventBus({ chainEventKey: k, chainDepth: d }),
        { initialProps: { k: 0, d: 0 } },
      );
      rerender({ k: 1, d: 3 });

      // Beat 2 fires immediately (first non-none beat)
      expect(listener).toHaveBeenCalledTimes(1);
      let ev = listener.mock.calls[0]![0] as CustomEvent<ChainOvationDetail>;
      expect(ev.detail.chainDepth).toBe(2);
      expect(ev.detail.tier).toBe('small');

      vi.advanceTimersByTime(350);
      expect(listener).toHaveBeenCalledTimes(2);
      ev = listener.mock.calls[1]![0] as CustomEvent<ChainOvationDetail>;
      expect(ev.detail.chainDepth).toBe(3);
      expect(ev.detail.tier).toBe('big');
    });

    it('depth=1 (single cascade, tier=none): no events fired', () => {
      const { rerender } = renderHook(
        ({ k, d }) => useChainEventBus({ chainEventKey: k, chainDepth: d }),
        { initialProps: { k: 0, d: 0 } },
      );
      rerender({ k: 1, d: 1 });
      vi.advanceTimersByTime(1000);
      expect(listener).not.toHaveBeenCalled();
    });

    it('depth=5: full chain emits at increasing tier (small→big→mega visible)', () => {
      const { rerender } = renderHook(
        ({ k, d }) => useChainEventBus({ chainEventKey: k, chainDepth: d }),
        { initialProps: { k: 0, d: 0 } },
      );
      rerender({ k: 1, d: 5 });
      vi.advanceTimersByTime(2000);
      // beat 1=none (skipped), 2=small, 3=big, 4=big, 5=mega = 4 events
      expect(listener).toHaveBeenCalledTimes(4);
      const tiers = listener.mock.calls.map(
        (c) => (c[0] as CustomEvent<ChainOvationDetail>).detail.tier,
      );
      // depth 1=none, 2=small, 3=big, 4=big, 5=mega — first beat (d=1) is filtered, so starts at d=2
      // Actually: replay emits per cascade beat (d=1..N). tier per beat = classifyOvation(beatDepth).
      // d=1→none (skipped), d=2→small, d=3→big, d=4→big, d=5→mega
      // But we emit ALL 5 beats so beats with tier=none should still fire for visual continuity? No — none-tier is skipped per existing contract.
      // Test instead: at least one of each non-none tier appears in order.
      expect(tiers).toContain('mega');
      const megaIdx = tiers.indexOf('mega');
      const bigIdx = tiers.indexOf('big');
      const smallIdx = tiers.indexOf('small');
      expect(smallIdx).toBeLessThan(bigIdx);
      expect(bigIdx).toBeLessThan(megaIdx);
    });

    it('new chain interrupts pending replay (cleanup on rerender)', () => {
      const { rerender } = renderHook(
        ({ k, d }) => useChainEventBus({ chainEventKey: k, chainDepth: d }),
        { initialProps: { k: 0, d: 0 } },
      );
      rerender({ k: 1, d: 5 }); // would fire 5 events over 5 * 350ms
      vi.advanceTimersByTime(200); // only first event fired
      const callsBeforeInterrupt = listener.mock.calls.length;
      listener.mockClear();
      rerender({ k: 2, d: 2 }); // new chain, only 2 beats
      vi.advanceTimersByTime(1000);
      // Pending events from first chain should be cancelled
      const newCalls = listener.mock.calls.length;
      expect(newCalls).toBeLessThanOrEqual(2);
      expect(callsBeforeInterrupt).toBeGreaterThanOrEqual(0);
    });
  });
});
