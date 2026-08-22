'use client';

/**
 * AndroidInstallPill — the session re-entry surface for the Android app install.
 *
 * Appears after the user dismisses the auto-popup (the dismiss handler calls
 * `showPill()`), so the offer doesn't vanish mid-page. The permanent header menu
 * row (GetAppMenuRow) is the durable way back.
 *
 * It is NOT user-initiated — the store defaults it visible, so it auto-appears.
 * That means it owes the player the same 14-day cooldown the popup respects:
 * mounting inside an active dismissal renders nothing, and closing it arms the
 * cooldown itself. Before that it re-appeared on every page load after a "no
 * thanks" (desktop, 7 days: 2.58 impressions/session vs the popup's 1.07).
 *
 * Anchored to the inline-end EDGE, vertically centred — deliberately clear of
 * the header (top) and the AdMob banner band (bottom) that rides on these same
 * routes. `end-*` auto-flips for RTL.
 */

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Smartphone, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAndroidInstallStore } from '@/lib/androidInstall/androidInstallStore';
import { isAndroidInstallEntryEligible } from '@/lib/androidInstall/installEligibility';
import {
  isInstallPromoDismissed,
  persistInstallDismissal,
} from '@/lib/androidInstall/installCooldown';
import { isAllowedAdBannerRoute } from '@/lib/admob-routes';
import { useInGameSurface } from '@/lib/inGameSurface';
import {
  isCapacitorNative,
  isStandaloneDisplay,
} from '@/utils/androidApp';
import {
  trackInstallPillClick,
  trackInstallPillDismissed,
  trackInstallPillShown,
} from '@/lib/androidInstall/installTracking';

const HIDDEN_KEY = 'android_app_install_pill_hidden';

// The remote-URL Capacitor WebView injects `window.Capacitor` around page load,
// but it can be absent for the first render(s) — an immediate check misreads the
// native app as a web visitor. We render the pessimistic (hidden) state and
// only reveal after this settle window, re-checking the bridge first. The
// native bridge always registers well within this budget, so the app never
// flashes the pill. See .claude/rules/60-recurring-pitfalls.md, Class 1.
const NATIVE_SETTLE_MS = 1500;

export default function AndroidInstallPill() {
  const { t } = useLanguage();
  const pillVisible = useAndroidInstallStore((s) => s.pillVisible);
  const openPromo = useAndroidInstallStore((s) => s.openPromo);
  const hidePill = useAndroidInstallStore((s) => s.hidePill);

  // Pessimistic default: assume we might be inside the native shell until the
  // Capacitor bridge has had a chance to register. Never render an optimistic
  // "web" default that a late-resolving native bridge would have to retract.
  const [eligible, setEligible] = useState(false);
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    // Bridge already present → definitively native, stay hidden.
    if (isCapacitorNative()) return;

    // Honour the popup's 14-day "no thanks". The pill defaults to visible in the
    // store, so without this it walked back in on the very next page load and
    // the dismissal only ever silenced the popup — on desktop that measured 2.58
    // pill impressions per session against the popup's 1.07.
    // Read at MOUNT, so a dismissal during this page view still collapses the
    // popup into the pill (`showPill()`); it's the NEXT page that stays clean.
    if (isInstallPromoDismissed()) return;

    const webEligible = isAndroidInstallEntryEligible({
      ua: navigator.userAgent,
      isCapacitorNative: false,
      isStandalone: isStandaloneDisplay(),
    });
    if (!webEligible) return;

    // Wait out the bridge-registration race, then re-check before revealing.
    const timer = setTimeout(() => {
      if (!isCapacitorNative()) setEligible(true);
    }, NATIVE_SETTLE_MS);
    return () => clearTimeout(timer);
  }, []);

  // Session opt-out: once closed, stay gone until a new session.
  const [sessionHidden, setSessionHidden] = useState(false);
  useEffect(() => {
    setSessionHidden(Boolean(sessionStorage.getItem(HIDDEN_KEY)));
  }, []);

  // Same route gate as the ad banner: gameplay surfaces (on-screen keyboards,
  // boards) must never be covered by a floating promo.
  const pathname = usePathname();
  const routeAllowed = isAllowedAdBannerRoute(pathname);
  // …and the route gate is not enough. `/multiplayer` is deliberately off GAME_ROUTES so its
  // passive lobby can still monetize, which also left this pill floating over a live board
  // (measured over 4 of 36 tiles on /he, 2026-08-23). Reactive: the round usually starts long
  // after this mounted, so a mount-time read would miss it.
  const inGame = useInGameSurface();

  const shown = pillVisible && eligible && !sessionHidden && routeAllowed && !inGame;

  // Track the impression once per appearance.
  useEffect(() => {
    if (shown) trackInstallPillShown();
  }, [shown]);

  if (!shown) return null;

  const handleOpen = () => {
    trackInstallPillClick();
    openPromo('pill');
  };

  const handleClose = () => {
    trackInstallPillDismissed();
    // Closing the pill IS a "no thanks" — arm the same 14-day cooldown the popup
    // writes, so it doesn't come back next session. The header menu row stays as
    // the durable, user-initiated way in.
    persistInstallDismissal();
    sessionStorage.setItem(HIDDEN_KEY, '1');
    setSessionHidden(true);
    hidePill();
  };

  return (
    <div className="fixed end-0 top-1/2 z-[55] flex -translate-y-1/2 items-stretch">
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-s-neo border-3 border-e-0 border-neo-black bg-neo-lime py-2 ps-3 pe-2 font-neo-display text-sm font-black uppercase tracking-tight text-neo-black shadow-hard-sm transition-transform duration-100 hover:-translate-x-px active:translate-x-[1px]"
      >
        <Smartphone className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
        <span>{t('androidAppPromo.pillLabel')}</span>
      </button>
      <button
        type="button"
        onClick={handleClose}
        aria-label={t('androidAppPromo.pillClose')}
        className="flex items-center justify-center border-3 border-s-0 border-neo-black bg-neo-navy px-1.5 text-neo-white/80 transition-colors hover:text-neo-white"
      >
        <X className="h-3.5 w-3.5 stroke-[3]" aria-hidden="true" />
      </button>
    </div>
  );
}
