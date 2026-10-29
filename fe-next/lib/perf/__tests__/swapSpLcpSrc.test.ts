import { describe, it, expect, vi } from 'vitest';
import {
  applySpLcpSrcSwap,
  scheduleSpLcpSrcSwap,
  SP_WINNER_ANIMATED_SRC,
  SP_WINNER_STILL_SRC,
  type SpLcpAnimEl,
} from '../swapSpLcpSrc';

function fakeAnim(backgroundImage = ''): SpLcpAnimEl & { style: { backgroundImage: string }; srcWrites: string[] } {
  const el = {
    style: { backgroundImage },
    srcWrites: [] as string[],
    getAttribute: (name: string) => (name === 'src' ? SP_WINNER_STILL_SRC : null),
    setAttribute: (name: string, value: string) => {
      if (name === 'src') el.srcWrites.push(value);
    },
  };
  return el;
}

class FakeObserver {
  static last: FakeObserver | undefined;
  callback: PerformanceObserverCallback;
  observed: PerformanceObserverInit | undefined;
  disconnected = false;
  constructor(callback: PerformanceObserverCallback) {
    this.callback = callback;
    FakeObserver.last = this;
  }
  observe(init: PerformanceObserverInit) {
    this.observed = init;
  }
  disconnect() {
    this.disconnected = true;
  }
  emit(entries: unknown[]) {
    this.callback({ getEntries: () => entries } as PerformanceObserverEntryList, this as unknown as PerformanceObserver);
  }
}

describe('SP_WINNER_ANIMATED_SRC', () => {
  it('points at the right-sized swap asset, not the shared 30KB winner.webp', () => {
    expect(SP_WINNER_ANIMATED_SRC).toBe('/mascot/winner-swap.webp');
    expect(SP_WINNER_STILL_SRC).toBe('/mascot/winner-lcp.webp');
  });
});

describe('applySpLcpSrcSwap', () => {
  it('paints the animation as a CSS background and never writes an img src', () => {
    const el = fakeAnim();
    expect(applySpLcpSrcSwap(el)).toBe(true);
    expect(el.style.backgroundImage).toBe(`url("${SP_WINNER_ANIMATED_SRC}")`);
    expect(el.srcWrites).toEqual([]);
    expect(el.getAttribute('src')).toBe(SP_WINNER_STILL_SRC);
  });

  it('is a no-op when the animated background is already set', () => {
    const el = fakeAnim(`url("${SP_WINNER_ANIMATED_SRC}")`);
    expect(applySpLcpSrcSwap(el)).toBe(false);
    expect(el.style.backgroundImage).toBe(`url("${SP_WINNER_ANIMATED_SRC}")`);
    expect(el.srcWrites).toEqual([]);
  });
});

