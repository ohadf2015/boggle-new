/**
 * GameDistribution HTML5 SDK loader + typed rewarded wrapper.
 *
 * Web surface only — the AdSense-rejection fallback for own-domain rewarded
 * fill (see docs/2026-06-04-web-ad-provider-after-adsense-rejection.md). Caller
 * MUST gate on `!isOnCrazyGamesPlatform && !Capacitor.isNativePlatform()` before
 * invoking: GameDistribution must never load inside the CrazyGames iframe (the
 * portal forbids 3rd-party ads) or on the Android APK (AdMob native serves
 * there with full SSV).
 *
 * Contract (https://github.com/GameDistribution/GD-HTML5/wiki):
 *   - `window.GD_OPTIONS = { gameId, onEvent }` set BEFORE the script loads.
 *   - Script: https://html5.api.gamedistribution.com/main.min.js → creates the
 *     `gdsdk` global.
 *   - `gdsdk.showAd('rewarded')` returns a Promise that resolves when the ad
 *     flow ends and content resumes (SDK_GAME_START).
 *   - The reward is owed iff `SDK_REWARDED_WATCH_COMPLETE` fired during the ad —
 *     i.e. BEFORE showAd() resolves. This is the same settle model as H5's
 *     `breakStatus === 'viewed'`.
 *
 * Own-domain payout: self-hosting on lexiclash.live is supported via the
 * GD referrer mechanism — unlike the CrazyGames SDK, GameDistribution pays on
 * our own domain, not only its portal.
 */

export type GdRewardedType = 'rewarded';

export interface GdSdk {
  showAd: (type?: string) => Promise<void>;
}

interface GdEvent {
  name: string;
}

interface GdOptions {
  gameId: string;
  onEvent: (event: GdEvent) => void;
  userId?: string;
}

declare global {
  interface Window {
    GD_OPTIONS?: GdOptions;
    gdsdk?: GdSdk;
    /** Test-mode override — `?gdads_test=1` in URL surfaces sandbox ads. */
    __gdAdsTest?: boolean;
  }
}

const SCRIPT_ID = 'gamedistribution-jssdk';
const SCRIPT_SRC = 'https://html5.api.gamedistribution.com/main.min.js';

let loadPromise: Promise<void> | null = null;
let configured = false;

// Whether the current/last rewarded ad fired SDK_REWARDED_WATCH_COMPLETE.
// Reset at the start of every showRewardedGd() call. The app only ever runs one
// rewarded ad at a time (useRewardedAd's in-flight guard), so a module-level
// flag is safe — there is no concurrent rewarded session to interleave with.
let rewardWatched = false;

/** Resolve the configured GameDistribution game id (hash). Empty = stay dark. */
export function getGdGameId(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_GD_GAME_ID) {
    return process.env.NEXT_PUBLIC_GD_GAME_ID;
  }
  return '';
}

/**
 * Handle a GameDistribution lifecycle event. Wired into `GD_OPTIONS.onEvent`
 * and exported so the rewarded correlation (and tests) can drive it directly.
 * Only `SDK_REWARDED_WATCH_COMPLETE` grants a reward; audio mute / game pause
 * around the ad is owned by the caller (useRewardedAd's GD branch).
 */
export function handleGdEvent(name: string): void {
  if (name === 'SDK_REWARDED_WATCH_COMPLETE') {
    rewardWatched = true;
  }
}

export interface ShowRewardedGdOptions {
  /** Injectable for tests; defaults to `window.gdsdk.showAd('rewarded')`. */
  showAdFn?: () => Promise<void>;
}

function defaultShowAd(): Promise<void> {
  if (typeof window === 'undefined' || !window.gdsdk || typeof window.gdsdk.showAd !== 'function') {
    return Promise.reject(new Error('gd-sdk-unavailable'));
  }
  return window.gdsdk.showAd('rewarded');
}

/**
 * Show a rewarded GameDistribution ad. Resolves `true` iff the user completely
 * watched it (SDK_REWARDED_WATCH_COMPLETE fired before content resumed), `false`
 * if dismissed early, and REJECTS if the SDK could not show one (no fill /
 * adblock / SDK offline) so the caller can route to its error path.
 */
export async function showRewardedGd(opts: ShowRewardedGdOptions = {}): Promise<boolean> {
  rewardWatched = false;
  const showAdFn = opts.showAdFn ?? defaultShowAd;
  await showAdFn();
  return rewardWatched;
}

/** Idempotent: set GD_OPTIONS + inject the SDK script once, resolve on load. */
export function loadGdSdk(gameId: string = getGdGameId()): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    // GD_OPTIONS must exist before main.min.js evaluates.
    window.GD_OPTIONS = {
      gameId,
      onEvent: (event: GdEvent) => handleGdEvent(event?.name),
    };

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.gdsdk) { resolve(); return; }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('gd-sdk-script-error')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = SCRIPT_SRC;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => {
      loadPromise = null;
      reject(new Error('gd-sdk-script-error'));
    }, { once: true });
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Initialize GameDistribution once: inject the SDK for the configured game id.
 * Idempotent. Tags PostHog with `ad_provider_web: 'gamedistribution'` so funnels
 * can split by provider. Lazy-imports PostHog so SSR/non-web bundles stay clean.
 */
export function initGameDistributionAds(gameId: string = getGdGameId()): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  return loadGdSdk(gameId).then(() => {
    if (configured) return;
    configured = true;

    void import('@/utils/posthogEngagement')
      .then(({ setPostHogSuperProps }) => {
        setPostHogSuperProps({ ad_provider_web: 'gamedistribution' });
      })
      .catch(() => { /* analytics is best-effort */ });
  });
}

/** Reset module state. Test-only. */
export function __resetGdSdkForTests(): void {
  loadPromise = null;
  configured = false;
  rewardWatched = false;
}
