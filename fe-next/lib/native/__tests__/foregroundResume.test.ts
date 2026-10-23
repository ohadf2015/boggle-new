import { describe, it, expect, vi, afterEach } from 'vitest';
import { subscribeForegroundResume, releaseStuckPointers, keepRafLoopAlive, restartPixiTicker, RAF_STALL_MS } from '../foregroundResume';

describe('subscribeForegroundResume', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fires the callback when the document becomes visible again', () => {
    const cb = vi.fn();
    const stop = subscribeForegroundResume(cb);

    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(cb).not.toHaveBeenCalled();

    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(cb).toHaveBeenCalledTimes(1);

    stop();
  });

  it('does not fire after unsubscribe', () => {
    const cb = vi.fn();
    const stop = subscribeForegroundResume(cb);
    stop();
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(cb).not.toHaveBeenCalled();
  });
});

describe('releaseStuckPointers', () => {
  it('releases every captured pointer id on the element', () => {
    const el = document.createElement('div');
    const release = vi.fn();
    el.releasePointerCapture = release;
    releaseStuckPointers(el, [1, 7]);
    expect(release).toHaveBeenCalledWith(1);
    expect(release).toHaveBeenCalledWith(7);
  });

  it('is a no-op for a null element', () => {
    expect(() => releaseStuckPointers(null, [1])).not.toThrow();
  });
});

describe('subscribeForegroundResume — Capacitor resume', () => {
  it('fires on the Capacitor document `resume` event', () => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    const cb = vi.fn();
    const stop = subscribeForegroundResume(cb);
    document.dispatchEvent(new Event('resume'));
    expect(cb).toHaveBeenCalledTimes(1);
    stop();
  });
});

describe('keepRafLoopAlive', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('restarts a loop whose frames stopped while the page is visible', () => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    const restart = vi.fn();
    const ka = keepRafLoopAlive(restart);
    vi.advanceTimersByTime(RAF_STALL_MS + 1100);
    expect(restart).toHaveBeenCalled();
    ka.stop();
  });

  it('does not restart a healthy loop that keeps beating', () => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    const restart = vi.fn();
    const ka = keepRafLoopAlive(restart);
    for (let i = 0; i < 40; i++) { vi.advanceTimersByTime(100); ka.beat(); }
    expect(restart).not.toHaveBeenCalled();
    ka.stop();
  });

  it('does not count hidden time as a stall', () => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    const restart = vi.fn();
    const ka = keepRafLoopAlive(restart);
    vi.advanceTimersByTime(10_000);
    expect(restart).not.toHaveBeenCalled();
    ka.stop();
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  });

  it('restarts immediately on foreground resume, and never after stop()', () => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    const restart = vi.fn();
    const ka = keepRafLoopAlive(restart);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(restart).toHaveBeenCalledTimes(1);
    ka.stop();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(restart).toHaveBeenCalledTimes(1);
  });
});

describe('restartPixiTicker', () => {
  it('re-arms a running ticker (stop + start) so a dropped frame id is replaced', () => {
    const calls: string[] = [];
    const ticker = { started: true, stop: () => calls.push('stop'), start: () => calls.push('start') };
    restartPixiTicker({ ticker });
    expect(calls).toEqual(['stop', 'start']);
  });

  it('leaves a deliberately stopped ticker alone', () => {
    const ticker = { started: false, stop: vi.fn(), start: vi.fn() };
    restartPixiTicker({ ticker });
    expect(ticker.start).not.toHaveBeenCalled();
    expect(() => restartPixiTicker(null)).not.toThrow();
  });
});
