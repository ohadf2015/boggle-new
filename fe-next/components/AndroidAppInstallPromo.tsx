'use client';

/**
 * AndroidAppInstallPromo — invites Android web visitors to install the native
 * LexiClash Android app.
 *
 * Complements AndroidAppRedirect: that one deep-links users who ALREADY have
 * the app; this one pitches the install to those who don't. The two use
 * separate dismissal keys so dismissing one never silences the other.
 *
 * Gating lives in the pure `shouldShowAndroidInstallPromo` helper (unit-tested);
 * this component only wires up the browser-side inputs, a non-intrusive delay,
 * and the neo-brutalist popup UI.
 */

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Smartphone } from 'lucide-react';
import posthog from 'posthog-js';
import { useLanguage } from '@/contexts/LanguageContext';
import { isAllowedAdBannerRoute } from '@/lib/admob-routes';
import {
  PLAY_STORE_URL,
  hasLexiClashInstalled,
  isCapacitorNative,
  isStandaloneDisplay,
  shouldShowAndroidInstallPromo,
} from '@/utils/androidApp';
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
  const { t } = useLanguage();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
    // iOS / desktop / native / PWA / disallowed routes / already-dismissed.
    if (!shouldShowAndroidInstallPromo(baseInput)) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    void hasLexiClashInstalled().then((installed) => {
      if (cancelled) return;
      if (!shouldShowAndroidInstallPromo({ ...baseInput, isInstalled: installed, now: Date.now() })) {
        return;
      }
      timer = setTimeout(() => {
        if (cancelled) return;
        sessionStorage.setItem(SESSION_FLAG, '1');
        setOpen(true);
        posthog.capture('android_install_promo_shown');
      }, SHOW_DELAY_MS);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pathname]);

  const persistDismissal = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000));
  };

  const handleDismiss = () => {
    setOpen(false);
    persistDismissal();
    posthog.capture('android_install_promo_dismissed');
  };

  const handleInstall = () => {
    posthog.capture('android_install_promo_install_click');
    persistDismissal();
    window.location.href = PLAY_STORE_URL;
  };

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
          />
        </div>

        <DialogBody className="text-center">
          <DialogTitle className="text-neo-lime">{t('androidAppPromo.title')}</DialogTitle>
          <p dir="auto" className="mt-2 text-sm sm:text-base font-medium text-neo-cream/90">
            {t('androidAppPromo.subtitle')}
          </p>
        </DialogBody>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <button
            type="button"
            onClick={handleInstall}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-neo-lime text-neo-black font-black uppercase tracking-tight border-3 border-neo-black rounded-neo shadow-hard-sm transition-all duration-100 hover:-translate-x-px hover:-translate-y-px hover:shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <Smartphone className="h-5 w-5 stroke-[2.5]" aria-hidden="true" />
            {t('androidAppPromo.install')}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full px-4 py-2 text-sm font-bold uppercase tracking-wide text-neo-cream/70 transition-colors hover:text-neo-cream"
          >
            {t('androidAppPromo.dismiss')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
