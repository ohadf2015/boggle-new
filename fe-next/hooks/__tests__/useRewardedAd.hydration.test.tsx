/**
 * useRewardedAd — SSR → hydration parity (t_b6fd1f5b)
 *
 * The hook seeds ad-gate state from localStorage / `typeof window` reads.
 * SSR computes with empty-storage, no-window defaults; if the client's FIRST
 * (hydration) render reads the real values, a returning capped user — or any
 * production-web user once a web provider (ayet/GD/H5, whose `isAvailable` is
 * `typeof window !== 'undefined'`) is enabled — gets a structural hydration
 * mismatch at every `canShowAd`-gated button (e.g. PuzzleCard.tsx:383/357).
 * React 19 recovers the nearest Suspense boundary, discarding + remounting
 * the whole subtree (double entrance animation, DOM churn on
 * /connections/daily).
 *
 * These tests render the hook's gates to string with `window` REMOVED (true
 * server semantics), then hydrate against that markup with storage seeded /
 * a web provider detectable, and assert ZERO recoverable hydration errors —
 * i.e. the first client render is byte-identical to SSR and the real values
 * converge via a normal post-mount update.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import type { ReactElement } from 'react';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock('@/hooks/useAdMob', () => ({
  useAdMob: () => ({ isAvailable: false, showRewarded: vi.fn(), prepareRewarded: vi.fn() }),
}));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isAvailable: false, isOnCrazyGamesPlatform: false }),
}));
vi.mock('@/utils/growthTracking', () => ({
  trackRewardedAdOffered: vi.fn(),
  trackRewardedAdWatched: vi.fn(),
  trackRewardedAdDeclined: vi.fn(),
  trackGrowthEvent: vi.fn(),
}));
vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({
    awardWatchedAd: vi.fn(async () => ({ awarded: 25 })),
    rewards: { WATCH_AD: 25 },
  }),
}));
// NOTE: useH5GamesAds / useGameDistributionAds / useAyetVideoAds are
// deliberately NOT mocked — the scenario-2 defect lives in their real
// `isAvailable = typeof window !== 'undefined'` read.

import { useRewardedAd } from '../useRewardedAd';

const DAILY_KEY = 'lexiclash_daily_ad_views';
const PLACEHOLDER_KEY = 'lexiclash_placeholder_ad_timestamps';

/** Mirrors the canShowAd-gated CTA shape used by PuzzleCard and friends. */
function AdGateProbe(): ReactElement {
  const ad = useRewardedAd({ rewardKind: 'coins' });
  return (
    <div>
      <span data-testid="views">{ad.viewsToday}</span>
      <span data-testid="limit">{String(ad.isDailyLimitReached)}</span>
      <span data-testid="cooldown">{String(ad.isPlaceholderCooldown)}</span>
      <span data-testid="placeholder">{String(ad.isPlaceholder)}</span>
      {ad.canShowAd ? <button type="button">Watch Ad</button> : null}
    </div>
  );
}

const SSR_GLOBALS = ['window', 'document', 'localStorage', 'location', 'navigator'] as const;

/**
 * renderToString with the browser globals REMOVED, so `typeof window ===
 * 'undefined'` really holds — in a DOM test env the server pass would
 * otherwise read the seeded localStorage/window and mask the mismatch.
 */
function renderOnServer(element: ReactElement): string {
  const g = globalThis as Record<string, unknown>;
  const saved = SSR_GLOBALS.map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  );
  for (const [key] of saved) {
    Object.defineProperty(globalThis, key, { value: undefined, configurable: true, writable: true });
  }
  try {
    return renderToString(element);
  } finally {
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete g[key];
    }
  }
}

interface HydrationResult {
  container: HTMLElement;
  recoverableErrors: string[];
  consoleErrors: string[];
}

async function hydrateAgainstSSR(html: string): Promise<HydrationResult> {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  const recoverableErrors: string[] = [];
  const consoleErrors: string[] = [];
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    consoleErrors.push(args.map(String).join(' '));
  });
  try {
    await act(async () => {
      hydrateRoot(container, <AdGateProbe />, {
        onRecoverableError: (error: unknown) => recoverableErrors.push(String(error)),
      });
      await Promise.resolve();
    });
  } finally {
    consoleSpy.mockRestore();
  }
  return { container, recoverableErrors, consoleErrors };
}

describe('useRewardedAd — SSR/hydration parity', () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    localStorage.removeItem(DAILY_KEY);
    localStorage.removeItem(PLACEHOLDER_KEY);
    delete (window as unknown as { __ayetAdsTest?: boolean }).__ayetAdsTest;
    vi.unstubAllEnvs();
    document.body.innerHTML = '';
  });

  it('returning capped user: first client render matches SSR byte-for-byte, then converges', async () => {
    // Seed a user who has spent today's coin-ad budget AND the hourly
    // placeholder cooldown — the cohort whose stored gates flip canShowAd.
    localStorage.setItem(
      DAILY_KEY,
      JSON.stringify({ date: new Date().toISOString().slice(0, 10), count: 10, featureCount: 0 }),
    );
    localStorage.setItem(PLACEHOLDER_KEY, JSON.stringify([Date.now(), Date.now(), Date.now()]));

    const html = renderOnServer(<AdGateProbe />);
    // SSR (no storage): cap not reached, zero views, placeholder mode hides CTA.
    expect(html).toContain('>0</span>');
    expect(html).not.toContain('Watch Ad');

    const { container, recoverableErrors, consoleErrors } = await hydrateAgainstSSR(html);

    // The acceptance criterion: zero hydration errors — the seeded-storage
    // values must NOT leak into the first client render.
    expect(recoverableErrors).toEqual([]);
    expect(consoleErrors.filter((e) => /hydrat|did not match|server rendered/i.test(e))).toEqual([]);

    // After mount the hook converges to the stored reality via a normal update.
    expect(container.querySelector('[data-testid="views"]')?.textContent).toBe('10');
    expect(container.querySelector('[data-testid="limit"]')?.textContent).toBe('true');
    expect(container.querySelector('[data-testid="cooldown"]')?.textContent).toBe('true');
    expect(container.textContent).not.toContain('Watch Ad');
  });

  it('web provider detectable post-mount (ayet): CTA appears via update, not via hydration mismatch', async () => {
    // Production-web shape: ayet enabled by env; the REAL provider hook reports
    // isAvailable = typeof window !== 'undefined' — false on SSR, true on the
    // client's hydration render. NODE_ENV=test ≠ production, so arm the
    // supported test override (same gate as ?ayet_test=1).
    vi.stubEnv('NEXT_PUBLIC_AYET_ADS_ENABLED', 'true');
    vi.stubEnv('NEXT_PUBLIC_AYET_PLACEMENT_ID', 'test-placement');

    const html = renderOnServer(<AdGateProbe />);
    // SSR (no window): no provider detectable → placeholder → CTA hidden.
    expect(html).toContain('>true</span>'); // isPlaceholder
    expect(html).not.toContain('Watch Ad');

    (window as unknown as { __ayetAdsTest?: boolean }).__ayetAdsTest = true;
    const { container, recoverableErrors, consoleErrors } = await hydrateAgainstSSR(html);

    expect(recoverableErrors).toEqual([]);
    expect(consoleErrors.filter((e) => /hydrat|did not match|server rendered/i.test(e))).toEqual([]);

    // Post-mount the provider is detected and the CTA appears — as a normal
    // client update, NOT a hydration-time structural flip.
    expect(container.querySelector('[data-testid="placeholder"]')?.textContent).toBe('false');
    expect(container.textContent).toContain('Watch Ad');
  });
});
