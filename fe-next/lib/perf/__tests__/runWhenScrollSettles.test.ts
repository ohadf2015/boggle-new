import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runWhenScrollSettles, SCROLL_QUIET_MS, SCROLL_SETTLE_MAX_MS } from '../runWhenScrollSettles';

const scroll = () => window.dispatchEvent(new Event('scroll'));

describe('runWhenScrollSettles', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs soon when the page is not scrolling', () => {
    const fn = vi.fn();
    runWhenScrollSettles(fn);
    vi.advanceTimersByTime(SCROLL_QUIET_MS + 50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('waits while the visitor keeps scrolling, then runs once it goes quiet', () => {
    const fn = vi.fn();
    runWhenScrollSettles(fn);
    for (let i = 0; i < 10; i++) {
      scroll();
      vi.advanceTimersByTime(150);
    }
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(SCROLL_QUIET_MS + 50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('never waits longer than the cap, even under endless scrolling', () => {
    const fn = vi.fn();
    runWhenScrollSettles(fn);
    for (let t = 0; t < SCROLL_SETTLE_MAX_MS + 500; t += 100) {
      scroll();
      vi.advanceTimersByTime(100);
    }
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancel stops a pending run', () => {
    const fn = vi.fn();
    const cancel = runWhenScrollSettles(fn);
    cancel();
    vi.advanceTimersByTime(SCROLL_SETTLE_MAX_MS + 1000);
    expect(fn).not.toHaveBeenCalled();
  });

  it('spaces loaders released by the same pause, so their evaluations never stack', () => {
    const a = vi.fn();
    const b = vi.fn();
    runWhenScrollSettles(a);
    runWhenScrollSettles(b);
    vi.advanceTimersByTime(SCROLL_QUIET_MS + 50);
    expect(a.mock.calls.length + b.mock.calls.length).toBe(1);
    vi.advanceTimersByTime(SCROLL_QUIET_MS + 50);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });
});
