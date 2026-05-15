/**
 * GameMonetize SDK loader + minimal typed wrapper.
 *
 * Web surface only. Caller MUST gate on `!isOnCrazyGamesPlatform &&
 * !Capacitor.isNativePlatform()` and only when GameMonetize is the chosen
 * web waterfall — H5 still wins when its env flag is on (different fill
 * pool, different approval scope).
 *
 * Approval scope: GameMonetize publisher account only — does NOT replace
 * AdSense / AdMob / CrazyGames. Provides a third web rewarded fallback
 * that approves indie HTML5 games without long content review.
 *
 * Script: api.gamemonetize.com/sdk.js (sets `window.sdk` after load)
 * Driver: `window.sdk.showAd('rewarded')` returns a Promise that resolves
 * on full reward-video completion and rejects on no-fill / dismiss / error.
 *
 * Init contract: `window.SDK_OPTIONS = { gameId, onEvent }` MUST be set
 * BEFORE the script loads — the SDK reads it during its own bootstrap.
 */

export type GameMonetizeEventName =
  | 'SDK_READY'
  | 'SDK_ERROR'
  | 'SDK_GAME_PAUSE'
  | 'SDK_GAME_START'
  | 'SDK_REWARDED_WATCH_COMPLETE'
  | 'AD_SDK_LOADER_READY'
  | string;

export interface GameMonetizeEvent {
  name: GameMonetizeEventName;
  message?: string;
}

export interface GameMonetizeSdkOptions {
  gameId: string;
  onEvent: (event: GameMonetizeEvent) => void;
}

declare global {
  interface Window {
    SDK_OPTIONS?: GameMonetizeSdkOptions;
    sdk?: {
      showAd: (type: 'rewarded' | 'interstitial') => Promise<void>;
      preloadAd?: (type: 'rewarded' | 'interstitial') => void;
      AdType?: { Rewarded: 'rewarded'; Interstitial: 'interstitial' };
    };
  }
}

export const GAMEMONETIZE_SCRIPT_ID = 'gamemonetize-sdk';
const SCRIPT_SRC = 'https://api.gamemonetize.com/sdk.js';

let loadPromise: Promise<void> | null = null;
let configured = false;
const eventListeners = new Set<(e: GameMonetizeEvent) => void>();

// GameMonetize SDK transitively loads Google IMA (`imasdk.googleapis.com`)
// at init. AdSense rejected our site (memory: adsense-rejection-2026-05-11),
// so IMA must NOT load. We disable the auto-fallback default game-id —
// SDK now only initializes when `NEXT_PUBLIC_GAMEMONETIZE_GAME_ID` is
// explicitly set (intentional opt-in, e.g. after a fresh approval).
export function getGameMonetizeId(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_GAMEMONETIZE_GAME_ID;
  if (typeof fromEnv === 'string' && fromEnv.length > 0) return fromEnv;
  return null;
}

/** Subscribe to SDK events (multiplexed via SDK_OPTIONS.onEvent). */
export function onGameMonetizeEvent(listener: (e: GameMonetizeEvent) => void): () => void {
  eventListeners.add(listener);
  return () => { eventListeners.delete(listener); };
}

/** Idempotent: loads SDK script once, resolves when ready. */
export function loadGameMonetizeSdk(gameId: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (loadPromise) return loadPromise;

  // SDK_OPTIONS MUST exist before script tag — the SDK consumes it during
  // its own bootstrap. We multiplex onEvent through eventListeners so
  // multiple subscribers (init logger, hook callbacks) all receive events.
  window.SDK_OPTIONS = {
    gameId,
    onEvent: (event: GameMonetizeEvent) => {
      for (const l of eventListeners) {
        try { l(event); } catch { /* listener crashed — others still receive */ }
      }
    },
  };

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(GAMEMONETIZE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      // Script already injected (HMR / double-mount). Resolve when ready.
      if (window.sdk) { resolve(); return; }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('gamemonetize-sdk-script-error')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GAMEMONETIZE_SCRIPT_ID;
    script.async = true;
    script.src = SCRIPT_SRC;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => {
      loadPromise = null;
      reject(new Error('gamemonetize-sdk-script-error'));
    }, { once: true });
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Initialize GameMonetize once: load SDK + tag PostHog.
 * Idempotent — repeated calls return the cached promise.
 */
export function initGameMonetizeAds(gameId: string = getGameMonetizeId() ?? ''): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (!gameId) return Promise.reject(new Error('gamemonetize-no-game-id'));

  return loadGameMonetizeSdk(gameId).then(() => {
    if (configured) return;
    configured = true;

    void import('@/utils/posthogEngagement')
      .then(({ setPostHogSuperProps }) => {
        setPostHogSuperProps({ ad_provider_web: 'gamemonetize' });
      })
      .catch(() => { /* analytics best-effort */ });
  });
}

/** Reset module state. Test-only. */
export function __resetGameMonetizeSdkForTests(): void {
  loadPromise = null;
  configured = false;
  eventListeners.clear();
}
