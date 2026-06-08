import { vi } from 'vitest';
/**
 * Hydration-safety for viewport/media hooks.
 *
 * usePrefersReducedMotion and useMobilePortrait read window.matchMedia /
 * window.innerWidth in their useState initializer → false on SSR (no window) but
 * the real value on the client's FIRST render. When they differ (reduced-motion
 * users; mobile-portrait users) the divergence triggers React #418 and
 * whole-tree regeneration on every page that uses them.
 *
 * Contract: the first render (pre-effect) must be `false` regardless of the
 * media/viewport, matching SSR. The real value is synced in the mount effect.
 * renderToString runs no effects, so it reflects exactly that pre-effect render
 * even though jsdom defines window. (No UX regression: the SSR HTML already
 * paints the default state, so the sync read never avoided a flash — it only
 * converted a clean reflow into an error-driven regeneration.)
 */

import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { usePrefersReducedMotion } from '../usePrefersReducedMotion';
import { useMobilePortrait } from '../useMobilePortrait';

describe('viewport hooks - hydration safety', () => {
  it('usePrefersReducedMotion first render is false even when reduce is matched', () => {
    const original = window.matchMedia;
    // @ts-expect-error test stub
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    });
    const Probe = () => createElement('span', null, usePrefersReducedMotion() ? 'reduce' : 'motion');
    const html = renderToString(createElement(Probe));
    expect(html).toContain('motion');
    expect(html).not.toContain('reduce');
    window.matchMedia = original;
  });

  it('useMobilePortrait first render is false even on a mobile-portrait viewport', () => {
    const w = Object.getOwnPropertyDescriptor(window, 'innerWidth');
    const h = Object.getOwnPropertyDescriptor(window, 'innerHeight');
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const Probe = () => createElement('span', null, useMobilePortrait() ? 'portrait' : 'not-portrait');
    const html = renderToString(createElement(Probe));
    expect(html).toContain('not-portrait');
    if (w) Object.defineProperty(window, 'innerWidth', w);
    if (h) Object.defineProperty(window, 'innerHeight', h);
  });
});
