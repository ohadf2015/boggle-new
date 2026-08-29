'use client';

import { createContext, useContext, useEffect, useRef, useMemo, useState, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdMob, AdmobConsentStatus } from '@capacitor-community/admob';
import { getAdmobConfig, type AdmobConfig, type AdPlatform } from '@/lib/admob-config';
import { useSocialCapabilities } from '@/hooks/useSocialCapabilities';
import {
  shouldSuppressAdsForTier,
  shouldSuppressInterstitialForTier,
  resolveChildDirectedAdInit,
} from '@/lib/families/adPolicy';

interface AdMobContextValue {
  recordGameEnd: () => void;
  shouldShowInterstitial: () => boolean;
  recordInterstitialShown: () => void;
  hasNoAds: () => boolean;
  getConfig: () => AdmobConfig | null;
  whenReady: () => Promise<void>;
  /**
   * Warm the next interstitial so `showInterstitial` is zero-latency.
   * Idempotent, dedupes concurrent loads, and is a no-op when ads are
   * unavailable, the session cap is reached, or we're still in warmup.
   * AdMob interstitials expire (~1h); callers re-warm after each show.
   */
  prepareInterstitial: () => Promise<void>;
  /** True when a preloaded interstitial is ready to show without a cold load. */
  isInterstitialReady: () => boolean;
  /** Mark the warm interstitial consumed (call right before showing it). */
  consumeInterstitial: () => void;
  /**
   * True once an interstitial slot came due but was blocked ONLY by the
   * undeclared ('unknown') tier. The UI uses this natural break to ask for
   * the user's age instead of showing an ad — a declared 13+ flips the tier
   * to 'adult' and real interstitials serve from the next eligible game.
   * Latches true for the session; the consumer applies its own once-per-
   * install marker.
   */
  ageGatePromptOpportunity: boolean;
}

// Defensive cap. Prevents new interstitial trigger sites (mission-claim, streak-save, etc.)
// from compounding into ad fatigue within a single session.
const MAX_INTERSTITIALS_PER_SESSION = 4;

// AdMob interstitials expire ~1h after load (Google: "reload every hour").
// Treat a preloaded ad older than this as not-ready so it cold-reloads before
// showing — otherwise a stale-but-"ready" ad would be consumed + recorded, then
// fail to render, burning a session slot via the expiry door. 50min < 60min
// gives margin for the show to complete before the SDK's own expiry.
const INTERSTITIAL_TTL_MS = 50 * 60 * 1000;

// Games played across the install's whole life. The cadence below (warmup of 3,
// then every 3rd game) only ever fired for a user who reached game 6 in ONE
// sitting — and an undeclared user spends that first slot on the age gate, so
// their first real interstitial needed NINE games in one session. AdMob says
// what that cost: 31 interstitial requests in the 79 days since the format went
// live (2026-07-03), 2 impressions in the whole of August. Counting lifetime
// games instead makes the slot reachable; MAX_INTERSTITIALS_PER_SESSION still
// caps the per-session frequency, and the Families tier gate is untouched.
const GAME_ENDS_KEY = 'lc_total_game_ends';

function readTotalGameEnds(): number {
  try {
    const n = Number(localStorage.getItem(GAME_ENDS_KEY));
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0; // storage unavailable — degrade to the old session-scoped behaviour
  }
}

function writeTotalGameEnds(n: number): void {
  try {
    localStorage.setItem(GAME_ENDS_KEY, String(n));
  } catch {
    // ponytail: best-effort. A failed write just means this game doesn't count.
  }
}

const AdMobContext = createContext<AdMobContextValue | null>(null);

