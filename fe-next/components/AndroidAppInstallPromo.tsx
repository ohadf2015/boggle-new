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
 *  - the unsolicited auto-popup (gated by `shouldShowAndroidInstallPromo`,
 *    shown once per session after a delay, then silenced for 14 days), and
 *  - the user-initiated re-entry surfaces (the header menu row and the session
 *    pill) which open the SAME dialog via the shared store with their own
 *    `source` tag.
 *
 * Dismissing still arms the 14-day auto-popup cooldown (we respect the "no"),
 * but collapses to a session pill so the player can reopen it on a whim, and
 * the permanent menu row remains as the durable way back across reloads.
 */

import { useEffect } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Zap, WifiOff, Bell } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { isAllowedAdBannerRoute } from '@/lib/admob-routes';
import { useExperiment } from '@/hooks/useExperiment';
import { readGamesCompletedCount } from '@/utils/gamesCompletedCount';
import {
  hasLexiClashInstalled,
  isCapacitorNative,
  isStandaloneDisplay,
  playStoreUrlWithReferrer,
  shouldShowAndroidInstallPromo,
} from '@/utils/androidApp';
import { useAndroidInstallStore } from '@/lib/androidInstall/androidInstallStore';
import {
  trackInstallClick,
  trackInstallDismissed,
  trackInstallPromoShown,
} from '@/lib/androidInstall/installTracking';
import GooglePlayMark from '@/components/android-install/GooglePlayMark';
import {
  Dialog,
  DialogContent,
  DialogBody,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';

const SESSION_FLAG = 'android_app_install_promo_shown';
const DISMISS_KEY = 'android_app_install_promo_dismissed_until';
const DISMISS_DAYS = 14;
const SHOW_DELAY_MS = 12_000;

export default function AndroidAppInstallPromo() {
  const { t, language } = useLanguage();
  const pathname = usePathname();

  const open = useAndroidInstallStore((s) => s.open);
  const source = useAndroidInstallStore((s) => s.source);
  const openPromo = useAndroidInstallStore((s) => s.openPromo);
  const closePromo = useAndroidInstallStore((s) => s.closePromo);
  const showPill = useAndroidInstallStore((s) => s.showPill);

  // exp-install-promo-after-first-game-v1 — auto-popup timing only. The pill and the
  // menu entry (both user-initiated) are untouched by this experiment.
  const { variant: promoTimingVariant, trackExposure: trackPromoTimingExposure } =
    useExperiment('exp-install-promo-after-first-game-v1');
  const requireEngagement = promoTimingVariant === 'after-first-game';

  // ── Unsolicited auto-popup gating ──────────────────────────────────────
  useEffect(() => {
    const storedDismiss = localStorage.getItem(DISMISS_KEY);
    const baseInput = {
      ua: navigator.userAgent,
      isCapacitorNative: isCapacitorNative(),
      isStandalone: isStandaloneDisplay(),
      isInstalled: false,
      isAllowedRoute: isAllowedAdBannerRoute(pathname),
      dismissedUntil: storedDismiss ? parseInt(storedDismiss, 10) : null,
      sessionShown: Boolean(sessionStorage.getItem(SESSION_FLAG)),
      now: Date.now(),
    };

    // Cheap synchronous gates first — never probe for the installed app on
    // iOS / native / PWA / disallowed routes / already-dismissed. (Desktop IS
    // eligible now — it's a deliberate promo target.)
    if (!shouldShowAndroidInstallPromo(baseInput)) return;

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
          // Variant gate, evaluated at FIRE time and re-armed — not once at mount.
          // A one-shot check here would turn "hasn't played yet after 12s" into
          // "never sees the promo at all", which reads as a variant win while
          // actually being a silent no-op (Class 4). Re-arming keeps the variant a
          // DELAY, not a suppression; it stops on show (session flag) or unmount.
          if (!shouldShowAndroidInstallPromo({
            ...baseInput,
            isInstalled: installed,
            now: Date.now(),
            requireEngagement,
            gamesCompleted: readGamesCompletedCount(),
          })) {
            timer = undefined;
            arm();
            return;
          }
          sessionStorage.setItem(SESSION_FLAG, '1');
          openPromo('auto_popup');
          trackInstallPromoShown('auto_popup');
          // Exposure fires HERE, not at mount: only visitors who genuinely reached a
          // promo decision belong in the experiment, otherwise every ineligible
          // pageview dilutes both buckets and the result is unreadable.
          trackPromoTimingExposure();
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
  }, [pathname, openPromo, requireEngagement, trackPromoTimingExposure]);

  const persistDismissal = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000));
  };

  const handleDismiss = () => {
    trackInstallDismissed(source);
    closePromo();
    persistDismissal();
    // Collapse to the session pill instead of vanishing entirely.
    showPill();
  };

  const handleInstall = () => {
    trackInstallClick(source);
    persistDismissal();
    // Carry an install referrer so the install is attributable in Play Console.
    window.location.href = playStoreUrlWithReferrer('install_popup', language);
  };

  const perks = [
    { Icon: Zap, text: t('androidAppPromo.perkFaster') },
    { Icon: WifiOff, text: t('androidAppPromo.perkOffline') },
    { Icon: Bell, text: t('androidAppPromo.perkReminders') },
  ];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleDismiss()}>
      <DialogContent
        thickBorder
        noDescription
        closeButtonLabel={t('androidAppPromo.close')}
        className="max-w-md p-0 gap-0 overflow-hidden bg-neo-navy text-neo-white"
      >
        <div className="relative w-full aspect-[3/2] border-b-3 border-neo-black bg-neo-navy-light">
          <Image
            src="/images/promo/android-app-promo.jpg"
            alt={t('androidAppPromo.imageAlt')}
            fill
            sizes="(max-width: 640px) 100vw, 28rem"
            className="object-cover"
            // Eager: the dialog only opens post-interaction (see the LCP guard
            // above), so lazy's near-viewport deferral just adds a visible
            // pop-in inside an already-open modal.
            loading="eager"
          />
        </div>

        <DialogBody className="text-center">
          <DialogTitle className="text-neo-lime">{t('androidAppPromo.title')}</DialogTitle>
          <p dir="auto" className="mt-2 text-sm sm:text-base font-medium text-neo-white">
            {t('androidAppPromo.subtitle')}
          </p>

          <ul className="mt-4 flex flex-col gap-2 text-start">
            {perks.map(({ Icon, text }) => (
              <li key={text} dir="auto" className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black">
                  <Icon className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-neo-white">{text}</span>
              </li>
            ))}
          </ul>
        </DialogBody>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <button
            type="button"
            onClick={handleInstall}
            aria-label={`${t('androidAppPromo.install')} — Google Play`}
            className="group w-full inline-flex items-center justify-center gap-3 px-6 py-3 bg-neo-black text-neo-white border-3 border-neo-black rounded-neo shadow-hard-sm transition-all duration-100 hover:-translate-x-px hover:-translate-y-px hover:shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <GooglePlayMark size={26} />
            <span className="flex flex-col items-start leading-none">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neo-lime">
                {t('androidAppPromo.installEyebrow')}
              </span>
              <span className="font-neo-display text-lg font-black tracking-tight">
                {t('androidAppPromo.install')}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full px-4 py-2 text-sm font-bold uppercase tracking-wide text-neo-white/70 transition-colors hover:text-neo-white"
          >
            {t('androidAppPromo.dismiss')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
