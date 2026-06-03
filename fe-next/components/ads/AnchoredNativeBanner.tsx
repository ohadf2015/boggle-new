'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPluginEvents, BannerAdPosition } from '@capacitor-community/admob';
import { useAdMob } from '@/hooks/useAdMob';
import { useSafeArea } from '@/hooks/useSafeArea';
import { isAllowedAdBannerRoute } from '@/lib/admob-routes';

export default function AnchoredNativeBanner() {
  const pathname = usePathname();
  const { showBanner, hideBanner } = useAdMob();
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
      // Hide first, collapse the reservation only AFTER the native overlay is
      // actually gone. A native banner composites ABOVE the WebView, so zeroing
      // --admob-banner-height synchronously drops bottom-anchored CTAs (e.g. the
      // daily ready-screen Play button) into the band the still-painted banner
      // occupies for the duration of the hide latency — that's the "ad covers
      // the button sometimes" race on navigation into a blocked route.
      void (async () => {
        try {
          await hideBanner();
        } finally {
          if (!cancelled) {
            document.documentElement.style.setProperty('--admob-banner-height', '0px');
            try { localStorage.setItem('lc_admob_h', '0'); } catch {}
          }
        }
      })();
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

    const applyBanner = async (margin: number) => {
      if (cancelled) return;
      // Keep the banner BEHIND the open mobile side menu. A native banner always
      // composites above the WebView, so the drawer can't cover it with z-index —
      // HeaderMobileMenu flags <html>.mobile-drawer-open while open and the
      // MutationObserver below re-runs us. Hide while open; reset lastMargin so the
      // banner is force-re-shown when the drawer closes (class removed → re-run).
      if (document.documentElement.classList.contains('mobile-drawer-open')) {
        await hideBanner();
        document.documentElement.style.setProperty('--admob-banner-height', '0px');
        lastMargin = -1;
        return;
      }
      if (margin === lastMargin) return;
      lastMargin = margin;
      await hideBanner();
      if (cancelled) return;
      // Re-read after the hide await — GlobalBottomNav's height effect may have
      // published a corrected nav height during the await (sibling effect race),
      // and the MutationObserver's follow-up applyBanner could race with this one.
      // Always show with the freshest value so the banner can't land below the nav.
      const finalMargin = computeMargin();
      lastMargin = finalMargin;
      // AnchoredNativeBanner renders only on non-game surfaces (profile,
      // leaderboard, blog, glossary, etc.) per isAllowedAdBannerRoute, so
      // we tag this as the 'content' variant for separate eCPM optimization.
      await showBanner(BannerAdPosition.BOTTOM_CENTER, finalMargin, { variant: 'content' });
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
  }, [pathname, showBanner, hideBanner, safeArea.bottom]);

  return null;
}
