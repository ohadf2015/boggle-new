import React from 'react';
import { renderHook, act, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { REVEAL, REVEAL_TIMELINE_MS, useRevealSequence } from '../revealSequence';
import { DailyRevealProvider, useDailyReveal } from '../DailyRevealContext';

describe('useRevealSequence', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('given an inactive sequence, then it is settled from the first render', () => {
    const { result } = renderHook(() => useRevealSequence(false));
    expect(result.current.stage).toBe(REVEAL.done);
    expect(result.current.done).toBe(true);
  });

  it('given an active sequence, then stages advance on the timeline and end done', () => {
    const { result } = renderHook(() => useRevealSequence(true));
    expect(result.current.stage).toBe(REVEAL.start);
    act(() => { vi.advanceTimersByTime(REVEAL_TIMELINE_MS[REVEAL.stats]); });
    expect(result.current.stage).toBe(REVEAL.stats);
    act(() => { vi.advanceTimersByTime(REVEAL_TIMELINE_MS[REVEAL.done]); });
    expect(result.current.done).toBe(true);
  });

  it('caps the whole sequence at 2.5s', () => {
    expect(REVEAL_TIMELINE_MS[REVEAL.done]).toBeLessThanOrEqual(2500);
  });

  it('given a skip mid-sequence, then it jumps to done and remembers it was skipped', () => {
    const { result } = renderHook(() => useRevealSequence(true));
    act(() => result.current.skip());
    expect(result.current.done).toBe(true);
    expect(result.current.skipped).toBe(true);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.stage).toBe(REVEAL.done);
  });

  it('given it turns inactive mid-sequence (late reduced-motion), then it settles at once', () => {
    const { result, rerender } = renderHook(({ on }) => useRevealSequence(on), { initialProps: { on: true } });
    rerender({ on: false });
    expect(result.current.done).toBe(true);
  });

  it('clears its timers on unmount', () => {
    const { unmount } = renderHook(() => useRevealSequence(true));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

function Probe() {
  const r = useDailyReveal();
  return <span data-testid="probe" data-stage={r.stage} data-in={String(r.inProvider)} data-claim={`${r.claimCelebration()}${r.claimCelebration()}`} />;
}

describe('DailyRevealProvider', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: false, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });

  it('outside a provider, reads settled and lets every caller celebrate', () => {
    render(<Probe />);
    const p = screen.getByTestId('probe');
    expect(p.dataset.stage).toBe(String(REVEAL.done));
    expect(p.dataset.in).toBe('false');
    expect(p.dataset.claim).toBe('truetrue');
  });

  it('inside a celebrating provider, the one-shot celebration is claimed once across every consumer', () => {
    render(<DailyRevealProvider celebrate><Probe /></DailyRevealProvider>);
    expect(screen.getByTestId('probe').dataset.claim).toBe('truefalse');
  });

  it('given reduced motion, a celebrating provider still renders settled', () => {
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: q.includes('reduce'), media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    render(<DailyRevealProvider celebrate><Probe /></DailyRevealProvider>);
    expect(screen.getByTestId('probe').dataset.stage).toBe(String(REVEAL.done));
  });
});
