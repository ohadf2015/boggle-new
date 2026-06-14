import { useCallback } from 'react';
import { AdMob, BannerAdSize, BannerAdPosition, RewardAdPluginEvents, RewardInterstitialAdPluginEvents, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import { useAdMobContext } from '@/contexts/AdMobContext';
import type { RewardedSurface, BannerVariant } from '@/lib/admob-config';
import { kickWebViewRepaint } from '@/lib/native/webviewRepaint';
import { trackRewardedLifecycle, trackInterstitialLifecycle } from '@/utils/growthTracking';

// Module-level so every useAdMob() consumer observes the same banner state.
// Prevents hideBanner calls when no banner was ever shown (Sentry #120).
const bannerShownRef = { current: false };

export interface ShowRewardedOptions {
  surface?: RewardedSurface;
}

// AdMob's native rewarded-video load tops out at ~30s before it gives up.
// Blocking the UI in `status='showing'` for that whole window is the
// "stuck 30s" bug. We cap the load wait far shorter: if `prepareRewardVideoAd`
// hasn't resolved by here, free the UI with a retry message. The in-flight
// prepare keeps warming the plugin's cache, so the *next* tap is usually
// instant (preloaded).
export const REWARD_PREPARE_TIMEOUT_MS = 12000;

// Overall watchdog for the show-and-reward lifecycle. AdMob's rewarded video
// can stall at *show* time — a backgrounded WebView or buggy mediation adapter
// fires NO Rewarded/Dismissed/Failed event AND never resolves
// `showRewardVideoAd()`. AdMob's own rewarded video tops out at 30s, so 90s is
// well past any legitimate ad lifecycle: real events settle and clear this
// well before it fires.
export const REWARD_SAFETY_TIMEOUT_MS = 90000;

// Immersive mode OFF. A prior session enabled it speculatively (close button
// under the edge-to-edge status bar) — but immersive mode is the root cause of
// the universal "Reward in 30 seconds frozen at 30, ad plays fine, never grants,
// player stuck" bug. MainActivity runs edge-to-edge (EdgeToEdge.enable,
// transparent system bars); when the rewarded ad Activity fronts with immersive
// STICKY system-UI, the system-bar hide/show transition churns window focus, and
// the SDK PAUSES the reward countdown on every focus loss (onWindowFocusChanged).
// The timer never resumes → reward (driven by the watched-duration → Rewarded
// event) never fires → the player is stranded with no JS-dismissable native ad.
// A frozen countdown blocks the reward entirely, which is strictly worse than a
// hard-to-tap close button, so we trade back. JS-only: the native plugin reads
// `immersiveMode` from the prepare call (v8.0.0+), so this reaches installed
// apps via the web deploy — no Android release, trivially reversible.
const REWARD_IMMERSIVE_MODE = false;

// Visibility-reconcile grace. The rewarded ad is a fullscreen native Activity
// over the WebView; while it's frontmost Android SUSPENDS the WebView's JS, so
// every JS watchdog (`prepareTimer`, `safetyTimer`, the hook-level 120s
// backstop) is FROZEN too — confirmed in production telemetry: a 56-minute
// ad-cover span logged zero `safety_timeout`. The only event that survives the
// suspension is `visibilitychange`, which fires the instant the ad Activity is
// torn down and the WebView resumes. The real Rewarded/Dismissed event is
// queued and flushes ~100 ms after that. So on regaining visibility we wait
// this grace; if STILL unsettled the native terminal event was dropped and the
// player would be stranded on a frozen game with the watch button disabled —
// we settle (no reward, like a skip) to free the UI. Long enough to never
// preempt the ~100 ms real reward, short enough to unstick the player fast.
export const VISIBILITY_RECONCILE_GRACE_MS = 2000;

export interface ShowBannerOptions {
  variant?: BannerVariant;
}

export function useAdMob() {
  const { recordGameEnd, shouldShowInterstitial, recordInterstitialShown, hasNoAds, getConfig, whenReady, prepareInterstitial: prepareInterstitialAd, isInterstitialReady, consumeInterstitial } = useAdMobContext();
  const isDev = process.env.NODE_ENV !== 'production';

  const showRewarded = useCallback(async (onReward: () => void, onError?: (err: string) => void, opts?: ShowRewardedOptions) => {
    // Both early-exits MUST signal back via onError. The caller (useRewardedAd)
    // has ALREADY set status='showing' and emitted emitRewardAdActive(true)
    // (pausing the game clock) before invoking us. A silent `return` here leaves
    // the UI stranded — watch-ad button disabled, game clock frozen — until the
    // caller's 120s stuck-watchdog fires. PostHog confirmed this path: native
    // `rewarded_ad_offered` events with ZERO downstream prepare/watched/declined
    // breadcrumbs (e.g. config not yet loaded when the user taps). Settling the
    // caller immediately re-enables the button and resumes the clock.
    if (hasNoAds()) { onError?.('Ads are turned off'); return; }
    const config = getConfig();
    if (!config) { onError?.('Ad not ready — please try again'); return; }
    const surface: RewardedSurface = opts?.surface ?? 'generic';
    // Per-surface unit ID lets AdMob waterfall optimize each placement separately.
    const adId = config.rewardedUnits?.[surface] ?? config.rewardedAdId;

    // Some units are configured in the AdMob dashboard as Rewarded INTERSTITIAL
    // (the "Ad 1 of 2" creative). Those MUST be driven through the
    // rewarded-interstitial API + its event namespace — showing such a unit via
    // the rewarded-VIDEO API renders an ad whose terminal events never fire in
    // the video namespace, stranding the player with no reward (the "stuck at 30s"
    // report). Default-off, per-surface (set NEXT_PUBLIC_ADMOB_REWARDED_INTERSTITIAL_SURFACES)
    // so the proven video path is untouched until ops flips the matching surface.
    const useInterstitial = (config.rewardedInterstitialSurfaces ?? []).includes(surface);
    // Both are string enums with identical member names; cast to one so the
    // addListener overloads resolve. Runtime values stay correct (Events.Rewarded
    // is the interstitial event string when flagged) — our listeners ignore the
    // event payload, so the per-enum reward-item type difference is irrelevant.
    const Events = (useInterstitial
      ? RewardInterstitialAdPluginEvents
      : RewardAdPluginEvents) as typeof RewardAdPluginEvents;
    const prepareAd = () =>
      useInterstitial
        ? AdMob.prepareRewardInterstitialAd({ adId, immersiveMode: REWARD_IMMERSIVE_MODE })
        : AdMob.prepareRewardVideoAd({ adId, immersiveMode: REWARD_IMMERSIVE_MODE });
    const showAd = () =>
      useInterstitial ? AdMob.showRewardInterstitialAd() : AdMob.showRewardVideoAd();

    // Reward must come from the SDK's Rewarded event. @capacitor-community/admob v8 does
    // not guarantee `Rewarded → Dismissed` order on Android — some builds fire Dismissed
    // first and the Rewarded payload lands ~tens-to-hundreds of ms later. Treat Rewarded
    // as the direct success trigger; on Dismissed without a prior Rewarded, hold a short
    // grace window for a late event before declaring skip.
    let rewarded = false;
    let settled = false;
    let dismissGraceTimer: ReturnType<typeof setTimeout> | null = null;
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;
    let prepareTimer: ReturnType<typeof setTimeout> | null = null;
    // Visibility-reconcile state. `adShown` arms the reconcile only once the ad
    // is actually on screen (so app-switching DURING prepare can't trip it);
    // `wentHidden` records that the ad Activity covered the WebView; the timer
    // is the post-foreground grace before we declare the terminal event lost.
    let adShown = false;
    let wentHidden = false;
    let visReconcileTimer: ReturnType<typeof setTimeout> | null = null;
    const REWARD_GRACE_MS = 750;
    const handles: Array<{ remove: () => void | Promise<void> }> = [];

    const cleanup = () => {
      if (dismissGraceTimer) { clearTimeout(dismissGraceTimer); dismissGraceTimer = null; }
      if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
      if (prepareTimer) { clearTimeout(prepareTimer); prepareTimer = null; }
      if (visReconcileTimer) { clearTimeout(visReconcileTimer); visReconcileTimer = null; }
      handles.forEach((h) => { try { h.remove(); } catch {} });
      handles.length = 0;
    };

    let finishRef: (ok: boolean, errMsg?: string) => void = () => {};

    const pendingHandles = [
      AdMob.addListener(Events.Rewarded, () => {
        trackRewardedLifecycle('rewarded', surface);
        rewarded = true;
        finishRef(true);
      }),
      AdMob.addListener(Events.Dismissed, () => {
        // Breadcrumb BEFORE the guard — when the player taps X, Dismissed
        // should fire and tear the ad down. A `rewarded` with no following
        // `dismissed` in telemetry = the close tap isn't reaching the SDK
        // (native ad won't close — the reported symptom).
        trackRewardedLifecycle('dismissed', surface);
        if (rewarded || settled) return;
        dismissGraceTimer = setTimeout(() => {
          if (!rewarded) finishRef(false);
        }, REWARD_GRACE_MS);
      }),
      AdMob.addListener(Events.FailedToShow, (e: { message?: string } | undefined) => {
        trackRewardedLifecycle('failed_to_show', surface);
        finishRef(false, e?.message || 'Ad failed to show');
      }),
      AdMob.addListener(Events.FailedToLoad, (e: { message?: string } | undefined) => {
        trackRewardedLifecycle('failed_to_load', surface);
        finishRef(false, e?.message || 'Ad failed to load');
      }),
    ];
    // Await registration before we fire `prepareRewardVideoAd`, otherwise a fast plugin
    // could emit Rewarded before our listener is attached on the native side.
    try {
      const resolved = await Promise.all(pendingHandles);
      handles.push(...resolved);
    } catch { /* listener registration is best-effort; ad path still drives outcome */ }

    // Suspension-proof watchdog. While the ad Activity is frontmost the WebView's
    // JS is paused, so the setTimeout watchdogs above are frozen and can't rescue
    // a dropped terminal event. `visibilitychange` is the one signal that fires on
    // resume. When the ad tears down (WebView visible again) after having covered
    // us, wait a grace for the queued Rewarded/Dismissed to flush; if none does,
    // settle so the player isn't stranded on a frozen game.
    if (typeof document !== 'undefined') {
      const onVisibility = () => {
        if (settled || !adShown) return;
        if (document.hidden) { wentHidden = true; return; }
        if (!wentHidden || visReconcileTimer) return;
        visReconcileTimer = setTimeout(() => {
          if (settled) return;
          trackRewardedLifecycle('visibility_reconcile', surface);
          finishRef(false, 'Ad closed without a reward signal');
        }, VISIBILITY_RECONCILE_GRACE_MS);
      };
      document.addEventListener('visibilitychange', onVisibility);
      handles.push({ remove: () => document.removeEventListener('visibilitychange', onVisibility) });
    }

    try {
      await new Promise<void>((resolve) => {
        finishRef = (ok: boolean, errMsg?: string) => {
          if (settled) return;
          settled = true;
          cleanup();
          // The rewarded video is a fullscreen native Activity over the WebView.
          // On teardown the WebView can fail to repaint its GPU surface (blank
          // white frame). Force a repaint before handing control back to React.
          kickWebViewRepaint();
          if (ok) onReward(); else onError?.(errMsg || 'Ad dismissed without reward');
          resolve();
        };

        (async () => {
          try {
            // Bound the load: a cold/no-fill prepare can otherwise block the UI
            // for AdMob's full ~30s internal load timeout (the "stuck 30s" bug).
            // If we hit the cap, settle with a retry message; the in-flight
            // prepare keeps warming the cache for the next tap.
            // Arm BEFORE whenReady(): if AdMob init never resolves (a hung
            // `whenReady()`), the old order left this await with NO timer armed,
            // freezing the UI in status='showing' forever. Capping it here frees
            // the UI on a stalled init too.
            prepareTimer = setTimeout(
              () => {
                trackRewardedLifecycle('prepare_timeout', surface);
                finishRef(false, 'Ad not ready — please try again');
              },
              REWARD_PREPARE_TIMEOUT_MS,
            );
            await whenReady();
            trackRewardedLifecycle('prepare_start', surface);
            await prepareAd();
            trackRewardedLifecycle('prepare_resolved', surface);
            // Bailed out (prepare timeout fired, or a Failed* event already
            // settled us). Do NOT show: the listeners are gone, so a shown ad
            // would grant no reward. Leave the prepared ad cached for retry.
            if (settled) return;
            if (prepareTimer) { clearTimeout(prepareTimer); prepareTimer = null; }
            // Arm the safety watchdog BEFORE showing — not after show resolves.
            // The plugin can stall *during* show: `showRewardVideoAd()` never
            // resolves and no Rewarded/Dismissed/Failed event fires, which left
            // the old code awaiting show forever (the watchdog was never armed)
            // and the UI frozen in status='showing' — the "stuck in reward ads"
            // bug. Arming it here covers the whole show-and-reward window; a
            // real ad fires its events well within REWARD_SAFETY_TIMEOUT_MS,
            // and finishRef is idempotent so the watchdog is harmless if it
            // outlives a normal ad.
            safetyTimer = setTimeout(
              () => {
                trackRewardedLifecycle('safety_timeout', surface);
                finishRef(false, 'Ad timed out — please try again');
              },
              REWARD_SAFETY_TIMEOUT_MS,
            );
            // Arm the visibility-reconcile window: from here the ad fronts and
            // suspends the WebView, so app focus changes are ad-related.
            adShown = true;
            trackRewardedLifecycle('show_called', surface);
            await showAd();
            trackRewardedLifecycle('show_resolved', surface);
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Ad failed';
            finishRef(false, msg);
          }
        })();
      });
    } catch (err) {
      cleanup();
      const msg = err instanceof Error ? err.message : 'Ad failed';
      onError?.(msg);
    }

    // Re-warm the cache after a granted reward. The preload-on-mount only fires
    // once, so without this the SECOND opt-in would cold-load again and risk
    // the same stall. Only on success: the consumed ad is gone, so there's no
    // concurrent in-flight prepare to collide with. Fire-and-forget.
    if (rewarded) {
      void prepareAd().catch(() => {});
    }
  }, [hasNoAds, getConfig, whenReady]);

  // Resolves when the interstitial dismisses, fails, or never serves.
  // Callers (e.g. MP host's "play again") await this so the next-round emit
  // doesn't fire while a fullscreen overlay is still in front of the player
  // — that's what previously stranded the player on a blank white screen
  // when AdMob's prepare → show pipeline finished after results had painted.
  // Safety timeout caps the wait in case Dismissed never arrives.
  const INTERSTITIAL_SAFETY_TIMEOUT_MS = 15000;
  const showInterstitial = useCallback(async (): Promise<void> => {
    recordGameEnd();
    if (!shouldShowInterstitial()) {
      // Not eligible this game — keep an ad warm for the next eligible slot so
      // the first/next interstitial shows with zero latency. No-op until warmup
      // ends and while under the session cap (gated inside prepareInterstitial).
      void prepareInterstitialAd();
      return;
    }
    const config = getConfig();
    if (!config) return;

    // Breadcrumb: this game is eligible and an ad will be attempted. From here
    // the lifecycle is fully instrumented so production can pinpoint the
    // "interstitials show blank screens" report — see trackInterstitialLifecycle.
    trackInterstitialLifecycle('eligible');

    const handles: Array<{ remove: () => void | Promise<void> }> = [];
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    await new Promise<void>((resolve) => {
      const settle = () => {
        if (settled) return;
        settled = true;
        if (timer) { clearTimeout(timer); timer = null; }
        handles.forEach((h) => { try { h.remove(); } catch {} });
        handles.length = 0;
        // Interstitial is a fullscreen native Activity over the WebView. On
        // dismiss the WebView can fail to repaint its GPU surface, leaving a
        // blank white frame on top of the still-mounted results page (the
        // "exit MP results → white screen in the app" report). Force a repaint.
        kickWebViewRepaint();
        resolve();
        // Re-warm the next interstitial (mirrors the rewarded re-warm at line
        // 192). Fire-and-forget; gated + deduped inside prepareInterstitial, so
        // it's a no-op once the session cap is reached.
        void prepareInterstitialAd();
      };

      // Register listeners BEFORE prepare so a fast plugin can't fire
      // Dismissed/FailedToShow before we're listening. Each wraps a breadcrumb
      // so we capture WHICH terminal event fired (or whether none did and the
      // safety timeout fired instead).
      Promise.all([
        AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
          trackInterstitialLifecycle('dismissed');
          settle();
        }),
        AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
          trackInterstitialLifecycle('failed_to_show');
          settle();
        }),
        AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
          trackInterstitialLifecycle('failed_to_load');
          settle();
        }),
      ])
        .then((resolved) => {
          if (settled) {
            resolved.forEach((h) => { try { h.remove(); } catch {} });
            return;
          }
          handles.push(...resolved);
        })
        .catch(() => { /* listener registration is best-effort */ });

      timer = setTimeout(() => {
        // No terminal event arrived in time — the native ad stalled. This
        // breadcrumb is the tell for a hung show (vs a clean dismiss).
        trackInterstitialLifecycle('safety_timeout');
        settle();
      }, INTERSTITIAL_SAFETY_TIMEOUT_MS);

      (async () => {
        try {
          await whenReady();
          // Prefer the preloaded ad (zero latency). Cold-load only as a
          // fallback when the warm slot is empty (preload not yet finished or
          // a prior no-fill).
          if (!isInterstitialReady()) {
            trackInterstitialLifecycle('prepare_start');
            await prepareInterstitialAd();
            trackInterstitialLifecycle('prepare_resolved');
          }
          if (!isInterstitialReady()) {
            // No fill — never call show on an unprepared unit (it would render
            // nothing yet count an impression). Settle so awaiting callers (MP
            // host) aren't blocked, and DON'T record a shown impression so the
            // no-fill doesn't burn one of the 4 session slots.
            trackInterstitialLifecycle('no_fill');
            settle();
            return;
          }
          consumeInterstitial();
          // Record only confirmed impressions. (Previously recorded before the
          // show, when fill was unknown — a no-fill silently burned a slot.)
          recordInterstitialShown();
          trackInterstitialLifecycle('show_called');
          await AdMob.showInterstitial();
          trackInterstitialLifecycle('show_resolved');
        } catch {
          trackInterstitialLifecycle('error');
          settle();
        }
      })();
    });
  }, [recordGameEnd, shouldShowInterstitial, recordInterstitialShown, getConfig, whenReady, prepareInterstitialAd, isInterstitialReady, consumeInterstitial]);

  const showBanner = useCallback(async (position = BannerAdPosition.BOTTOM_CENTER, margin?: number, opts?: ShowBannerOptions) => {
    if (hasNoAds()) return;
    const config = getConfig();
    if (!config) return;
    const variant: BannerVariant = opts?.variant ?? 'game';
    const adId = config.bannerUnits?.[variant] ?? config.bannerAdId;
    // Optimistic flip BEFORE await — closes race where a hideBanner arriving
    // mid-show was a no-op (ref still false), letting plugin paint the banner
    // on the destination route after navigation. Revert on failure.
    bannerShownRef.current = true;
    try {
      await whenReady();
      await AdMob.showBanner({
        adId,
        // Full-width anchored adaptive banner (Google-recommended). The native
        // patch in BannerExecutor hard-caps the AdView height at 120dp + clips,
        // so an oversized creative can't balloon the AdView. Adaptive gives a
        // proper full-width banner anchored above the bottom tabs (margin =
        // --bottom-nav-height). NOTE: a separate occlusion can still occur when
        // a RICH-MEDIA/video ad renders its own full-screen SurfaceView (only
        // seen with oversized TEST creatives on registered test devices) — that
        // surface is independent of adSize and not clippable; real image banners
        // don't create it.
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position,
        isTesting: isDev,
        ...(typeof margin === 'number' ? { margin } : {}),
      });
    } catch (err) {
      bannerShownRef.current = false;
      // warn (not error) — Sentry captureConsole treats error-level as errors.
      console.warn('[AdMob] showBanner failed', err);
    } finally {
      // Bringing the banner UP composites a fresh native SurfaceView over the
      // WebView. On a game→content exit (e.g. Daily word-hunt → /daily, where
      // AnchoredNativeBanner shows the 'content' banner) that surface flip can
      // leave the WebView's GPU surface unrepainted = a solid navy/black frame
      // on the destination — the "exit mid-daily-challenge → black screen"
      // report. Symmetric with hideBanner's teardown kick: force a repaint after
      // every surface flip, show or hide. Cheap one-frame layer toggle,
      // native-gated no-op on web.
      kickWebViewRepaint();
    }
  }, [hasNoAds, getConfig, isDev, whenReady]);

  /**
   * Pre-load a rewarded ad so the next `showRewarded` resolves instantly
   * (no network spinner between tap and ad). Fire-and-forget — failures
   * are silent because the eventual `showRewarded` retries `prepare` and
   * surfaces errors there.
   *
   * Call this when the user enters a context where they're likely to opt
   * in (e.g. a RewardedAdGoldButton mounting). Skipped on no-ads builds.
   */
  const prepareRewarded = useCallback(async (opts?: ShowRewardedOptions) => {
    if (hasNoAds()) return;
    const config = getConfig();
    if (!config) return;
    const surface: RewardedSurface = opts?.surface ?? 'generic';
    const adId = config.rewardedUnits?.[surface] ?? config.rewardedAdId;
    try {
      await whenReady();
      await AdMob.prepareRewardVideoAd({ adId, immersiveMode: REWARD_IMMERSIVE_MODE });
    } catch {
      // Silent: subsequent showRewarded path will retry + report.
    }
  }, [hasNoAds, getConfig, whenReady]);

  const hideBanner = useCallback(async () => {
    // getConfig returns null when AdMob isn't available — skip entirely.
    if (!getConfig()) return;
    // Always attempt the plugin call. The prior `bannerShownRef` early-return
    // raced with in-flight showBanner (ref flips after await), making hide a
    // no-op while a banner was about to paint on the destination route.
    // Plugin throws benign "no banner" when nothing is showing — caught below.
    try {
      await whenReady();
      await AdMob.hideBanner();
      bannerShownRef.current = false;
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err) {
        const msg = String((err as { message: unknown }).message);
        if (!/no banner|never shown|not shown|not.*display/i.test(msg)) console.warn('[AdMob] hideBanner failed', err);
      }
    } finally {
      // The native banner is an overlay SurfaceView composited over the WebView.
      // Tearing it down (e.g. exiting the results page → ResultsBannerSlot
      // unmounts) can leave the WebView's GPU surface unrepainted = a white band
      // / blank frame on the destination (lobby). This is the "stop game → exit
      // results → white screen" path (no interstitial fires on stop). Force a
      // repaint after every hide attempt so the WebView redraws the revealed
      // region — cheap one-frame layer toggle, harmless on the benign no-banner
      // path, and we always want a redraw during teardown.
      kickWebViewRepaint();
    }
  }, [getConfig, whenReady]);

  return { showRewarded, prepareRewarded, prepareInterstitial: prepareInterstitialAd, showInterstitial, showBanner, hideBanner };
}

export default useAdMob;
