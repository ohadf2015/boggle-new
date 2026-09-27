import { vi } from 'vitest';
/**
 * Hydration safety for useDesktopLayout / useIsDesktop.
 *
 * The hook's useState initializer read window.innerWidth/innerHeight → mobile on
 * SSR (no window) but the real viewport on the client's FIRST render. On desktop
 * the two diverge, so any consumer that branches on isDesktop (e.g. AutoHideFooter)
 * triggers React #418 and whole-tree regeneration. This is the ROOT of that class
 * (20+ consumers).
 *
 * Contract: the first render (renderToString = no effects = pre-mount) must be the
 * SSR mobile default regardless of the real viewport. The effect syncs the real
 * value post-mount. No UX cost: SSR already paints mobile-first, so the desktop
 * client's first frame is unchanged — only the mismatch is removed.
 */

import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { useIsDesktop } from '../useDesktopLayout';

describe('useDesktopLayout - hydration safety', () => {
  it('useIsDesktop first render is false even on a desktop viewport', () => {
    const w = Object.getOwnPropertyDescriptor(window, 'innerWidth');
    const h = Object.getOwnPropertyDescriptor(window, 'innerHeight');
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
    const Probe = () => createElement('span', null, useIsDesktop() ? 'desktop' : 'mobile');
    const html = renderToString(createElement(Probe));
    expect(html).toContain('mobile');
    expect(html).not.toContain('desktop');
    if (w) Object.defineProperty(window, 'innerWidth', w);
    if (h) Object.defineProperty(window, 'innerHeight', h);
  });
});
