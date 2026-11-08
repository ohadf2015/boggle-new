import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { listeners, removeBanner, handleRemove } = vi.hoisted(() => ({
  listeners: [] as Array<(info: { height?: number }) => void>,
  removeBanner: vi.fn(),
  handleRemove: vi.fn(),
}));

vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    addListener: vi.fn((_e: string, cb: (info: { height?: number }) => void) => {
      listeners.push(cb);
      return Promise.resolve({ remove: handleRemove });
    }),
    removeBanner,
  },
  BannerAdPluginEvents: { SizeChanged: 'bannerAdSizeChanged' },
}));

import { removeNativeBanner } from './removeNativeBanner';

describe('removeNativeBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    listeners.length = 0;
    removeBanner.mockReset().mockResolvedValue(undefined);
    handleRemove.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it('resolves only once the plugin reports the banner gone (SizeChanged 0), not when removeBanner resolves', async () => {
    let done = false;
    const p = removeNativeBanner(600).then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(10);
    expect(removeBanner).toHaveBeenCalled();
    expect(done).toBe(false); // removeBanner resolved, AdView teardown still pending

    listeners.forEach((l) => l({ height: 50 })); // unrelated size event
    await vi.advanceTimersByTimeAsync(10);
    expect(done).toBe(false);

    listeners.forEach((l) => l({ height: 0 }));
    await p;
    expect(done).toBe(true);
    expect(handleRemove).toHaveBeenCalled();
  });

  it('gives up waiting after the timeout when there was no banner to remove', async () => {
    let done = false;
    void removeNativeBanner(600).then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(599);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    expect(done).toBe(true);
  });

  it('does not hang when removeBanner rejects', async () => {
    removeBanner.mockRejectedValue(new Error('no banner'));
    await expect(removeNativeBanner(600)).resolves.toBeUndefined();
  });
});
