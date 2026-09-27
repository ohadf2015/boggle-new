import { describe, it, expect, vi, afterEach } from 'vitest';
import { subscribeForegroundResume, releaseStuckPointers } from '../foregroundResume';

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
