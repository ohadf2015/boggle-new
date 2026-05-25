import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { throttleLatest } from '../throttle';

describe('throttleLatest', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires immediately on the leading edge with the first args', () => {
    const fn = vi.fn();
    const throttled = throttleLatest(fn, 150);

    throttled('a');

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith('a');
  });

  it('coalesces a burst into a single trailing call with the LATEST args', () => {
    const fn = vi.fn();
    const throttled = throttleLatest(fn, 150);

    throttled('a'); // leading, fires now
    throttled('b'); // within window, schedules trailing
    throttled('c'); // within window, updates latest
    throttled('d'); // within window, updates latest

    // Only the leading call has fired so far.
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith('a');

    // Trailing edge fires once with the most recent args ('d'), not stale ('b').
    vi.advanceTimersByTime(150);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('d');
  });

  it('guarantees periodic flushes during a sustained flood (latency-bounded)', () => {
    const fn = vi.fn();
    const throttled = throttleLatest(fn, 100);

    // Fire 50 calls, 10ms apart = 500ms of sustained flood.
    for (let i = 0; i < 50; i++) {
      throttled(i);
      vi.advanceTimersByTime(10);
    }

    // A raw (unthrottled) stream would have called fn 50 times.
    // Throttled to 100ms it should be far fewer — leading + one per ~100ms window.
    expect(fn.mock.calls.length).toBeLessThanOrEqual(7);
    expect(fn.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('does not fire a trailing call when there was only a single (leading) call', () => {
    const fn = vi.fn();
    const throttled = throttleLatest(fn, 150);

    throttled('only');
    vi.advanceTimersByTime(500);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancel() drops a pending trailing call', () => {
    const fn = vi.fn();
    const throttled = throttleLatest(fn, 150);

    throttled('a'); // leading
    throttled('b'); // schedules trailing
    throttled.cancel();

    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1); // only the leading call survived
  });

  it('flush() fires the pending trailing call immediately with latest args', () => {
    const fn = vi.fn();
    const throttled = throttleLatest(fn, 150);

    throttled('a'); // leading
    throttled('b');
    throttled('c'); // latest pending

    throttled.flush();
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('c');
  });

  it('treats the leading edge as fresh again after the window has elapsed', () => {
    const fn = vi.fn();
    const throttled = throttleLatest(fn, 150);

    throttled('first'); // leading at t=0
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(300); // window long past, no pending

    throttled('second'); // should fire immediately as a fresh leading call
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('second');
  });
});
