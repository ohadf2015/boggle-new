import { describe, it, expect, vi } from 'vitest';
import { kickWebViewRepaint } from '../webviewRepaint';

function makeFakeDoc() {
  const style: Record<string, string> = { transform: '' };
  const el = {
    style,
    // happy-dom/jsdom return a number here; a getter that records reads lets us
    // assert the synchronous reflow happened.
    _offsetReads: 0,
    get offsetHeight() {
      this._offsetReads += 1;
      return 0;
    },
  };
  return { documentElement: el } as unknown as Document & {
    documentElement: typeof el;
  };
}

describe('kickWebViewRepaint', () => {
  it('returns false (no-op) when there is no documentElement', () => {
    const doc = {} as unknown as Document;
    expect(kickWebViewRepaint({ doc, schedule: () => {} })).toBe(false);
  });

  it('promotes <html> to its own composite layer to force a repaint', () => {
    const doc = makeFakeDoc();
    kickWebViewRepaint({ doc, schedule: () => {} });
    expect(doc.documentElement.style.transform).toBe('translateZ(0)');
  });

  it('forces a synchronous reflow before restoring (reads offsetHeight)', () => {
    const doc = makeFakeDoc();
    kickWebViewRepaint({ doc, schedule: () => {} });
    expect(doc.documentElement._offsetReads).toBeGreaterThanOrEqual(1);
  });

  it('restores the previous transform on the next frame', () => {
    const doc = makeFakeDoc();
    doc.documentElement.style.transform = 'rotate(2deg)'; // pre-existing transform
    let scheduled: (() => void) | null = null;
    kickWebViewRepaint({ doc, schedule: (cb) => { scheduled = cb; } });

    // Mid-kick: layer is promoted.
    expect(doc.documentElement.style.transform).toBe('translateZ(0)');
    // Next frame: original transform restored, not clobbered to empty.
    expect(scheduled).toBeTypeOf('function');
    scheduled!();
    expect(doc.documentElement.style.transform).toBe('rotate(2deg)');
  });

  it('returns true when the kick was applied', () => {
    const doc = makeFakeDoc();
    expect(kickWebViewRepaint({ doc, schedule: () => {} })).toBe(true);
  });

  it('uses the injected scheduler exactly once', () => {
    const doc = makeFakeDoc();
    const schedule = vi.fn();
    kickWebViewRepaint({ doc, schedule });
    expect(schedule).toHaveBeenCalledTimes(1);
  });

  it('does not leave a stuck transform when two kicks overlap before restore', () => {
    // REGRESSION: exiting MP results can fire an interstitial-teardown kick and a
    // hideBanner kick in the same frame. A 2nd kick must not capture the 1st kick's
    // own `translateZ(0)` as the "previous" value — otherwise its restore re-applies
    // translateZ(0), leaving <html> with a permanent transform. A transform on <html>
    // reparents every `position: fixed` element (the bottom nav) → nav stops sticking.
    const doc = makeFakeDoc();
    const queue: Array<() => void> = [];
    const schedule = (cb: () => void) => { queue.push(cb); };

    kickWebViewRepaint({ doc, schedule }); // kick A
    kickWebViewRepaint({ doc, schedule }); // kick B, before A's restore runs

    // Flush both restores in scheduling order (rAF semantics).
    queue.forEach((cb) => cb());

    expect(doc.documentElement.style.transform).toBe('');
  });

  it('restores the true original after overlapping kicks (not a kick artifact)', () => {
    const doc = makeFakeDoc();
    doc.documentElement.style.transform = 'rotate(2deg)';
    const queue: Array<() => void> = [];
    const schedule = (cb: () => void) => { queue.push(cb); };

    kickWebViewRepaint({ doc, schedule });
    kickWebViewRepaint({ doc, schedule });
    queue.forEach((cb) => cb());

    expect(doc.documentElement.style.transform).toBe('rotate(2deg)');
  });

  // REGRESSION (side-menu unscrollable on native): showBanner now kicks a
  // repaint. Bringing a banner UP composites a fresh native SurfaceView over
  // the WebView, which can throttle or DROP the WebView's requestAnimationFrame.
  // The restore was scheduled ONLY via rAF — so a dropped rAF leaves
  // translateZ(0) stuck on <html>. A stuck transform makes <html> the
  // containing block for every position:fixed element: the side-menu drawer
  // (fixed top-0 bottom-0) then sizes to DOCUMENT height instead of viewport,
  // so its overflow-y-auto content never overflows → the menu can't scroll.
  // The default scheduler must therefore ALSO arm a timer fallback that fires
  // even while rAF is paused.
  it('restores the transform via a timer fallback when rAF never fires (paused WebView)', () => {
    vi.useFakeTimers();
    // rAF that NEVER invokes its callback — models a dropped/throttled frame loop.
    const rafSpy = vi
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation(() => 0 as unknown as number);
    try {
      const doc = makeFakeDoc();
      // No injected schedule → uses the real default scheduler (rAF + fallback).
      kickWebViewRepaint({ doc });

      // rAF dropped the restore → layer still promoted.
      expect(doc.documentElement.style.transform).toBe('translateZ(0)');

      // The timer fallback fires even though rAF never did → transform restored.
      vi.runAllTimers();
      expect(doc.documentElement.style.transform).toBe('');
    } finally {
      rafSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it('does not restore twice when both rAF and the timer fallback fire', () => {
    vi.useFakeTimers();
    // rAF that DOES invoke its callback synchronously on the next microtask flush.
    const rafCbs: Array<() => void> = [];
    const rafSpy = vi
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        rafCbs.push(() => cb(0));
        return rafCbs.length as unknown as number;
      });
    try {
      const doc = makeFakeDoc();
      doc.documentElement.style.transform = 'rotate(2deg)';
      kickWebViewRepaint({ doc });

      // rAF fires first and restores the true original.
      rafCbs.forEach((fn) => fn());
      expect(doc.documentElement.style.transform).toBe('rotate(2deg)');

      // Later the fallback timer fires too — it must be a no-op, not re-clobber.
      vi.runAllTimers();
      expect(doc.documentElement.style.transform).toBe('rotate(2deg)');
    } finally {
      rafSpy.mockRestore();
      vi.useRealTimers();
    }
  });
});
