'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import { Download, Share, Plus, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { gameEvents } from '@/components/GoogleAnalytics';
import { isAndroidBrowser } from '@/utils/androidApp';
import { isNative } from '@/utils/platform';
import { readGamesCompletedCount } from '@/utils/gamesCompletedCount';
import { isIOSSafari, shouldShowIOSInstallHint } from '@/utils/iosInstall';
import { useOverlayQuietZone } from '@/lib/overlayQuietZone';
import { markPromoShown, wasPromoShownThisSession } from '@/lib/landing/promoOverlaySession';
import { isPostGameMoment, finishedGameThisSession } from '@/components/android-install/postGameMoment';
import { MOTION } from '@/components/motion/tokens';
import { Button } from '@/components/ui/button';

const PWA_DISMISS_KEY = 'pwa_install_dismissed_until';
const PWA_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

// `games_completed_count` is written by trackGameEnd() in utils/growthTracking —
// the single funnel every mode's completion routes through. Do NOT add a local
// window-event listener to maintain it; the one that used to live here listened
// for an event nobody dispatched, so this counter sat at 0 and both banners
// below were unreachable.

/** iOS-only: home-screen-installed check (Safari's non-standard flag + display-mode). */
function isIOSStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * A compact top toast that offers the PWA install (or iOS Add to Home Screen) once a
 * game has finished in this session, on a menu page, at most once per session.
 * Needs 2+ lifetime games and no dismissal in the last 7 days.
 */
export function PWAInstallPrompt() {
  'use no memo'; // render reads the DOM and storage (pill, session slot, finished game); the compiler would cache them
  const { t } = useLanguage();
  const { isInGame } = useNavigation();
  // `isInGame` is false on exactly the surfaces this banner hurt most: the
  // classroom round-end recap and the projector results both live on
  // /multiplayer, which is deliberately not a game route. The quiet zone is
  // raised by the surface itself, so it covers them and the grace window after
  // a round ends. `showPrompt` is untouched — the banner is deferred, not lost.
  const overlayQuietZone = useOverlayQuietZone();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  // iOS Safari can't fire beforeinstallprompt — this shows the manual
  // "Add to Home Screen" instructional banner instead (the iPhone install path).
  const [iosHint, setIosHint] = useState(false);
  const [latched, setLatched] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    finishedGameThisSession(); // snapshot the session's starting count before any game ends
    // Cheap early-out on a conversion surface (checkout pages) — skips registering the
    // listener at all when we mount straight onto one. This is NOT the guard that holds;
    // the render-time check further down is. See the comment there.
    if (document.body.classList.contains('conversion-surface')) return;

    // On Android the native app promo (AndroidAppInstallPromo) owns the install
    // pitch — yield so the user never gets two install prompts. Desktop Chrome,
    // where there is no native app, still gets the PWA banner.
    if (isAndroidBrowser(navigator.userAgent)) return;

    // iOS Safari: no beforeinstallprompt event exists, so decide the manual
    // Add-to-Home-Screen hint here and stop (no listener to attach).
    if (isIOSSafari(navigator.userAgent)) {
      const iosDismiss = localStorage.getItem(PWA_DISMISS_KEY);
      if (
        shouldShowIOSInstallHint({
          ua: navigator.userAgent,
          isStandalone: isIOSStandalone(),
          isNativeApp: isNative(),
          gamesCompleted: readGamesCompletedCount(),
          dismissedUntil: iosDismiss ? parseInt(iosDismiss, 10) : null,
          now: Date.now(),
        })
      ) {
        setIosHint(true);
      }
      return;
    }

    // Check if user has dismissed prompt recently
    const dismissedUntil = localStorage.getItem(PWA_DISMISS_KEY);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) {
      return;
    }

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      setDeferredPrompt(event);

      // Show prompt after 2nd game completion
      // Check localStorage for game completion count
      if (readGamesCompletedCount() >= 2) {
        setShowPrompt(true);
      }
    };

    // Named, not inline — an inline arrow can't be removed on cleanup, so it
    // accumulated one window listener per mount.
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      // Track PWA installation in GA4
      gameEvents.pwaInstalled();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Handle install button click
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for user response
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome !== 'accepted') {
      // User dismissed - no action needed
    }

    // Clear the prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  // Handle dismiss
  const handleDismiss = () => {
    setShowPrompt(false);
    setIosHint(false);
    // Don't show again for 7 days
    localStorage.setItem(PWA_DISMISS_KEY, String(Date.now() + PWA_DISMISS_MS));
  };

  const wanted = (showPrompt && Boolean(deferredPrompt)) || iosHint;
  // Re-read on the render that would paint: this component mounts once at the layout
  // level, so a client-side navigation INTO /teacher/upgrade never re-runs the effect.
  const onConversionSurface =
    typeof document !== 'undefined' && document.body.classList.contains('conversion-surface');
  // One install pitch at a time: the Android pill also targets desktop Chrome.
  const pillOnScreen = typeof document !== 'undefined' && document.querySelector('[data-install-pill]') !== null;
  const canPaint =
    wanted && !isOnCrazyGamesPlatform && !isInGame && !overlayQuietZone && !onConversionSurface && !pillOnScreen &&
    isPostGameMoment(pathname);

  // The session marker is written the moment it shows; `latched` keeps this mount
  // visible after the write, and blocks a second show on any later mount.
  useEffect(() => {
    if (canPaint && !latched && !wasPromoShownThisSession()) {
      markPromoShown();
      setLatched(true);
    }
  }, [canPaint, latched]);

  if (!canPaint || !latched) return null;

  return (
    <AnimatePresence>
      <m.div
        initial={{ y: '-140%' }}
        animate={{ y: 0 }}
        exit={{ y: '-140%' }}
        transition={MOTION.settle}
        className="fixed inset-x-3 top-[calc(env(safe-area-inset-top,0px)+0.5rem)] z-[100] md:start-auto md:end-4 md:w-[26rem]"
      >
        <div className="bg-neo-pink border-3 border-neo-black rounded-neo shadow-hard p-2.5 ps-3 text-neo-white">
          <div className="flex items-center gap-3">
            <Download size={22} className="shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-black text-sm leading-tight">
                {iosHint ? t('pwa.iosInstallTitle') : t('pwa.installTitle')}
              </p>
              <p className="hidden sm:block text-xs leading-snug opacity-90">
                {iosHint ? t('pwa.iosInstallDescription') : t('pwa.installDescription')}
              </p>
            </div>
            {!iosHint && (
              <Button press="chunky" variant="success" size="sm" onClick={handleInstallClick} className="shrink-0 uppercase">
                {t('pwa.installButton')}
              </Button>
            )}
            <button
              type="button"
              onClick={handleDismiss}
              className="shrink-0 grid place-items-center size-11 -me-1 rounded-neo hover:bg-neo-black/10"
              aria-label={iosHint ? t('pwa.iosGotIt') : t('common.later')}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          {iosHint && (
            // iOS has no install trigger, so coach the manual Share, then Add flow.
            <ol className="mt-2 flex flex-wrap gap-x-4 gap-y-1 ps-9 text-xs font-medium">
              <li className="inline-flex items-center gap-1">
                <span className="font-black">1.</span>
                {t('pwa.iosStepShare')}
                <Share size={14} aria-hidden="true" />
              </li>
              <li className="inline-flex items-center gap-1">
                <span className="font-black">2.</span>
                {t('pwa.iosStepAdd')}
                <Plus size={14} aria-hidden="true" />
              </li>
            </ol>
          )}
        </div>
      </m.div>
    </AnimatePresence>
  );
}

export default PWAInstallPrompt;
