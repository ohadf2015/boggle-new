import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BannerController, type BannerOps, type BannerRequest } from './bannerController';

// The native AdMob plugin applies `margin` ONLY when it creates the AdView; a
// re-show (updateExistingAdView) just reloads the ad in place. So a banner first
// shown with margin 0 stayed glued to the screen bottom — on top of the tab bar —
// for the whole session (player report 2026-11-08, Android home). The controller
// must tear the AdView down and create a fresh one whenever the wanted margin
// differs from the one the native view was built with.

const anchor = (margin: number): BannerRequest => ({ margin, variant: 'content', priority: 1 });
const slot = (margin: number): BannerRequest => ({ margin, variant: 'game', priority: 2 });

type MockOps = BannerOps & {
  show: ReturnType<typeof vi.fn>;
  hide: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};

async function settle(c: BannerController) {
  // Let debounce timers fire and the serialized chain drain.
  for (let i = 0; i < 6; i++) {
    await vi.advanceTimersByTimeAsync(400);
  }
  await c.whenIdle();
}

describe('BannerController — recreate on margin change', () => {
  let ops: MockOps;
  let calls: string[];
  let c: BannerController;

  beforeEach(() => {
    vi.useFakeTimers();
    calls = [];
    ops = {
      show: vi.fn(async (m: number) => { calls.push(`show:${m}`); }),
      hide: vi.fn(async () => { calls.push('hide'); }),
      remove: vi.fn(async () => { calls.push('remove'); }),
    };
    c = new BannerController({ retryDelaysMs: [1000], recreateSettleMs: 250 });
    void c.setOps(ops);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears a leftover native banner once, before the first show of a page load', async () => {
    // A WebView reload keeps the native AdView alive with whatever margin it had.
    c.setRequest('anchor', anchor(64));
    await settle(c);
    expect(calls).toEqual(['remove', 'show:64']);
  });

  it('does not remove again when the same margin is re-shown (reassert, drawer release)', async () => {
    c.setRequest('anchor', anchor(64));
    await settle(c);
    calls.length = 0;
    await c.reassert();
    await settle(c);
    expect(calls).toEqual(['show:64']);
  });

  it('rebuilds the banner when the margin changes, so it moves above the tab bar', async () => {
    c.setRequest('anchor', anchor(0)); // first show on a screen without tabs
    await settle(c);
    calls.length = 0;
    c.setRequest('anchor', anchor(72)); // tabs appear: banner must lift
    await settle(c);
    expect(calls).toEqual(['remove', 'show:72']);
  });

  it('waits for the margin to stop changing before rebuilding (scroll churn)', async () => {
    c.setRequest('slot', slot(100));
    await settle(c);
    calls.length = 0;
    for (const m of [110, 120, 130, 140]) {
      c.setRequest('slot', slot(m));
      await vi.advanceTimersByTimeAsync(50);
    }
    await settle(c);
    expect(calls).toEqual(['remove', 'show:140']);
  });

  it('a hide keeps the native view, so the next show at the same margin is not a rebuild', async () => {
    c.setRequest('anchor', anchor(64));
    await settle(c);
    await c.setSuppressed(true);
    await settle(c);
    calls.length = 0;
    await c.setSuppressed(false);
    await settle(c);
    expect(calls).toEqual(['show:64']);
  });

  it('after an initial no-fill (native view destroyed) the retry shows without a remove', async () => {
    c.setRequest('anchor', anchor(64));
    await settle(c);
    calls.length = 0;
    c.notifyFailed();
    await settle(c);
    expect(calls).toEqual(['show:64']);
  });

  it('drops the rebuild when the owner withdrew while the margin was settling', async () => {
    c.setRequest('anchor', anchor(0));
    await settle(c);
    calls.length = 0;
    c.setRequest('anchor', anchor(72));
    c.clearRequest('anchor');
    await settle(c);
    expect(calls).toEqual(['hide']);
  });

  it('keeps the old behaviour when the platform gives no remove op', async () => {
    const legacy = { show: vi.fn().mockResolvedValue(undefined), hide: vi.fn().mockResolvedValue(undefined) };
    const lc = new BannerController({ retryDelaysMs: [1000] });
    void lc.setOps(legacy);
    lc.setRequest('anchor', anchor(0));
    await settle(lc);
    lc.setRequest('anchor', anchor(72));
    await settle(lc);
    expect(legacy.show).toHaveBeenLastCalledWith(72, 'content');
  });
});
