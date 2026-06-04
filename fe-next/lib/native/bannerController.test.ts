import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  selectActiveBannerRequest,
  BannerController,
  type BannerOps,
  type BannerRequest,
} from './bannerController';

const anchor = (margin = 64): BannerRequest => ({ margin, variant: 'content', priority: 1 });
const slot = (margin = 200): BannerRequest => ({ margin, variant: 'game', priority: 2 });

describe('selectActiveBannerRequest (pure)', () => {
  it('returns null when no owner wants the banner', () => {
    expect(selectActiveBannerRequest({})).toBeNull();
    expect(selectActiveBannerRequest({ a: null, b: undefined })).toBeNull();
  });

  it('returns the only present request', () => {
    expect(selectActiveBannerRequest({ anchor: anchor() })).toEqual(anchor());
  });

  it('picks the highest-priority request when several are present', () => {
    const active = selectActiveBannerRequest({ anchor: anchor(), slot: slot() });
    expect(active).toEqual(slot()); // slot (2) beats anchor (1)
  });
});

describe('BannerController', () => {
  let ops: BannerOps & { show: ReturnType<typeof vi.fn>; hide: ReturnType<typeof vi.fn> };
  let c: BannerController;

  beforeEach(() => {
    vi.useFakeTimers();
    ops = { show: vi.fn().mockResolvedValue(undefined), hide: vi.fn().mockResolvedValue(undefined) };
    c = new BannerController({ retryDelaysMs: [1000, 3000] });
    c.setOps(ops);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the banner with the requested margin and variant', async () => {
    c.setRequest('anchor', anchor(64));
    await c.whenIdle();
    expect(ops.show).toHaveBeenCalledWith(64, 'content');
    expect(ops.hide).not.toHaveBeenCalled();
  });

  it('lets the higher-priority slot win over the anchor', async () => {
    c.setRequest('anchor', anchor(64));
    c.setRequest('slot', slot(200));
    await c.whenIdle();
    expect(ops.show).toHaveBeenLastCalledWith(200, 'game');
  });

  it('falls back to the anchor (does NOT blank) when the slot owner releases', async () => {
    c.setRequest('anchor', anchor(64));
    c.setRequest('slot', slot(200));
    await c.whenIdle();
    ops.show.mockClear();
    ops.hide.mockClear();

    c.clearRequest('slot'); // e.g. InlineBannerAd unmounts on navigation
    await c.whenIdle();

    expect(ops.hide).not.toHaveBeenCalled(); // never goes blank
    expect(ops.show).toHaveBeenCalledWith(64, 'content'); // anchor takes over
  });

  it('coalesces repeated identical requests into a single show (scroll/mutation churn)', async () => {
    c.setRequest('slot', slot(200));
    await c.whenIdle();
    c.setRequest('slot', slot(200));
    c.setRequest('slot', slot(200));
    await c.whenIdle();
    expect(ops.show).toHaveBeenCalledTimes(1);
  });

  it('hides the banner when the last owner releases', async () => {
    c.setRequest('slot', slot(200));
    await c.whenIdle();
    c.clearRequest('slot');
    await c.whenIdle();
    expect(ops.hide).toHaveBeenCalledTimes(1);
  });

  it('retries a re-show after an initial no-fill failure (bounded backoff)', async () => {
    c.setRequest('slot', slot(200));
    await c.whenIdle();
    ops.show.mockClear();

    c.notifyFailed(); // native destroyed the AdView on initial no-fill
    expect(ops.show).not.toHaveBeenCalled(); // not immediate
    await vi.advanceTimersByTimeAsync(1000); // first backoff
    await c.whenIdle();
    expect(ops.show).toHaveBeenCalledWith(200, 'game'); // recovered without navigation
  });

  it('caps retries and stops looping after the budget is exhausted', async () => {
    c.setRequest('slot', slot(200));
    await c.whenIdle();
    ops.show.mockClear();

    c.notifyFailed();
    await vi.advanceTimersByTimeAsync(1000);
    await c.whenIdle();
    c.notifyFailed();
    await vi.advanceTimersByTimeAsync(3000);
    await c.whenIdle();
    c.notifyFailed(); // budget [1000,3000] exhausted
    await vi.advanceTimersByTimeAsync(60000);
    await c.whenIdle();

    expect(ops.show).toHaveBeenCalledTimes(2); // exactly the 2 budgeted retries
  });

  it('resets the retry budget on a successful load', async () => {
    c.setRequest('slot', slot(200));
    await c.whenIdle();
    c.notifyFailed();
    await vi.advanceTimersByTimeAsync(1000);
    await c.whenIdle();
    c.notifyLoaded(); // healthy again
    ops.show.mockClear();

    c.notifyFailed(); // a later failure should start from the first backoff again
    await vi.advanceTimersByTimeAsync(1000);
    await c.whenIdle();
    expect(ops.show).toHaveBeenCalledTimes(1);
  });

  it('re-asserts the banner on app foreground / visibility (surface may have been dropped)', async () => {
    c.setRequest('slot', slot(200));
    await c.whenIdle();
    ops.show.mockClear();

    c.reassert();
    await c.whenIdle();
    expect(ops.show).toHaveBeenCalledWith(200, 'game'); // forced re-show even though "visible"
  });

  it('does nothing on reassert when no owner wants the banner', async () => {
    c.reassert();
    await c.whenIdle();
    expect(ops.show).not.toHaveBeenCalled();
    expect(ops.hide).not.toHaveBeenCalled();
  });

  it('hides the banner while suppressed even though an owner still wants it (drawer open)', async () => {
    c.setRequest('slot', slot(200));
    await c.whenIdle();
    expect(ops.show).toHaveBeenCalledTimes(1);
    ops.show.mockClear();

    c.setSuppressed(true); // side menu opened — banner must not composite over it
    await c.whenIdle();
    expect(ops.hide).toHaveBeenCalledTimes(1);
    expect(ops.show).not.toHaveBeenCalled();
  });

  it('re-shows the active request when suppression is released (drawer closed)', async () => {
    c.setRequest('slot', slot(200));
    await c.whenIdle();
    c.setSuppressed(true);
    await c.whenIdle();
    ops.show.mockClear();
    ops.hide.mockClear();

    c.setSuppressed(false); // drawer closed → banner returns without the owner re-firing
    await c.whenIdle();
    expect(ops.show).toHaveBeenCalledWith(200, 'game');
  });

  it('does nothing on suppress when no owner wants the banner', async () => {
    c.setSuppressed(true);
    await c.whenIdle();
    expect(ops.hide).not.toHaveBeenCalled();
    expect(ops.show).not.toHaveBeenCalled();
  });

  it('keeps the banner hidden when a new request arrives while suppressed', async () => {
    c.setSuppressed(true);
    await c.whenIdle();
    c.setRequest('slot', slot(200)); // owner appears while the drawer is still open
    await c.whenIdle();
    expect(ops.show).not.toHaveBeenCalled();
  });

  it('is idempotent — repeated setSuppressed(true) does not re-hide', async () => {
    c.setRequest('slot', slot(200));
    await c.whenIdle();
    c.setSuppressed(true);
    await c.whenIdle();
    ops.hide.mockClear();
    c.setSuppressed(true);
    await c.whenIdle();
    expect(ops.hide).not.toHaveBeenCalled();
  });

  it('does not swallow a reassert that arrives while a show is still in flight', async () => {
    // The foreground-recovery failure mode: a reconcile is mid-await on show()
    // when the app foregrounds. A naive "applied = NO_BANNER then schedule"
    // gets overwritten by the in-flight show's post-await assignment and the
    // forced pass coalesces to a no-op — the very case reassert exists for.
    let resolveFirstShow!: () => void;
    ops.show.mockImplementationOnce(
      () => new Promise<void>((r) => { resolveFirstShow = () => r(); }),
    );
    c.setRequest('slot', slot(200)); // kicks off the (now-pending) first show
    await Promise.resolve();

    c.reassert(); // app foregrounded mid-show — surface may be gone
    resolveFirstShow();
    await c.whenIdle();

    expect(ops.show).toHaveBeenCalledTimes(2); // forced re-show survived the race
  });
});
