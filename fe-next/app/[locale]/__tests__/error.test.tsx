/**
 * Tests for app/[locale]/error.tsx — the segment error boundary.
 *
 * Regression target: "black screen when changing language (esp. from Hebrew)".
 * A cross-[locale] navigation can surface a stale-chunk ChunkLoadError during the
 * new-locale render. That error is caught by THIS boundary. An error boundary's
 * fallback must therefore be self-contained: React cannot re-catch an error thrown
 * *inside* a boundary's own fallback, so if the fallback depends on a heavy/lazy
 * chunk that is ALSO stale, the whole tree unmounts → blank navy <body> = the
 * reported "black screen" (and no Sentry signal, since captureError runs in an
 * effect that never fires when the fallback crashes).
 *
 * These tests pin the fallback to render with ZERO heavy/lazy dependencies.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Control the locale the boundary reads.
let mockLocale = 'he';
vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: mockLocale }),
}));

// Sentry must not fire real requests in tests.
const captureError = vi.fn();
vi.mock('@/utils/sentry', () => ({ captureError: (...a: unknown[]) => captureError(...a) }));

/**
 * Simulate the worst case: the fallback's mascot dependency is a STALE chunk that
 * throws when rendered. A robust error boundary must still render its recovery UI.
 * (If error.tsx no longer imports InteractiveMascot, this mock is simply unused.)
 */
vi.mock('@/components/ui/InteractiveMascot', () => ({
  InteractiveMascot: () => {
    throw Object.assign(new Error('Loading chunk mascot failed'), { name: 'ChunkLoadError' });
  },
  InteractiveMascotWithEntrance: () => {
    throw Object.assign(new Error('Loading chunk mascot failed'), { name: 'ChunkLoadError' });
  },
}));

import Error from '../error';

function makeError(name: string, message: string): Error & { digest?: string } {
  return Object.assign(new globalThis.Error(message), { name });
}

beforeEach(() => {
  captureError.mockClear();
  mockLocale = 'he';
  try { window.sessionStorage.clear(); } catch { /* ignore */ }
});

describe('app/[locale]/error.tsx — resilient fallback (black-screen fix)', () => {
  it('renders a recoverable card for a generic error even if the mascot chunk fails to load', () => {
    render(<Error error={makeError('Error', 'boom')} reset={vi.fn()} />);
    // Two recovery actions: refresh/retry + go home. These must be present no matter what.
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(2);
  });

  it('renders the recovery card in LTR locales too', () => {
    mockLocale = 'en';
    render(<Error error={makeError('Error', 'boom')} reset={vi.fn()} />);
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(2);
  });

  it('cache-bust hard-navigates exactly once on a ChunkLoadError (stale-deploy self-heal)', async () => {
    const reload = vi.fn();
    const replace = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: 'https://lexiclash.live/he/daily', reload, replace },
    });
    // caches / serviceWorker may be touched by clearCachesAndReload — stub lightly
    Object.defineProperty(window, 'caches', {
      configurable: true,
      value: { keys: async () => [], delete: async () => true },
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations: async () => [] },
    });
    render(<Error error={makeError('ChunkLoadError', 'Loading chunk 42 failed')} reset={vi.fn()} />);
    // clearCachesAndReload is async (activate SW → caches → navigate)
    await vi.waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    expect(String(replace.mock.calls[0][0])).toContain('_lc_chunk=');
    expect(reload).not.toHaveBeenCalled();
  });

  it('does NOT statically import the heavy InteractiveMascot component into the error fallback', () => {
    // Structural guard: the fallback must not depend on a heavy/lazy chunk that can
    // itself be stale during the very stale-chunk situation this boundary handles.
    const src = readFileSync(join(__dirname, '..', 'error.tsx'), 'utf8');
    expect(src).not.toMatch(/InteractiveMascot/);
    expect(src).not.toMatch(/framer-motion/);
  });
});

describe('app/[locale]/error.tsx — Home button is education-aware (sectionHome)', () => {
  it('routes to /{locale}/education for an education pathname, not bare /{locale}', () => {
    mockLocale = 'es';
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '', pathname: '/es/teacher/classroom/x', reload: vi.fn(), replace: vi.fn() },
    });
    render(<Error error={makeError('Error', 'boom')} reset={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // second button is the "go home" action
    expect(window.location.href).toBe('/es/education');
  });

  it('routes to bare /{locale} for a non-education pathname', () => {
    mockLocale = 'es';
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '', pathname: '/es/multiplayer', reload: vi.fn(), replace: vi.fn() },
    });
    render(<Error error={makeError('Error', 'boom')} reset={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);
    expect(window.location.href).toBe('/es');
  });
});

describe('app/global-error.tsx — last-resort boundary depends on no lazy chunk', () => {
  it('imports no icon/animation library (emoji-only, so it can never fail to render)', () => {
    // global-error is the final fallback when [locale]/error.tsx itself throws.
    // If it depended on a chunk (e.g. lucide-react) that was also stale, it would
    // crash too → unrecoverable black screen. It must be dependency-minimal.
    const src = readFileSync(join(__dirname, '..', '..', 'global-error.tsx'), 'utf8');
    expect(src).not.toMatch(/lucide-react/);
    expect(src).not.toMatch(/framer-motion/);
    expect(src).not.toMatch(/InteractiveMascot/);
  });

  it('uses cache-bust clearCachesAndReload — not bare location.reload (t_9cc3561f)', () => {
    const src = readFileSync(join(__dirname, '..', '..', 'global-error.tsx'), 'utf8');
    expect(src).toMatch(/clearCachesAndReload/);
    // Reject real call sites; comments mentioning reload are fine.
    expect(src).not.toMatch(/window\.location\.reload\s*\(/);
    expect(src.split('\n').filter((l) => /location\.reload\s*\(/.test(l) && !l.trim().startsWith('//') && !l.includes('*')).length).toBe(0);
  });
});

describe('app/global-error.tsx — Home button is education-aware (sectionHome)', () => {
  beforeEach(() => {
    vi.doMock('@/utils/sentry', () => ({ captureError: vi.fn() }));
    vi.doMock('@/utils/crashlytics', () => ({ recordNativeError: vi.fn() }));
  });

  it('routes to /{locale}/education for an education pathname, not bare /{locale}', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '', pathname: '/he/student/lessons/5', reload: vi.fn(), replace: vi.fn() },
    });
    const { default: GlobalError } = await import('../../global-error');
    render(<GlobalError error={makeError('Error', 'boom')} reset={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // second button is the "go home" action
    expect(window.location.href).toBe('/he/education');
  });

  it('routes to bare /{locale} for a non-education pathname', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '', pathname: '/he/daily', reload: vi.fn(), replace: vi.fn() },
    });
    const { default: GlobalError } = await import('../../global-error');
    render(<GlobalError error={makeError('Error', 'boom')} reset={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);
    expect(window.location.href).toBe('/he');
  });
});
