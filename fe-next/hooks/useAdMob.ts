import { useCallback } from 'react';
import { AdMob, BannerAdSize, BannerAdPosition, RewardAdPluginEvents, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import { useAdMobContext } from '@/contexts/AdMobContext';
import type { RewardedSurface, BannerVariant } from '@/lib/admob-config';
import { kickWebViewRepaint } from '@/lib/native/webviewRepaint';

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

export interface ShowBannerOptions {
  variant?: BannerVariant;
}

export function useAdMob() {
  const { recordGameEnd, shouldShowInterstitial, recordInterstitialShown, hasNoAds, getConfig, whenReady } = useAdMobContext();
  const isDev = process.env.NODE_ENV !== 'production';

  const showRewarded = useCallback(async (onReward: () => void, onError?: (err: string) => void, opts?: ShowRewardedOptions) => {
    if (hasNoAds()) return;
    const config = getConfig();
    if (!config) return;
    const surface: RewardedSurface = opts?.surface ?? 'generic';
    // Per-surface unit ID lets AdMob waterfall optimize each placement separately.
    const adId = config.rewardedUnits?.[surface] ?? config.rewardedAdId;

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
    const REWARD_GRACE_MS = 750;
    const handles: Array<{ remove: () => void | Promise<void> }> = [];

    const cleanup = () => {
      if (dismissGraceTimer) { clearTimeout(dismissGraceTimer); dismissGraceTimer = null; }
      if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
      if (prepareTimer) { clearTimeout(prepareTimer); prepareTimer = null; }
      handles.forEach((h) => { try { h.remove(); } catch {} });
      handles.length = 0;
    };

    let finishRef: (ok: boolean, errMsg?: string) => void = () => {};

    const pendingHandles = [
      AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
        rewarded = true;
        finishRef(true);
      }),
      AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        if (rewarded || settled) return;
        dismissGraceTimer = setTimeout(() => {
          if (!rewarded) finishRef(false);
        }, REWARD_GRACE_MS);
      }),
      AdMob.addListener(RewardAdPluginEvents.FailedToShow, (e: { message?: string } | undefined) => finishRef(false, e?.message || 'Ad failed to show')),
      AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (e: { message?: string } | undefined) => finishRef(false, e?.message || 'Ad failed to load')),
    ];
    // Await registration before we fire `prepareRewardVideoAd`, otherwise a fast plugin
    // could emit Rewarded before our listener is attached on the native side.
    try {
      const resolved = await Promise.all(pendingHandles);
      handles.push(...resolved);
    } catch { /* listener registration is best-effort; ad path still drives outcome */ }

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
              () => finishRef(false, 'Ad not ready — please try again'),
              REWARD_PREPARE_TIMEOUT_MS,
            );
            await whenReady();
            await AdMob.prepareRewardVideoAd({ adId });
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
              () => finishRef(false, 'Ad timed out — please try again'),
              REWARD_SAFETY_TIMEOUT_MS,
            );
            await AdMob.showRewardVideoAd();
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
      void AdMob.prepareRewardVideoAd({ adId }).catch(() => {});
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
    if (!shouldShowInterstitial()) return;
    const config = getConfig();
    if (!config) return;
    // Record before show — gate uses this counter, recording after a thrown
    // showInterstitial would let a broken plugin re-fire indefinitely.
    recordInterstitialShown();

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
      };

      // Register listeners BEFORE prepare so a fast plugin can't fire
      // Dismissed/FailedToShow before we're listening.
      Promise.all([
        AdMob.addListener(InterstitialAdPluginEvents.Dismissed, settle),
        AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, settle),
        AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, settle),
      ])
        .then((resolved) => {
          if (settled) {
            resolved.forEach((h) => { try { h.remove(); } catch {} });
            return;
          }
          handles.push(...resolved);
        })
        .catch(() => { /* listener registration is best-effort */ });

      timer = setTimeout(settle, INTERSTITIAL_SAFETY_TIMEOUT_MS);

      (async () => {
        try {
          await whenReady();
          await AdMob.prepareInterstitial({ adId: config.interstitialAdId });
          await AdMob.showInterstitial();
        } catch {
          settle();
        }
      })();
    });
  }, [recordGameEnd, shouldShowInterstitial, recordInterstitialShown, getConfig, whenReady]);

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
      await AdMob.prepareRewardVideoAd({ adId });
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

  return { showRewarded, prepareRewarded, showInterstitial, showBanner, hideBanner };
}

export default useAdMob;
