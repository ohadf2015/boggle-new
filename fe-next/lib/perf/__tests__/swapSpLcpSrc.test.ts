import { describe, it, expect, vi } from 'vitest';
import {
  applySpLcpSrcSwap,
  scheduleSpLcpSrcSwap,
  SP_WINNER_ANIMATED_SRC,
  SP_WINNER_STILL_SRC,
  type SpLcpImg,
} from '../swapSpLcpSrc';

function fakeImg(src = SP_WINNER_STILL_SRC): SpLcpImg & { attrs: Record<string, string> } {
  const attrs: Record<string, string> = { src, fetchpriority: 'high' };
  const img: SpLcpImg & { attrs: Record<string, string> } = {
    attrs,
    getAttribute: (name) => (name in attrs ? attrs[name] : null),
    setAttribute: (name, value) => {
      attrs[name] = value;
    },
    get src() {
      return attrs.src;
    },
    set src(value: string) {
      attrs.src = value;
    },
    fetchPriority: 'high',
  };
  return img;
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

describe('applySpLcpSrcSwap', () => {
  it('swaps the still src to the animated asset and drops fetchpriority first', () => {
    const img = fakeImg();
    const order: string[] = [];
    const origSet = img.setAttribute;
    img.setAttribute = (name, value) => {
      order.push(`${name}=${value}`);
      origSet(name, value);
    };
    expect(applySpLcpSrcSwap(img)).toBe(true);
    expect(img.getAttribute('src')).toBe(SP_WINNER_ANIMATED_SRC);
    expect(img.fetchPriority).toBe('low');
    expect(order[0]).toBe('fetchpriority=low');
    expect(order.indexOf('fetchpriority=low')).toBeLessThan(order.indexOf(`src=${SP_WINNER_ANIMATED_SRC}`));
  });

  it('is a no-op when the animated src is already set', () => {
    const img = fakeImg(SP_WINNER_ANIMATED_SRC);
    expect(applySpLcpSrcSwap(img)).toBe(false);
    expect(img.fetchPriority).toBe('high');
  });
});

describe('scheduleSpLcpSrcSwap', () => {
  it('does not swap before an LCP entry or the load+idle fallback', () => {
    const img = fakeImg();
    const idle = vi.fn(() => () => {});
    scheduleSpLcpSrcSwap({
      getImg: () => img,
      afterLoadIdle: idle,
      Observer: FakeObserver as unknown as typeof PerformanceObserver,
    });
    expect(img.getAttribute('src')).toBe(SP_WINNER_STILL_SRC);
    expect(FakeObserver.last?.observed).toEqual({ type: 'largest-contentful-paint', buffered: true });
    expect(idle).toHaveBeenCalledTimes(1);
  });

  it('swaps when an LCP entry arrives and cancels the idle fallback', () => {
    const img = fakeImg();
    const cancelIdle = vi.fn();
    scheduleSpLcpSrcSwap({
      getImg: () => img,
      afterLoadIdle: () => cancelIdle,
      Observer: FakeObserver as unknown as typeof PerformanceObserver,
    });
    FakeObserver.last?.emit([{ entryType: 'largest-contentful-paint', startTime: 280 }]);
    expect(img.getAttribute('src')).toBe(SP_WINNER_ANIMATED_SRC);
    expect(img.getAttribute('fetchpriority')).toBe('low');
    expect(cancelIdle).toHaveBeenCalledTimes(1);
    expect(FakeObserver.last?.disconnected).toBe(true);
  });

  it('ignores an empty observer callback', () => {
    const img = fakeImg();
    scheduleSpLcpSrcSwap({
      getImg: () => img,
      afterLoadIdle: () => () => {},
      Observer: FakeObserver as unknown as typeof PerformanceObserver,
    });
    FakeObserver.last?.emit([]);
    expect(img.getAttribute('src')).toBe(SP_WINNER_STILL_SRC);
  });

  it('falls back to load+idle when no LCP entry arrives', () => {
    const img = fakeImg();
    let idleFn: (() => void) | undefined;
    scheduleSpLcpSrcSwap({
      getImg: () => img,
      afterLoadIdle: (fn) => {
        idleFn = fn;
        return () => {};
      },
      Observer: FakeObserver as unknown as typeof PerformanceObserver,
    });
    expect(img.getAttribute('src')).toBe(SP_WINNER_STILL_SRC);
    idleFn?.();
    expect(img.getAttribute('src')).toBe(SP_WINNER_ANIMATED_SRC);
  });

  it('uses load+idle when PerformanceObserver cannot observe LCP', () => {
    class ThrowingObserver {
      constructor(_cb: PerformanceObserverCallback) {}
      observe(): void {
        throw new Error('unsupported');
      }
      disconnect(): void {}
    }
    const img = fakeImg();
    let idleFn: (() => void) | undefined;
    scheduleSpLcpSrcSwap({
      getImg: () => img,
      afterLoadIdle: (fn) => {
        idleFn = fn;
        return () => {};
      },
      Observer: ThrowingObserver as unknown as typeof PerformanceObserver,
    });
    idleFn?.();
    expect(img.getAttribute('src')).toBe(SP_WINNER_ANIMATED_SRC);
  });

  it('does not swap twice when idle fires after LCP', () => {
    const img = fakeImg();
    let idleFn: (() => void) | undefined;
    const swaps = vi.fn();
    const orig = img.setAttribute;
    img.setAttribute = (name, value) => {
      if (name === 'src') swaps();
      orig(name, value);
    };
    scheduleSpLcpSrcSwap({
      getImg: () => img,
      afterLoadIdle: (fn) => {
        idleFn = fn;
        return () => {};
      },
      Observer: FakeObserver as unknown as typeof PerformanceObserver,
    });
    FakeObserver.last?.emit([{ entryType: 'largest-contentful-paint' }]);
    idleFn?.();
    expect(swaps).toHaveBeenCalledTimes(1);
  });

  it('cancel blocks a late LCP entry and the idle fallback', () => {
    const img = fakeImg();
    let idleFn: (() => void) | undefined;
    const cancel = scheduleSpLcpSrcSwap({
      getImg: () => img,
      afterLoadIdle: (fn) => {
        idleFn = fn;
        return () => {};
      },
      Observer: FakeObserver as unknown as typeof PerformanceObserver,
    });
    cancel();
    FakeObserver.last?.emit([{ entryType: 'largest-contentful-paint' }]);
    idleFn?.();
    expect(img.getAttribute('src')).toBe(SP_WINNER_STILL_SRC);
  });

  it('cancels idle when a buffered LCP entry is delivered during observe()', () => {
    const img = fakeImg();
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
      getImg: () => img,
      afterLoadIdle: () => cancelIdle,
      Observer: SyncObserver as unknown as typeof PerformanceObserver,
    });
    expect(img.getAttribute('src')).toBe(SP_WINNER_ANIMATED_SRC);
    expect(cancelIdle).toHaveBeenCalledTimes(1);
  });

  it('retries on idle if the shell img was missing when LCP fired', () => {
    const img = fakeImg();
    let current: SpLcpImg | null = null;
    let idleFn: (() => void) | undefined;
    scheduleSpLcpSrcSwap({
      getImg: () => current,
      afterLoadIdle: (fn) => {
        idleFn = fn;
        return () => {};
      },
      Observer: FakeObserver as unknown as typeof PerformanceObserver,
    });
    FakeObserver.last?.emit([{ entryType: 'largest-contentful-paint' }]);
    expect(img.getAttribute('src')).toBe(SP_WINNER_STILL_SRC);
    current = img;
    idleFn?.();
    expect(img.getAttribute('src')).toBe(SP_WINNER_ANIMATED_SRC);
  });
});
