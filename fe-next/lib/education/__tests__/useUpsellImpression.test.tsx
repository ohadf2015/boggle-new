import React, { useRef, useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useUpsellImpression } from '@/lib/education/useUpsellImpression';

const growth = vi.hoisted(() => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/utils/growthTracking', () => growth);

type Cb = (entries: Array<{ isIntersecting: boolean; intersectionRatio: number }>) => void;
let observers: Array<{ cb: Cb; targets: Element[] }> = [];
const originalIO = globalThis.IntersectionObserver;

function Probe({ ready, onSeen }: { ready: boolean; onSeen?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useUpsellImpression(ref, { cta: 'teacher_pro', placement: 'dashboard' }, { locale: 'en' }, onSeen);
  return ready ? <div ref={ref} data-testid="offer">offer</div> : <div data-testid="waiting">waiting</div>;
}

describe('useUpsellImpression', () => {
  const onSeen = vi.fn();
  let rafQueue: FrameRequestCallback[] = [];
  const realRaf = globalThis.requestAnimationFrame;
  const realCaf = globalThis.cancelAnimationFrame;

  beforeEach(() => {
    growth.trackGrowthEvent.mockClear();
    onSeen.mockClear();
    observers = [];
    rafQueue = [];
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    }) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = ((id: number) => {
      rafQueue[id - 1] = () => {};
    }) as typeof cancelAnimationFrame;
    class FakeIO {
      private o: { cb: Cb; targets: Element[] };
      constructor(cb: Cb) {
        this.o = { cb, targets: [] };
        observers.push(this.o);
      }
      observe(el: Element) {
        this.o.targets.push(el);
      }
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
    }
    globalThis.IntersectionObserver = FakeIO as unknown as typeof IntersectionObserver;
  });
  afterEach(() => {
    globalThis.IntersectionObserver = originalIO;
    globalThis.requestAnimationFrame = realRaf;
    globalThis.cancelAnimationFrame = realCaf;
  });

  const flushRaf = () => act(() => { rafQueue.splice(0).forEach((cb) => cb(0)); });

  it('attaches the observer even if the element was missing on the first effect, then fires viewed at 50% visible', () => {
    const { rerender } = render(<Probe ready={false} onSeen={onSeen} />);
    expect(observers).toHaveLength(0);
    expect(screen.getByTestId('waiting')).toBeTruthy();
    rerender(<Probe ready={true} onSeen={onSeen} />);
    expect(observers).toHaveLength(0);
    flushRaf();
    const el = screen.getByTestId('offer');
    expect(observers).toHaveLength(1);
    expect(observers[0].targets).toContain(el);
    act(() => observers[0].cb([{ isIntersecting: false, intersectionRatio: 0 }]));
    expect(growth.trackGrowthEvent).not.toHaveBeenCalled();
    expect(onSeen).not.toHaveBeenCalled();
    act(() => observers[0].cb([{ isIntersecting: true, intersectionRatio: 0.6 }]));
    expect(growth.trackGrowthEvent).toHaveBeenCalledTimes(1);
    expect(growth.trackGrowthEvent).toHaveBeenCalledWith(
      'education_upsell_impression',
      expect.objectContaining({ cta: 'teacher_pro', placement: 'dashboard', locale: 'en' }),
    );
    expect(onSeen).toHaveBeenCalledTimes(1);
    act(() => observers[0].cb([{ isIntersecting: true, intersectionRatio: 1 }]));
    expect(onSeen).toHaveBeenCalledTimes(1);
  });
});