export function AdMobProvider({ children }: { children: ReactNode }) {
  // `isPluginAvailable` is stricter than `isNativePlatform` — in some Android WebView
  // contexts the bridge reports native but the AdMob plugin isn't registered,
  // which throws UNIMPLEMENTED on any AdMob call.
  const isAvailable = useMemo(
    () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('AdMob'),
    []
  );
  const platform = useMemo(() => Capacitor.getPlatform() as AdPlatform, []);
  // Families Policy: once a user self-declares an under-13 age we have actual
  // knowledge of a child → serve NO ads to them. Mirrors the same tier the
  // social-feature gates use, so ad gating can't drift from social gating.
  const { tier, authResolved } = useSocialCapabilities();
  // Lifetime, not per-session — see GAME_ENDS_KEY. The lazy useState initialiser
  // runs exactly once (a bare useRef(readTotalGameEnds()) would hit localStorage
  // on every render); under SSR the read throws and seeds 0, which is the old
  // behaviour and is never rendered, so hydration can't mismatch on it.
  const [seededGameEnds] = useState(readTotalGameEnds);
  const totalGameEnds = useRef(seededGameEnds);
  const interstitialsShown = useRef(0);
  // Latched when an interstitial slot came due but tier was still 'unknown' —
  // the cue for the UI to ask for age at that natural break (state, not ref,
  // so the consuming wrapper re-renders when it flips).
  const [ageGatePromptOpportunity, setAgeGatePromptOpportunity] = useState(false);
  const initPromise = useRef<Promise<void> | null>(null);
  // UMP consent is a one-time user-facing FORM — gathered once per session even
  // when the SDK is re-initialized below.
  const consentPromise = useRef<Promise<void> | null>(null);
  // Serialized ad-policy config currently applied to the SDK. `null` = never
  // initialized. Keying on the CONFIG (not a one-shot "started" latch) is what
  // makes a tier change re-apply it — see the effect below.
  const appliedAdInitKey = useRef<string | null>(null);
  // Interstitial preload state (app-scoped, resets per provider). A "warm" ad
  // shows with zero latency; `inFlight` dedupes concurrent prepares.
  const interstitialReady = useRef(false);
  const interstitialReadyAt = useRef(0);
  const interstitialInFlight = useRef<Promise<void> | null>(null);

  // Defer init until auth has SETTLED, then RE-init whenever the resolved
  // ad-policy config changes.
  //
  // Recurring-pitfall Class 1 (dual source of truth + async resolution): the
  // child-directed config baked into AdMob.initialize() depends on `tier`, and
  // `tier` is not terminal at mount. A brand-new guest is 'unknown' → the SDK
  // initialized CHILD-DIRECTED, and the age gate then flipped that same guest to
  // 'adult' — which is precisely what makes them eligible for interstitials. The
  // old one-shot `initStarted` latch meant every interstitial they ever saw was
  // still served with tagForChildDirectedTreatment + TFUA + a G-only content cap:
  // non-personalized, mediation disabled, thin remnant inventory. That is the
  // configuration behind "interstitials barely serve, and when they do they're
  // blank".
  //
  // Re-initializing is the fix and it is safe: the plugin runs
  // `setRequestConfiguration(call)` UNCONDITIONALLY at the top of every
  // initialize() call (node_modules/@capacitor-community/admob/android/.../AdMob.java:67),
  // before the once-only MobileAds.initialize(), so a second call re-applies the
  // tags even though MobileAds itself no-ops.
  useEffect(() => {
    if (!authResolved) return;

    const adInit = resolveChildDirectedAdInit(tier);
    const adInitKey = JSON.stringify(adInit);
    if (appliedAdInitKey.current === adInitKey) return; // nothing changed
    const isReinit = appliedAdInitKey.current !== null;
    appliedAdInitKey.current = adInitKey;

    // EU/GDPR: gather UMP consent BEFORE initialize. The plugin itself geo-gates
    // (returns NOT_REQUIRED outside EEA), so no client-side EEA check needed.
    // Errors in the consent flow must NOT block ads — fall through to initialize
    // either way so non-EEA traffic stays unaffected if UMP backend is flaky.
    // Cached: the form is user-facing, so a re-init must never re-prompt.
    consentPromise.current ??= isAvailable
      ? AdMob.requestConsentInfo()
          .then(async (info) => {
            if (
              info.status === AdmobConsentStatus.REQUIRED &&
              info.isConsentFormAvailable
            ) {
              await AdMob.showConsentForm();
            }
          })
          .catch((err) => {
            console.warn('[AdMob] UMP consent flow failed', err);
          })
      : Promise.resolve();

    // Any warm interstitial was loaded under the OLD policy config. Drop it so
    // the next show re-loads under the new one instead of spending a session
    // slot on a stale child-directed creative.
    if (isReinit) {
      interstitialReady.current = false;
      interstitialReadyAt.current = 0;
    }

    initPromise.current = consentPromise.current.then(() =>
      isAvailable
        ? AdMob.initialize({
            // Explicit opt-in only. `NODE_ENV !== 'production'` is the exact
            // pattern capacitor.config.ts:67-70 documents as having shipped
            // Google TEST ads to every build where NODE_ENV was merely unset.
            // `=== 'development'` keeps local device testing on test ads without
            // that failure mode.
            initializeForTesting:
              process.env.NEXT_PUBLIC_ADMOB_TEST_MODE === 'true' ||
              process.env.NODE_ENV === 'development',
            // Families Self-Certified Ads SDK config. JS-deployable on this
            // remote-URL Capacitor app — the v8 native plugin reads these off
            // the bridge. Anyone not KNOWN to be an adult is child-directed.
            ...adInit,
          })
            .then(() => undefined)
            .catch((err) => {
              // warn (not error) so Sentry's captureConsole doesn't treat expected
              // plugin-missing failures as errors.
              console.warn('[AdMob] initialize failed', err);
            })
        : undefined
    );
  }, [authResolved, isAvailable, tier]);

  function whenReady(): Promise<void> {
    return initPromise.current ?? Promise.resolve();
  }

  function hasNoAds(): boolean {
    return shouldSuppressAdsForTier(tier);
  }

  // Cadence + cap check shared by the real interstitial gate and the age-gate
  // opportunity: warmup of 3 games, then every 3rd game, capped per session.
  function interstitialSlotDue(): boolean {
    if (interstitialsShown.current >= MAX_INTERSTITIALS_PER_SESSION) return false;
    if (totalGameEnds.current <= 3) return false;
    return (totalGameEnds.current - 3) % 3 === 0;
  }

  function recordGameEnd() {
    totalGameEnds.current += 1;
    writeTotalGameEnds(totalGameEnds.current);
    // A slot came due and the ONLY blocker is that we don't know the user's
    // age — surface the age prompt at this natural break instead of an ad.
    // Declared 13+ → tier 'adult' → real interstitials from the next slot.
    if (tier === 'unknown' && interstitialSlotDue()) {
      setAgeGatePromptOpportunity(true);
    }
  }

  function recordInterstitialShown() {
    interstitialsShown.current += 1;
  }

  function shouldShowInterstitial(): boolean {
    // Families Ad Format: interstitials only for KNOWN adults (suppresses child
    // AND undeclared-guest tiers). This is the v5740 rejection fix.
    if (shouldSuppressInterstitialForTier(tier)) return false;
    return interstitialSlotDue();
  }

  function getConfig(): AdmobConfig | null {
    if (!isAvailable) return null;
    return getAdmobConfig(platform);
  }

  // Whether it's worth holding a warm interstitial right now: ads on, under the
  // session cap, and past warmup (the first eligible interstitial is game 6, so
  // warming at the warmup edge — game 3 — keeps that first one instant too).
  function shouldPreloadInterstitial(): boolean {
    // Don't even warm an interstitial for non-adults — they can never show one.
    if (shouldSuppressInterstitialForTier(tier)) return false;
    if (interstitialsShown.current >= MAX_INTERSTITIALS_PER_SESSION) return false;
    return totalGameEnds.current >= 3;
  }

  function isInterstitialReady(): boolean {
    // Warm AND fresh — a preloaded ad older than the TTL is treated as not-ready
    // so the show path cold-reloads it before consuming a slot.
    return interstitialReady.current && Date.now() - interstitialReadyAt.current < INTERSTITIAL_TTL_MS;
  }

  function consumeInterstitial(): void {
    interstitialReady.current = false;
  }

  function prepareInterstitial(): Promise<void> {
    if (!shouldPreloadInterstitial()) return Promise.resolve();
    if (isInterstitialReady()) return Promise.resolve(); // fresh & warm — skip (stale falls through to reload)
    if (interstitialInFlight.current) return interstitialInFlight.current;
    const config = getConfig();
    if (!config) return Promise.resolve();
    const p = (async () => {
      try {
        await whenReady();
        await AdMob.prepareInterstitial({ adId: config.interstitialAdId });
        interstitialReady.current = true;
        interstitialReadyAt.current = Date.now();
      } catch {
        // No fill / load error — leave un-warmed; showInterstitial will retry
        // a cold load and, failing that, skip showing without burning a slot.
        interstitialReady.current = false;
      } finally {
        interstitialInFlight.current = null;
      }
    })();
    interstitialInFlight.current = p;
    return p;
  }

  return (
    <AdMobContext.Provider value={{ recordGameEnd, shouldShowInterstitial, recordInterstitialShown, hasNoAds, getConfig, whenReady, prepareInterstitial, isInterstitialReady, consumeInterstitial, ageGatePromptOpportunity }}>
      {children}
    </AdMobContext.Provider>
  );
}

export function useAdMobContext(): AdMobContextValue {
  const ctx = useContext(AdMobContext);
  if (!ctx) throw new Error('useAdMobContext must be used within AdMobProvider');
  return ctx;
}
