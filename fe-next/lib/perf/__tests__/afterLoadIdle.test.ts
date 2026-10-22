import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { afterLoadIdle, AFTER_LOAD_IDLE_DELAY_MS } from '../afterLoadIdle';

describe('afterLoadIdle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs after the delay once the page has already loaded', () => {
    // jsdom default: document.readyState === 'complete'
    const fn = vi.fn();
    afterLoadIdle(fn);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(AFTER_LOAD_IDLE_DELAY_MS + 10);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('waits for the load event before starting the delay', () => {
    const original = document.readyState;
    Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true });
    try {
      const fn = vi.fn();
      afterLoadIdle(fn);
      vi.advanceTimersByTime(AFTER_LOAD_IDLE_DELAY_MS * 4);
      expect(fn).not.toHaveBeenCalled();
      window.dispatchEvent(new Event('load'));
      vi.advanceTimersByTime(AFTER_LOAD_IDLE_DELAY_MS + 10);
      expect(fn).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(document, 'readyState', { value: original, configurable: true });
    }
  });

  it('cancel before load prevents the run entirely', () => {
    const original = document.readyState;
    Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true });
    try {
      const fn = vi.fn();
      const cancel = afterLoadIdle(fn);
      cancel();
      window.dispatchEvent(new Event('load'));
      vi.advanceTimersByTime(AFTER_LOAD_IDLE_DELAY_MS * 4);
      expect(fn).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(document, 'readyState', { value: original, configurable: true });
    }
  });

  it('cancel during the delay window prevents the run', () => {
    const fn = vi.fn();
    const cancel = afterLoadIdle(fn);
    vi.advanceTimersByTime(AFTER_LOAD_IDLE_DELAY_MS - 10);
    cancel();
    vi.advanceTimersByTime(AFTER_LOAD_IDLE_DELAY_MS * 2);
    expect(fn).not.toHaveBeenCalled();
  });

  it('honors a custom delay', () => {
    const fn = vi.fn();
    afterLoadIdle(fn, 300);
    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
