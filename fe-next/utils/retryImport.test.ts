import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryImport } from './retryImport';

describe('retryImport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    try {
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves with the module when the factory succeeds on the first try', async () => {
    const mod = { default: 'Component' };
    const factory = vi.fn().mockResolvedValue(mod);

    const wrapped = retryImport(factory);
    await expect(wrapped()).resolves.toBe(mod);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('retries a transient failure and then resolves', async () => {
    const mod = { default: 'Component' };
    const factory = vi
      .fn()
      .mockRejectedValueOnce(new Error('network blip'))
      .mockResolvedValueOnce(mod);

    const wrapped = retryImport(factory, { retries: 2, interval: 100 });
    const promise = wrapped();

    // Let the first (failed) attempt settle, then fire the backoff timer.
    await vi.advanceTimersByTimeAsync(100);

    await expect(promise).resolves.toBe(mod);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('rejects after exhausting retries on a non-chunk error', async () => {
    const err = new Error('boom');
    const factory = vi.fn().mockRejectedValue(err);
    const reload = vi.fn();

    const wrapped = retryImport(factory, { retries: 1, interval: 50, reload });
    const promise = wrapped();
    const assertion = expect(promise).rejects.toBe(err);

    await vi.advanceTimersByTimeAsync(50);
    await assertion;

    expect(factory).toHaveBeenCalledTimes(2); // initial + 1 retry
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads once when a chunk-load error persists after retries', async () => {
    const chunkErr = new Error('Loading chunk 42 failed.');
    chunkErr.name = 'ChunkLoadError';
    const factory = vi.fn().mockRejectedValue(chunkErr);
    const reload = vi.fn();

    const wrapped = retryImport(factory, { retries: 1, interval: 50, reload });
    // Promise stays pending on purpose (page reloads), so don't await it.
    wrapped().catch(() => {});

    await vi.advanceTimersByTimeAsync(50);

    expect(factory).toHaveBeenCalledTimes(2);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload twice within the guard window', async () => {
    const chunkErr = new Error('Loading chunk 7 failed.');
    chunkErr.name = 'ChunkLoadError';
    const factory = vi.fn().mockRejectedValue(chunkErr);
    const reload = vi.fn();

    const wrapped = retryImport(factory, { retries: 0, interval: 10, reload });

    wrapped().catch(() => {});
    await vi.advanceTimersByTimeAsync(10);
    wrapped().catch(() => {});
    await vi.advanceTimersByTimeAsync(10);

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('clears caches and unregisters service workers before reload on chunk error', async () => {
    const chunkErr = new Error('Loading chunk 42 failed.');
    chunkErr.name = 'ChunkLoadError';
    const factory = vi.fn().mockRejectedValue(chunkErr);

    const mockCachesDelete = vi.fn().mockResolvedValue(undefined);
    const mockSWUnregister = vi.fn().mockResolvedValue(true);
    const mockLocationReload = vi.fn();

    Object.defineProperty(window, 'caches', {
      configurable: true,
      value: {
        keys: vi.fn().mockResolvedValue(['cache1', 'cache2']),
        delete: mockCachesDelete,
      },
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistrations: vi
          .fn()
          .mockResolvedValue([
            { unregister: mockSWUnregister },
            { unregister: mockSWUnregister },
          ]),
      },
    });

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: mockLocationReload },
    });

    const wrapped = retryImport(factory, { retries: 0, interval: 10 });
    wrapped().catch(() => {});

    await vi.advanceTimersByTimeAsync(10);
    // Give async cache operations time to settle
    await vi.runAllTimersAsync();

    // Verify caches were deleted before reload
    expect(mockCachesDelete).toHaveBeenCalledTimes(2);
    expect(mockSWUnregister).toHaveBeenCalledTimes(2);
    expect(mockLocationReload).toHaveBeenCalledTimes(1);
  });
});
