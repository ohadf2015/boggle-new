'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPluginEvents } from '@capacitor-community/admob';
import { useSafeArea } from '@/hooks/useSafeArea';
import { isAllowedAdBannerRoute } from '@/lib/admob-routes';
import { bannerController, BANNER_OWNER } from '@/lib/native/bannerController';

export default function AnchoredNativeBanner() {
  const pathname = usePathname();
  const safeArea = useSafeArea();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const removers: Array<() => void> = [];

    const isAndroid = Capacitor.getPlatform() === 'android';
    const resetVar = () => {
      document.documentElement.style.setProperty('--admob-banner-height', '0px');
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

    if (!isAllowedAdBannerRoute(pathname)) {
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

    const computeMargin = (): number => {
      // Read --bottom-nav-height published by GlobalBottomNav (single source of truth).
      // The var holds the nav's real offsetHeight (h-16 + safe-area paddingBottom), so:
      //   Android: plugin adds safe-area on top → margin = max(navHeight, safeBottom).
      //   iOS: plugin re-adds safeAreaLayoutGuide → subtract to avoid double-count.
      // Inline value wins; otherwise fall back to the CSS-declared default
      // (`calc(64px + env(safe-area-inset-bottom))`) via computed style. Without
      // this fallback, the banner reads navHeight=0 on first commit — because
      // GlobalBottomNav's measuring useEffect (sibling subtree) runs AFTER ours
      // — and would briefly paint OVER the bottom tabs until the MutationObserver
      // catches up. Inline "0px" (nav explicitly hidden) still wins.
      const root = document.documentElement;
      const inline = root.style.getPropertyValue('--bottom-nav-height').trim();
      const raw = inline || getComputedStyle(root).getPropertyValue('--bottom-nav-height').trim();
      const navHeight = Math.round(parseFloat(raw) || 0);
      return isAndroid ? Math.max(navHeight, safeBottom) : Math.max(0, navHeight - safeBottom);
    };

    const applyBanner = (margin: number) => {
      if (cancelled) return;
      // Keep the banner BEHIND the open mobile side menu. A native banner always
      // composites above the WebView, so the drawer can't cover it with z-index —
      // HeaderMobileMenu flags <html>.mobile-drawer-open while open and the
      // MutationObserver below re-runs us. Withdraw the anchor intent while open;
      // reset lastMargin so it's force-re-requested when the drawer closes.
      if (document.documentElement.classList.contains('mobile-drawer-open')) {
        void bannerController.clearRequest(BANNER_OWNER.anchor.key);
        document.documentElement.style.setProperty('--admob-banner-height', '0px');
        lastMargin = -1;
        return;
      }
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

    // Initial sync call preserves test contract (margin reflects nav present at mount).
    applyBanner(computeMargin());

    // Re-measure after paint — nav DOM may not be laid out on first effect tick
    // (sibling render/effect race between essential-providers and layout).
    const rafId = requestAnimationFrame(() => {
      if (!cancelled) applyBanner(computeMargin());
    });

    // Single observer on <html>: GlobalBottomNav writes --bottom-nav-height to
    // the inline style attribute, and NavigationContext toggles `has-global-bottom-nav`
    // on the class attribute. Both paths covered here — re-applies banner margin
    // on orientation, font load, safe-area shift, and game-enter/exit transitions.
    const htmlObserver = new MutationObserver(() => applyBanner(computeMargin()));
    htmlObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      htmlObserver.disconnect();
    };
  }, [pathname, safeArea.bottom]);

  return null;
}
