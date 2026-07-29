'use client';

import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { gameEvents } from '@/components/GoogleAnalytics';
import { isAndroidBrowser } from '@/utils/androidApp';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWA Install Prompt Component
 *
 * Shows a banner encouraging users to install the app when:
 * 1. The browser supports PWA installation
 * 2. The app is not already installed
 * 3. User has completed at least 2 games (engaged users more likely to install)
 * 4. User hasn't dismissed the prompt in the last 7 days
 */
export function PWAInstallPrompt() {
  const { t } = useLanguage();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // On Android the native app promo (AndroidAppInstallPromo) owns the install
    // pitch — yield so the user never gets two install prompts. Desktop Chrome,
    // where there is no native app, still gets the PWA banner.
    if (isAndroidBrowser(navigator.userAgent)) return;

    // Check if user has dismissed prompt recently
    const dismissedUntil = localStorage.getItem('pwa_install_dismissed_until');
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
      const gamesCompleted = parseInt(localStorage.getItem('games_completed_count') || '0');

      if (gamesCompleted >= 2) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Also listen for app installed event
    window.addEventListener('appinstalled', () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      // Track PWA installation in GA4
      gameEvents.pwaInstalled();
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
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

    // Don't show again for 7 days
    const dismissedUntil = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem('pwa_install_dismissed_until', dismissedUntil.toString());
  };

  if (isOnCrazyGamesPlatform) return null;
  if (!showPrompt || !deferredPrompt) return null;

  return (
    <AnimatePresence>
      <m.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-[100]"
      >
        <div className="bg-neo-pink border-3 border-neo-black rounded-neo shadow-hard-lg p-4">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 hover:bg-neo-black hover:bg-opacity-10 rounded transition-colors"
            aria-label="Dismiss"
          >
            <X size={20} className="text-neo-white" />
          </button>

          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 bg-neo-white rounded-neo border-2 border-neo-black">
              <Download size={24} className="text-neo-pink" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-neo-white text-lg mb-1">
                {t('pwa.installTitle')}
              </h3>
              <p className="text-neo-white text-sm opacity-90">
                {t('pwa.installDescription')}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 px-4 py-2.5 bg-neo-lime text-neo-black font-bold border-3 border-neo-black rounded-neo shadow-hard-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard transition-all duration-100 uppercase text-sm"
            >
              {t('pwa.installButton')}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2.5 bg-neo-white text-neo-black font-bold border-3 border-neo-black rounded-neo shadow-hard-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard transition-all duration-100 uppercase text-sm"
            >
              {t('common.later')}
            </button>
          </div>
        </div>
      </m.div>
    </AnimatePresence>
  );
}

/**
 * Helper hook to track game completions for PWA prompt trigger
 */
export function useTrackGameCompletion() {
  useEffect(() => {
    const incrementGameCount = () => {
      const currentCount = parseInt(localStorage.getItem('games_completed_count') || '0');
      localStorage.setItem('games_completed_count', (currentCount + 1).toString());
    };

    // Listen for game completion event
    window.addEventListener('game_completed', incrementGameCount);

    return () => {
      window.removeEventListener('game_completed', incrementGameCount);
    };
  }, []);
}

export default PWAInstallPrompt;
