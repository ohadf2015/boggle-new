'use client';

/**
 * AndroidAppInstallPromo — invites Android web visitors to install the native
 * LexiClash Android app.
 *
 * Complements AndroidAppRedirect: that one deep-links users who ALREADY have
 * the app; this one pitches the install to those who don't. The two use
 * separate dismissal keys so dismissing one never silences the other.
 *
 * Two ways in:
 *  - the unsolicited auto-popup (gated by `shouldShowAndroidInstallPromo`, shown
 *    only after a game finished this session, off play routes, once per session,
 *    then silenced for 14 days), and
 *  - the user-initiated re-entry surfaces (the header menu row and the session
 *    pill) which open the SAME dialog via the shared store with their own
 *    `source` tag.
 *
 * Dismissing still arms the 14-day auto-popup cooldown (we respect the "no"),
 * but collapses to a session pill so the player can reopen it on a whim, and
 * the permanent menu row remains as the durable way back across reloads.
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { isAllowedAdBannerRoute } from '@/lib/admob-routes';
import { isOverlayQuietZoneActive } from '@/lib/overlayQuietZone';
import { finishedGameThisSession, isPostGameMoment } from '@/components/android-install/postGameMoment';
import {
  hasLexiClashInstalled,
  isCapacitorNative,
  isDesktopInstallContext,
  isStandaloneDisplay,
  playStoreUrlWithReferrer,
  shouldShowAndroidInstallPromo,
} from '@/utils/androidApp';
import { hasConsentDecision } from '@/utils/cookieConsent';
import { useAndroidInstallStore } from '@/lib/androidInstall/androidInstallStore';
import {
  readInstallDismissedUntil,
  persistInstallDismissal,
} from '@/lib/androidInstall/installCooldown';
import {
  markPromoShown,
  wasPromoShownThisSession,
} from '@/lib/landing/promoOverlaySession';
import {
  trackInstallClick,
  trackInstallDismissed,
  trackInstallPromoShown,
} from '@/lib/androidInstall/installTracking';
import InstallPromoCard from '@/components/android-install/InstallPromoCard';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const SESSION_FLAG = 'android_app_install_promo_shown';
const SHOW_DELAY_MS = 12_000;

export default function AndroidAppInstallPromo() {
  const { t, language } = useLanguage();
  const pathname = usePathname();

  const open = useAndroidInstallStore((s) => s.open);
  const source = useAndroidInstallStore((s) => s.source);
  const openPromo = useAndroidInstallStore((s) => s.openPromo);
  const closePromo = useAndroidInstallStore((s) => s.closePromo);
  const showPill = useAndroidInstallStore((s) => s.showPill);

  // ── Unsolicited auto-popup gating ──────────────────────────────────────
  useEffect(() => {
    finishedGameThisSession(); // snapshot the session's starting count before any game ends
    const baseInput = {
      ua: navigator.userAgent,
      isCapacitorNative: isCapacitorNative(),
      isStandalone: isStandaloneDisplay(),
      isInstalled: false,
      isAllowedRoute: isAllowedAdBannerRoute(pathname),
      // NOT the live quiet-zone reading. This value feeds the cheap synchronous
      // early-out below, which `return`s for good — an overlay-quiet surface at
      // MOUNT time would drop the promo for the rest of the page view instead of
      // delaying it (pitfalls class 4: a silent no-op that looks like "nothing to
      // do"). The zone is a DELAY, so it is read at fire time, where failing
      // re-arms the loop. Same reasoning as the post-game gate below.
      inGame: false,
      dismissedUntil: readInstallDismissedUntil(),
      sessionShown: Boolean(sessionStorage.getItem(SESSION_FLAG)),
      now: Date.now(),
    };

    // Cheap synchronous gates first — never probe for the installed app on
    // iOS / native / PWA / disallowed routes / already-dismissed. (Desktop IS
    // eligible now — it's a deliberate promo target.)
    // Also gate on shared promo session flag: don't stack if another promo showed.
    if (!shouldShowAndroidInstallPromo(baseInput)) return;
    if (wasPromoShownThisSession()) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cleanupListeners: (() => void) | undefined;

    void hasLexiClashInstalled().then((installed) => {
      if (cancelled) return;
      if (!shouldShowAndroidInstallPromo({ ...baseInput, isInstalled: installed, now: Date.now() })) {
        return;
      }
      const arm = () => {
        if (cancelled || timer) return;
        timer = setTimeout(() => {
          if (cancelled) return;
          // Re-check the native shell at fire time: on the remote-URL WebView,
          // `window.Capacitor` can still be absent at mount (when `baseInput`
          // was captured), so the bridge may only register during this delay.
          // Without this, the app would flash the popup. (Class 1 / Class 3.)
          if (isCapacitorNative()) return;
          // Shared promo session flag re-check at fire time: if another overlay
          // (NewModesAnnouncement, etc.) showed between mount and this timer,
          // don't stack. (Class 1 — dual source of truth + async resolution.)
          if (wasPromoShownThisSession()) return;
          // Post-game gate, re-read at FIRE time and re-armed, never decided once at
          // mount: "no game finished yet" must delay the promo, not drop it (Class 4).
          // It also keeps it off every play route, so it can't fire mid-round
          // (WordCraft, a /multiplayer board) or over a results screen.
          // Storage is re-read here, not spread from `baseInput`: while the loop
          // spins the player can dismiss from the header menu row, and a frozen
          // `dismissedUntil: null` would fire through an active 14-day cooldown.
          if (!shouldShowAndroidInstallPromo({
            ...baseInput,
            isInstalled: installed,
            // Re-read, not spread: the round the player is in almost never started at
            // mount. A frozen `inGame: false` is exactly how the interstitial ended up
            // over a live board. Failing here re-arms, so the promo lands after the round.
            inGame: isOverlayQuietZoneActive(),
            dismissedUntil: readInstallDismissedUntil(),
            sessionShown: Boolean(sessionStorage.getItem(SESSION_FLAG)),
            now: Date.now(),
            requireEngagement: true,
            gamesCompleted: isPostGameMoment(pathname) ? 1 : 0,
            // Cookie sheet first: the Dialog portals above the in-tree consent UI and
            // traps focus, so ACCEPT ALL is unreachable until NOT NOW. Re-arm until
            // the visitor decides (same pattern as inGame).
            consentPending: !hasConsentDecision(),
          })) {
            timer = undefined;
            arm();
            return;
          }
          sessionStorage.setItem(SESSION_FLAG, '1');
          markPromoShown(); // Gate other promos from auto-opening
          openPromo('auto_popup');
          trackInstallPromoShown('auto_popup');
        }, SHOW_DELAY_MS);
      };
      // LCP guard: only start the countdown after the visitor's first tap or
      // keypress. Chrome stops considering LCP candidates at the first user
      // input, so a dialog that can only open post-interaction can never
      // become the LCP element — before this, the auto-popup fired at 12s and
      // its hero image was recorded as a ~12-22s LCP in both lab (PSI/Lighthouse
      // never interact) and field data for passive Android visitors. Passive
      // visitors (lab audits, bounce traffic) simply never see the popup.
      const hasInteracted =
        typeof navigator !== 'undefined' &&
        Boolean(navigator.userActivation?.hasBeenActive);
      if (hasInteracted) {
        arm();
      } else {
        window.addEventListener('pointerdown', arm, { once: true });
        window.addEventListener('keydown', arm, { once: true });
      }
      cleanupListeners = () => {
        window.removeEventListener('pointerdown', arm);
        window.removeEventListener('keydown', arm);
      };
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      cleanupListeners?.();
    };
  }, [pathname, openPromo]);

  const handleDismiss = () => {
    trackInstallDismissed(source);
    closePromo();
    persistInstallDismissal();
    // Collapse to the session pill instead of vanishing entirely. The pill also
    // reads the cooldown, so this is the LAST appearance for 14 days — it stays
    // for the rest of this page view, not for every page the player opens next.
    showPill();
  };

  const handleInstall = () => {
    trackInstallClick(source);
    persistInstallDismissal();
    // Carry an install referrer so the install is attributable in Play Console.
    window.location.href = playStoreUrlWithReferrer('install_popup', language);
  };

  const wide = open && isDesktopInstallContext();

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleDismiss()}>
      <DialogContent
        thickBorder
        noDescription
        closeButtonLabel={t('androidAppPromo.close')}
        className={cn('gap-0 overflow-hidden bg-neo-navy p-0 text-neo-white', wide ? 'max-w-[54rem]' : 'max-w-md')}
      >
        {open && <InstallPromoCard wide={wide} source={source} onInstall={handleInstall} onDismiss={handleDismiss} />}
      </DialogContent>
    </Dialog>
  );
}
