/**
 * The locale layout mounts a stack of post-hydration-only widgets (install
 * prompts, cookie banner, churn tracker, seasonal countdown). They were already
 * behind `next/dynamic`, but with `ssr` defaulting to true — which keeps the
 * module in the layout's own entry chunk so hydration can match. Measured on the
 * production build 2026-08-07, `app/[locale]/layout-*.js` was 175kB raw / 58kB gz
 * and included the New Year countdown (10kB), comeback bonus (7kB), Android
 * promo (6kB) and PWA prompt (5kB) — shipped on every route, in August.
 *
 * `ssr: false` is what actually removes them from the initial load, and Next
 * forbids it inside a Server Component, hence this client wrapper. Every dynamic
 * import here must therefore stay `ssr: false` or the split silently reverts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '..', 'DeferredLayoutWidgets.tsx');

describe('DeferredLayoutWidgets', () => {
  const src = readFileSync(SRC, 'utf8');

  it('is a client component', () => {
    expect(src.trimStart().startsWith("'use client'")).toBe(true);
  });

  it('loads every widget with ssr: false', () => {
    const calls = [...src.matchAll(/nextDynamic\(([\s\S]*?)\n\);/g)].map((m) => m[1]);
    expect(calls.length).toBeGreaterThan(0);
    const eager = calls.filter((c) => !/ssr:\s*false/.test(c));
    expect(eager, 'every deferred widget must opt out of SSR').toEqual([]);
  });

  it('keeps the layout free of its own copies of these imports', () => {
    const layout = readFileSync(
      path.resolve(__dirname, '..', '..', 'app', '[locale]', 'layout.tsx'),
      'utf8',
    );
    for (const widget of [
      'PWAInstallPrompt',
      'AndroidAppInstallPromo',
      'NewYearCountdown',
      'CookieConsent',
      'ChurnSignalTracker',
    ]) {
      expect(layout, `${widget} should be mounted via DeferredLayoutWidgets`).not.toContain(
        `import('@/components/${widget}')`,
      );
    }
  });
});
