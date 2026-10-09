/**
 * Landing (`/` / `/en`) is the mobile PSI surface. gtag.js is ~155KiB br /
 * ~450KiB parsed — the same weight class as the deleted AdSense loader.
 * Scroll + 3s bounce fallback let PageSpeed pull it into the load window.
 * Landing must use the same pointer-only / no-fallback gate as game routes.
 */
import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, act } from '@testing-library/react';
import { SCROLL_QUIET_MS } from '@/lib/perf/runWhenScrollSettles';

const GA4_SRC = 'https://www.googletagmanager.com/gtag/js?id=G-7VLG16BJQH';
const scriptsFor = () =>
  Array.from(document.querySelectorAll('script')).filter((s) => s.getAttribute('src') === GA4_SRC);
const settle = () => act(() => { vi.advanceTimersByTime(SCROLL_QUIET_MS + 50); });

const pathnameRef = vi.hoisted(() => ({ current: '/' }));
vi.mock('next/navigation', () => ({
  usePathname: () => pathnameRef.current,
}));

import { LocaleGtagLoader } from '@/components/LocaleGtagLoader';

describe('LocaleGtagLoader landing PSI gate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pathnameRef.current = '/';
    scriptsFor().forEach((s) => s.remove());
  });
  afterEach(() => {
    vi.useRealTimers();
    scriptsFor().forEach((s) => s.remove());
  });

  it.each(['/', '/en', '/he'])('does not inject gtag.js on 3s fallback or scroll for %s', (path) => {
    pathnameRef.current = path;
    render(<LocaleGtagLoader />);
    act(() => { vi.advanceTimersByTime(10_000); });
    settle();
    expect(scriptsFor()).toHaveLength(0);
    act(() => { window.dispatchEvent(new Event('scroll')); });
    settle();
    expect(scriptsFor()).toHaveLength(0);
    act(() => { window.dispatchEvent(new Event('pointermove')); });
    settle();
    expect(scriptsFor()).toHaveLength(0);
  });

  it('injects gtag.js on pointerdown on the landing path', () => {
    pathnameRef.current = '/en';
    render(<LocaleGtagLoader />);
    act(() => { window.dispatchEvent(new Event('pointerdown')); });
    settle();
    expect(scriptsFor()).toHaveLength(1);
    expect(scriptsFor()[0].async).toBe(true);
  });

  it('still uses the 3s bounce fallback on a non-landing content route', () => {
    pathnameRef.current = '/en/blog';
    render(<LocaleGtagLoader />);
    act(() => { vi.advanceTimersByTime(3_000); });
    settle();
    expect(scriptsFor()).toHaveLength(1);
  });

  it('source-wires isLandingPath so a future edit cannot drop the landing gate', () => {
    const src = readFileSync(resolve(__dirname, '../LocaleGtagLoader.tsx'), 'utf8');
    expect(src).toContain('isLandingPath');
    expect(src).toMatch(/isHeavyGamePath\(pathname\)\s*\|\|\s*isLandingPath\(pathname\)/);
  });
});