describe('scheduleSpLcpSrcSwap', () => {
  it('does not apply the background before an LCP entry or the load+idle fallback', () => {
    const el = fakeAnim();
    const idle = vi.fn(() => () => {});
    scheduleSpLcpSrcSwap({
      getAnim: () => el,
      afterLoadIdle: idle,
      Observer: FakeObserver as unknown as typeof PerformanceObserver,
    });
    expect(el.style.backgroundImage).toBe('');
    expect(FakeObserver.last?.observed).toEqual({ type: 'largest-contentful-paint', buffered: true });
    expect(idle).toHaveBeenCalledTimes(1);
  });

  it('applies the background when an LCP entry arrives and cancels the idle fallback', () => {
    const el = fakeAnim();
    const cancelIdle = vi.fn();
    scheduleSpLcpSrcSwap({
      getAnim: () => el,
      afterLoadIdle: () => cancelIdle,
      Observer: FakeObserver as unknown as typeof PerformanceObserver,
    });
    FakeObserver.last?.emit([{ entryType: 'largest-contentful-paint', startTime: 280 }]);
    expect(el.style.backgroundImage).toBe(`url("${SP_WINNER_ANIMATED_SRC}")`);
    expect(el.srcWrites).toEqual([]);
    expect(cancelIdle).toHaveBeenCalledTimes(1);
    expect(FakeObserver.last?.disconnected).toBe(true);
  });

  it('ignores an empty observer callback', () => {
    const el = fakeAnim();
    scheduleSpLcpSrcSwap({
      getAnim: () => el,
      afterLoadIdle: () => () => {},
      Observer: FakeObserver as unknown as typeof PerformanceObserver,
    });
    FakeObserver.last?.emit([]);
    expect(el.style.backgroundImage).toBe('');
  });

  it('falls back to load+idle when no LCP entry arrives', () => {
    const el = fakeAnim();
    let idleFn: (() => void) | undefined;
    scheduleSpLcpSrcSwap({
      getAnim: () => el,
      afterLoadIdle: (fn) => {
        idleFn = fn;
        return () => {};
      },
      Observer: FakeObserver as unknown as typeof PerformanceObserver,
    });
    expect(el.style.backgroundImage).toBe('');
    idleFn?.();
    expect(el.style.backgroundImage).toBe(`url("${SP_WINNER_ANIMATED_SRC}")`);
  });

  it('uses load+idle when PerformanceObserver cannot observe LCP', () => {
    class ThrowingObserver {
      constructor(_cb: PerformanceObserverCallback) {}
      observe(): void {
        throw new Error('unsupported');
      }
      disconnect(): void {}
    }
    const el = fakeAnim();
    let idleFn: (() => void) | undefined;
    scheduleSpLcpSrcSwap({
      getAnim: () => el,
      afterLoadIdle: (fn) => {
        idleFn = fn;
        return () => {};
      },
      Observer: ThrowingObserver as unknown as typeof PerformanceObserver,
    });
    idleFn?.();
    expect(el.style.backgroundImage).toBe(`url("${SP_WINNER_ANIMATED_SRC}")`);
    expect(el.srcWrites).toEqual([]);
  });

  it('does not apply the background twice when idle fires after LCP', () => {
    const el = fakeAnim();
    let idleFn: (() => void) | undefined;
    let writes = 0;
    let backgroundImage = '';
    Object.defineProperty(el.style, 'backgroundImage', {
      configurable: true,
      get: () => backgroundImage,
      set: (value: string) => {
        writes += 1;
        backgroundImage = value;
      },
    });
    scheduleSpLcpSrcSwap({
      getAnim: () => el,
      afterLoadIdle: (fn) => {
        idleFn = fn;
        return () => {};
      },
      Observer: FakeObserver as unknown as typeof PerformanceObserver,
    });
    FakeObserver.last?.emit([{ entryType: 'largest-contentful-paint' }]);
    idleFn?.();
    expect(el.style.backgroundImage).toBe(`url("${SP_WINNER_ANIMATED_SRC}")`);
    expect(writes).toBe(1);
    expect(el.srcWrites).toEqual([]);
  });

  it('cancel blocks a late LCP entry and the idle fallback', () => {
    const el = fakeAnim();
    let idleFn: (() => void) | undefined;
    const cancel = scheduleSpLcpSrcSwap({
      getAnim: () => el,
      afterLoadIdle: (fn) => {
        idleFn = fn;
        return () => {};
      },
      Observer: FakeObserver as unknown as typeof PerformanceObserver,
    });
    cancel();
    FakeObserver.last?.emit([{ entryType: 'largest-contentful-paint' }]);
    idleFn?.();
    expect(el.style.backgroundImage).toBe('');
  });

  it('cancels idle when a buffered LCP entry is delivered during observe()', () => {
    const el = fakeAnim();
    const cancelIdle = vi.fn();
    class SyncObserver {
      constructor(private callback: PerformanceObserverCallback) {}
      observe() {
        this.callback(
          { getEntries: () => [{ entryType: 'largest-contentful-paint' }] } as unknown as PerformanceObserverEntryList,
          this as unknown as PerformanceObserver,
        );
      }
      disconnect() {}
    }
    scheduleSpLcpSrcSwap({
      getAnim: () => el,
      afterLoadIdle: () => cancelIdle,
      Observer: SyncObserver as unknown as typeof PerformanceObserver,
    });
    expect(el.style.backgroundImage).toBe(`url("${SP_WINNER_ANIMATED_SRC}")`);
    expect(cancelIdle).toHaveBeenCalledTimes(1);
  });

  it('retries on idle if the overlay was missing when LCP fired', () => {
    const el = fakeAnim();
    let current: SpLcpAnimEl | null = null;
    let idleFn: (() => void) | undefined;
    scheduleSpLcpSrcSwap({
      getAnim: () => current,
      afterLoadIdle: (fn) => {
        idleFn = fn;
        return () => {};
      },
      Observer: FakeObserver as unknown as typeof PerformanceObserver,
    });
    FakeObserver.last?.emit([{ entryType: 'largest-contentful-paint' }]);
    expect(el.style.backgroundImage).toBe('');
    current = el;
    idleFn?.();
    expect(el.style.backgroundImage).toBe(`url("${SP_WINNER_ANIMATED_SRC}")`);
    expect(el.srcWrites).toEqual([]);
  });
});
