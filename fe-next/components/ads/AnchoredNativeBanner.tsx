'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPluginEvents } from '@capacitor-community/admob';
import { useSafeArea } from '@/hooks/useSafeArea';
import { isAllowedAdBannerRoute } from '@/lib/admob-routes';
import { bannerController, BANNER_OWNER } from '@/lib/native/bannerController';
import { computeBannerMargin } from '@/lib/native/bannerMargin';

export default function AnchoredNativeBanner() {
  const pathname = usePathname();
  const safeArea = useSafeArea();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const removers: Array<() => void> = [];

    const isAndroid = Capacitor.getPlatform() === 'android';
    const resetVar = () => {
      document.documentElement.style.setProperty('--admob-banner-height', '0px');
      // Banner no longer occupies the bottom band → content stops reserving it.
      document.documentElement.classList.remove('has-admob-banner');
      try { localStorage.setItem('lc_admob_h', '0'); } catch {}
    };

    AdMob.addListener(BannerAdPluginEvents.SizeChanged, (info: { height: number }) => {
      const h = info?.height ?? 0;
      // Var = banner clearance from viewport bottom (used by in-game content that
      // hides the bottom nav). Android plugin margin adds safe-area; iOS plugin
      // adds safeAreaLayoutGuide internally. Nav-related lift is NOT in this var —
      // pages with the nav use `has-global-bottom-nav` for their own clearance.
      const total = h > 0 ? h + (isAndroid ? (safeArea.bottom || 0) : 0) : 0;
      document.documentElement.style.setProperty('--admob-banner-height', `${total}px`);
      // Signal banner presence independent of the bottom nav, so content reserves
      // the band even when the nav is hidden (the clearance rule keys off
      // `has-admob-banner` too — banner must never cover bottom CTAs).
      document.documentElement.classList.toggle('has-admob-banner', total > 0);
      // Cache for next session's CLS-priming script in <head>.
      try { localStorage.setItem('lc_admob_h', String(total)); } catch {}
    })
      .then((handle) => { removers.push(() => handle.remove()); })
      .catch(() => {});

    // Without these, a failed/closed banner leaves the var inflated from a prior
    // SizeChanged event → in-game content floats mid-screen above empty space.
    AdMob.addListener(BannerAdPluginEvents.FailedToLoad, resetVar)
      .then((handle) => { removers.push(() => handle.remove()); })
      .catch(() => {});

    AdMob.addListener(BannerAdPluginEvents.Closed, resetVar)
      .then((handle) => { removers.push(() => handle.remove()); })
      .catch(() => {});

    return () => {
      removers.forEach((r) => r());
      resetVar();
    };
  }, [safeArea.bottom]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    let lastMargin = -1;
    const isAndroid = Capacitor.getPlatform() === 'android';
    const safeBottom = safeArea.bottom || 0;

    // Native-only effect → window is defined; `classroom` is fixed at page entry,
    // so reading location.search here (vs useSearchParams) keeps this null-render
    // banner from forcing a client-side-rendering bailout on every static page.
    const search = new URLSearchParams(window.location.search);
    if (!isAllowedAdBannerRoute(pathname, search)) {
      // Withdraw the anchor's intent (NOT a global hide — a results page on a
      // game route may still want its InlineBannerAd 'slot' banner; the
      // coordinator keeps that one alive). Collapse the reservation only AFTER
      // the native overlay is actually gone: a native banner composites ABOVE
      // the WebView, so zeroing --admob-banner-height synchronously drops
      // bottom-anchored CTAs (e.g. the daily ready-screen Play button) into the
      // band the still-painted banner occupies for the hide latency — the "ad
      // covers the button sometimes" race on navigation into a blocked route.
      void bannerController.clearRequest(BANNER_OWNER.anchor.key).finally(() => {
        if (!cancelled) {
          document.documentElement.style.setProperty('--admob-banner-height', '0px');
          try { localStorage.setItem('lc_admob_h', '0'); } catch {}
        }
      });
      return () => { cancelled = true; };
    }

    const computeMargin = (allowCssFallback: boolean): number => {
      // Read --bottom-nav-height published by GlobalBottomNav (single source of truth).
      // The var holds the nav's real offsetHeight (h-16 + safe-area paddingBottom), so:
      // Inline value always wins. The CSS-declared default
      // (`calc(64px + env(safe-area-inset-bottom))`) is trusted ONLY on the first
      // synchronous frame (allowCssFallback) — it's purely an over-paint guard
      // for the commit before GlobalBottomNav's sibling effect publishes the var.
      // Once settled (rAF + observer), an absent inline value means there is NO
      // bottom nav at all, so we treat navHeight as 0 and let the banner stick to
      // the bottom — otherwise it would float 64px up forever on nav-less surfaces.
      const root = document.documentElement;
      const inline = root.style.getPropertyValue('--bottom-nav-height').trim();
      const raw =
        inline ||
        (allowCssFallback
          ? getComputedStyle(root).getPropertyValue('--bottom-nav-height').trim()
          : '');
      const navHeight = Math.round(parseFloat(raw) || 0);
      return computeBannerMargin({ navHeight, safeBottom, isAndroid });
    };

    const applyBanner = (margin: number) => {
      if (cancelled) return;
      // Drawer-suppress (hide behind the open side menu) is owned centrally by
      // bannerController.setSuppressed via BannerCoordinatorMount — it covers
      // both banner owners (anchor + slot), so it's not handled here anymore.
      if (margin === lastMargin) return;
      lastMargin = margin;
      // Declare the anchor's intent; the coordinator serializes against the
      // InlineBannerAd 'slot' owner (slot wins) and dedups identical requests.
      // No in-call hide-then-reshow: a late nav-height correction re-fires this
      // via the MutationObserver below with the fresh margin. AnchoredNativeBanner
      // renders only on non-game surfaces, so we tag the 'content' variant.
      void bannerController.setRequest(BANNER_OWNER.anchor.key, {
        margin,
        variant: 'content',
        priority: BANNER_OWNER.anchor.priority,
      });
    };

    // Initial sync call: trust the CSS-default fallback (over-paint guard before
    // GlobalBottomNav's sibling effect publishes --bottom-nav-height).
    applyBanner(computeMargin(true));

    // Re-measure after paint — nav DOM may not be laid out on first effect tick
    // (sibling render/effect race between essential-providers and layout). By now
    // a real nav has published its var; an absent var means no nav → inline-or-zero.
    const rafId = requestAnimationFrame(() => {
      if (!cancelled) applyBanner(computeMargin(false));
    });

    // Single observer on <html>: GlobalBottomNav writes --bottom-nav-height to
    // the inline style attribute, and NavigationContext toggles `has-global-bottom-nav`
    // on the class attribute. Both paths covered here — re-applies banner margin
    // on orientation, font load, safe-area shift, and game-enter/exit transitions.
    const htmlObserver = new MutationObserver(() => applyBanner(computeMargin(false)));
    htmlObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      htmlObserver.disconnect();
    };
  }, [pathname, safeArea.bottom]);

  return null;
}
