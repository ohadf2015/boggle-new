import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  BLOCKING_OVERLAY_CLASS,
  hasBlockingOverlay,
  startBlockingOverlayWatch,
} from './blockingOverlay';

const html = () => document.documentElement;
const flush = () => new Promise((r) => setTimeout(r, 80));

function mountOverlay(attrs: Record<string, string>, style = ''): HTMLElement {
  const el = document.createElement('div');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (style) el.setAttribute('style', style);
  document.body.appendChild(el);
  return el;
}

describe('blockingOverlay — any open modal overlay stands the native banner down', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    html().classList.remove(BLOCKING_OVERLAY_CLASS);
  });

  it('GIVEN a full-screen aria-modal reveal (chest prize) THEN it counts as blocking', () => {
    expect(hasBlockingOverlay(document)).toBe(false);
    mountOverlay({ role: 'dialog', 'aria-modal': 'true' });
    expect(hasBlockingOverlay(document)).toBe(true);
  });

  it('GIVEN an alertdialog or an explicit data-blocks-banner marker THEN it counts as blocking', () => {
    const a = mountOverlay({ role: 'alertdialog' });
    expect(hasBlockingOverlay(document)).toBe(true);
    a.remove();
    mountOverlay({ 'data-blocks-banner': 'true' });
    expect(hasBlockingOverlay(document)).toBe(true);
  });

  it('GIVEN a non-modal dialog, a hidden modal, or a modal under display:none THEN it does not block', () => {
    mountOverlay({ role: 'dialog', 'aria-modal': 'false' }); // cookie sheet, coachmarks
    mountOverlay({ role: 'dialog', 'aria-modal': 'true', hidden: '' });
    const wrap = mountOverlay({}, 'display: none');
    const inner = document.createElement('div');
    inner.setAttribute('aria-modal', 'true');
    wrap.appendChild(inner);
    mountOverlay({ 'aria-modal': 'true' }, 'visibility: hidden');
    expect(hasBlockingOverlay(document)).toBe(false);
  });

  it('WHEN an overlay mounts THEN html gets the class, and WHEN it unmounts THEN the class clears', async () => {
    const onChange = vi.fn();
    const stop = startBlockingOverlayWatch(document, onChange);
    expect(html().classList.contains(BLOCKING_OVERLAY_CLASS)).toBe(false);

    const el = mountOverlay({ role: 'dialog', 'aria-modal': 'true' });
    await flush();
    expect(html().classList.contains(BLOCKING_OVERLAY_CLASS)).toBe(true);
    expect(onChange).toHaveBeenLastCalledWith(true);

    el.remove();
    await flush();
    expect(html().classList.contains(BLOCKING_OVERLAY_CLASS)).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith(false);
    stop();
  });

  it('WHEN an already-mounted overlay flips aria-modal on THEN the watch picks it up', async () => {
    const el = mountOverlay({ role: 'dialog' });
    const stop = startBlockingOverlayWatch(document);
    await flush();
    expect(html().classList.contains(BLOCKING_OVERLAY_CLASS)).toBe(false);
    el.setAttribute('aria-modal', 'true');
    await flush();
    expect(html().classList.contains(BLOCKING_OVERLAY_CLASS)).toBe(true);
    stop();
  });

  it('GIVEN an overlay already open at start THEN the class is set at once; stop() clears it', () => {
    mountOverlay({ 'aria-modal': 'true' });
    const stop = startBlockingOverlayWatch(document);
    expect(html().classList.contains(BLOCKING_OVERLAY_CLASS)).toBe(true);
    stop();
    expect(html().classList.contains(BLOCKING_OVERLAY_CLASS)).toBe(false);
  });
});
