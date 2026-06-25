/**
 * ayeT-Studios HTML5 Rewarded Video SDK loader + typed rewarded wrapper.
 *
 * Web surface only — the post-AdSense-rejection rewarded path with NO traffic
 * minimum and own-domain payout (see
 * docs/2026-06-04-web-ad-provider-after-adsense-rejection.md). Caller MUST gate
 * on `!isOnCrazyGamesPlatform && !Capacitor.isNativePlatform()` before invoking:
 * inside the Capacitor WebView `isNativePlatform()` is true, so this gate keeps
 * the web ad path out of the Families-program Android app entirely.
 *
 * Contract (https://docs.ayetstudios.com — Rewarded Video SDK for HTML5):
 *   - Script: https://cdn.ayet.io/offerwall/js/ayetvideosdk.min.js → `AyetVideoSdk` global.
 *   - `AyetVideoSdk.init(placementId, externalIdentifier)` once.
 *   - `AyetVideoSdk.requestAd(adslot, onSuccess, onError)` then `playFullscreenAd()`.
 *   - Reward is owed iff `AyetVideoSdk.callbackRewarded` fires (video completed +
 *     fraud-checked). `callbackComplete` (player closed) must NOT reward — the
 *     ayeT docs are explicit about this. Same settle model as H5's
 *     `breakStatus === 'viewed'` and GameDistribution's
 *     `SDK_REWARDED_WATCH_COMPLETE`.
 *
 * Real-time client reward here is the frictionless path; a server-to-server
 * conversion callback (idempotent on `transaction_id`) is the secure backstop,
 * implemented separately on the backend.
 */

export interface AyetVideoSdkApi {
  init: (placementId: string, externalIdentifier: string, optional?: string) => void;
  requestAd: (adslot: string, onSuccess: () => void, onError: (e?: unknown) => void) => void;
  playFullscreenAd: () => void;
  playFullsizeAd?: () => void;
  callbackRewarded?: () => void;
  callbackComplete?: () => void;
}

declare global {
  interface Window {
    AyetVideoSdk?: AyetVideoSdkApi;
    /** Test-mode override — `?ayet_test=1` surfaces sandbox ads. */
    __ayetAdsTest?: boolean;
  }
}

const SCRIPT_ID = 'ayet-video-sdk';
const SCRIPT_SRC = 'https://cdn.ayet.io/offerwall/js/ayetvideosdk.min.js';

let loadPromise: Promise<void> | null = null;
let initialized = false;

/** Resolve the configured ayeT web video placement id. Empty = stay dark. */
export function getAyetPlacementId(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_AYET_PLACEMENT_ID) {
    return process.env.NEXT_PUBLIC_AYET_PLACEMENT_ID;
  }
  return '';
}

/** Resolve the adslot name to request. Defaults to 'default'. */
export function getAyetAdslot(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_AYET_ADSLOT) {
    return process.env.NEXT_PUBLIC_AYET_ADSLOT;
  }
  return 'default';
}

/** Idempotent: inject the SDK script once, resolve on load. */
export function loadAyetSdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.AyetVideoSdk) { resolve(); return; }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('ayet-sdk-script-error')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = SCRIPT_SRC;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => {
      loadPromise = null;
      reject(new Error('ayet-sdk-script-error'));
    }, { once: true });
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Initialize the ayeT video SDK once for a given user.
 * @param externalIdentifier stable per-user id (uuid / hashed email).
 */
export function initAyetVideo(externalIdentifier: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const placementId = getAyetPlacementId();
  return loadAyetSdk().then(() => {
    if (initialized) return;
    if (window.AyetVideoSdk && placementId) {
      window.AyetVideoSdk.init(placementId, externalIdentifier);
      initialized = true;
    }
    void import('@/utils/posthogEngagement')
      .then(({ setPostHogSuperProps }) => setPostHogSuperProps({ ad_provider_web: 'ayet' }))
      .catch(() => { /* analytics best-effort */ });
  });
}

interface AyetDriveCallbacks {
  onReward: () => void;
  onClose: () => void;
  onError: (reason: string) => void;
}

export interface ShowRewardedAyetOptions {
  /** Injectable for tests; defaults to wiring the real AyetVideoSdk callbacks. */
  driveAd?: (cbs: AyetDriveCallbacks) => void;
}

function defaultDriveAd(cbs: AyetDriveCallbacks): void {
  const sdk = typeof window !== 'undefined' ? window.AyetVideoSdk : undefined;
  if (!sdk || typeof sdk.requestAd !== 'function') {
    cbs.onError('ayet-sdk-unavailable');
    return;
  }
  // Reward is owed only on callbackRewarded; callbackComplete = closed.
  sdk.callbackRewarded = () => cbs.onReward();
  sdk.callbackComplete = () => cbs.onClose();
  sdk.requestAd(
    getAyetAdslot(),
    () => {
      try { sdk.playFullscreenAd(); } catch (err) {
        cbs.onError(err instanceof Error ? err.message : 'ayet-play-throw');
      }
    },
    (err) => cbs.onError(err instanceof Error ? err.message : 'ayet-no-fill'),
  );
}

/**
 * Show a rewarded ayeT video. Resolves `true` iff fully watched
 * (callbackRewarded), `false` if closed early (callbackComplete), and REJECTS
 * if the SDK could not show one (no fill / blocked) so the caller routes to its
 * error path. Settles once — the first terminal outcome wins.
 */
export function showRewardedAyet(opts: ShowRewardedAyetOptions = {}): Promise<boolean> {
  const drive = opts.driveAd ?? defaultDriveAd;
  return new Promise<boolean>((resolve, reject) => {
    let settled = false;
    let rewarded = false;
    drive({
      onReward: () => {
        rewarded = true;
        if (settled) return;
        settled = true;
        resolve(true);
      },
      onClose: () => {
        if (settled) return;
        settled = true;
        resolve(rewarded);
      },
      onError: (reason) => {
        if (settled) return;
        settled = true;
        reject(new Error(reason));
      },
    });
  });
}

/** Reset module state. Test-only. */
export function __resetAyetSdkForTests(): void {
  loadPromise = null;
  initialized = false;
}
