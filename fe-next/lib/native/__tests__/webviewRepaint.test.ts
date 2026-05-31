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
});
