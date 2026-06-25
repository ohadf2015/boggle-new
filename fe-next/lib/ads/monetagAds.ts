/**
 * Monetag SDK loader + typed rewarded wrapper.
 *
 * Web surface only — instant-approval, no-traffic-minimum rewarded fill for the
 * own-domain word game (AdSense/CrazyGames/AdinPlay all reject at our scale; see
 * docs/2026-06-04-web-ad-provider-after-adsense-rejection.md). Monetag's website
 * "Rewarded Interstitial" format exposes a `show_<zoneId>()` promise that
 * resolves once the user watches to the reward button — that resolution is the
 * completion signal we convert into a coin grant.
 *
 * AdMob-collision guard (the load-bearing constraint): Monetag is popunder-class.
 * It must NEVER load or show inside the native Capacitor app (where AdMob serves
 * from the remote www.lexiclash.live URL — a Monetag popunder there would be an
 * AdMob behavioral-policy violation and risk the linked AdSense/AdMob account),
 * nor inside a game-portal iframe (CrazyGames/Poki forbid 3rd-party ads). Unlike
 * the Ayet/GD libs (which delegate gating to the caller), THIS lib hard-gates the
 * script injection itself on `isNative()` + top-frame, defense-in-depth.
 *
 * Contract (https://docs.monetag.com/):
 *   - <script src="//libtl.com/sdk.js" data-zone="<id>" data-sdk="show_<id>">
 *   - `window['show_<id>']()` returns a Promise; resolve = watched (reward owed),
 *     reject = dismissed / no fill / blocked.
 */

import { isNative } from '@/utils/platform';

export interface ShowRewardedMonetagOptions {
  /** Injectable for tests; defaults to `window['show_<zoneId>']()`. */
  showAdFn?: () => Promise<void>;
  /** Zone id; defaults to the configured env zone. */
  zoneId?: string;
}

const SCRIPT_ID = 'monetag-sdk';
const SCRIPT_SRC = 'https://libtl.com/sdk.js';

let loadPromise: Promise<void> | null = null;
let configured = false;

/** Resolve the configured Monetag zone id. Empty = stay dark. */
export function getMonetagZoneId(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MONETAG_ZONE_ID) {
    return process.env.NEXT_PUBLIC_MONETAG_ZONE_ID;
  }
  return '';
}

/**
 * True only on the web top-frame surface. Blocks the native app (AdMob lives
 * there) and any embedding iframe (game portals forbid 3rd-party ads).
 */
export function isMonetagAllowedSurface(): boolean {
  if (typeof window === 'undefined') return false;
  if (isNative()) return false;
  try {
    return window.self === window.top;
  } catch {
    // Cross-origin frame access throws → we're embedded → not allowed.
    return false;
  }
}

function defaultShowAd(zoneId: string): Promise<void> {
  const fnName = `show_${zoneId}`;
  const fn = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>)[fnName] : undefined;
  if (typeof fn !== 'function') {
    return Promise.reject(new Error('monetag-sdk-unavailable'));
  }
  return (fn as () => Promise<void>)();
}

/**
 * Show a rewarded Monetag ad. Resolves `true` iff the user watched it (the
 * `show_<id>()` promise resolved), and REJECTS if dismissed / no fill / the SDK
 * is unavailable / the surface is native (AdMob guard) — so the caller routes to
 * its error path and falls through to the next provider.
 */
export async function showRewardedMonetag(opts: ShowRewardedMonetagOptions = {}): Promise<boolean> {
  if (isNative()) {
    return Promise.reject(new Error('monetag-native-blocked'));
  }
  const zoneId = opts.zoneId ?? getMonetagZoneId();
  const showAdFn = opts.showAdFn ?? (() => defaultShowAd(zoneId));
  await showAdFn();
  return true;
}

/**
 * Idempotent: inject the Monetag SDK script once with the zone wired, resolve on
 * load. No-op (resolves without injecting) on a disallowed surface — the script
 * never enters the native webview or a portal iframe.
 */
export function loadMonetagSdk(zoneId: string = getMonetagZoneId()): Promise<void> {
  if (!isMonetagAllowedSurface()) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = SCRIPT_SRC;
    script.dataset.zone = zoneId;
    script.dataset.sdk = `show_${zoneId}`;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => {
      loadPromise = null;
      reject(new Error('monetag-sdk-script-error'));
    }, { once: true });
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Initialize Monetag once: inject the SDK for the configured zone. Idempotent.
 * Tags PostHog with `ad_provider_web: 'monetag'` so funnels split by provider.
 */
export function initMonetagAds(zoneId: string = getMonetagZoneId()): Promise<void> {
  if (!isMonetagAllowedSurface()) return Promise.resolve();

  return loadMonetagSdk(zoneId).then(() => {
    if (configured) return;
    configured = true;

    void import('@/utils/posthogEngagement')
      .then(({ setPostHogSuperProps }) => {
        setPostHogSuperProps({ ad_provider_web: 'monetag' });
      })
      .catch(() => { /* analytics is best-effort */ });
  });
}

/** Reset module state. Test-only. */
export function __resetMonetagSdkForTests(): void {
  loadPromise = null;
  configured = false;
}
