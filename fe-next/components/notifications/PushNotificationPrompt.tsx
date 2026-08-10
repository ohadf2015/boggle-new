'use client';

/**
 * PushNotificationPrompt
 * Engagement-triggered prompt to enable push notifications.
 * Shows after user has played MIN_GAMES_BEFORE_PROMPT games,
 * and hides for PROMPT_DISMISS_DAYS days if "Not Now" is clicked.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  shouldShowPushPrompt,
  shouldShowFirstWinPushPrompt,
  clearFirstWinPromptPending,
  dismissPushPrompt,
} from '@/utils/pushNotifications';
import { registerPushToken } from '@/utils/pushNotifications/tokenRegistration';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useConsentDecided } from '@/hooks/useConsentDecided';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { FIRST_WIN_EVENT } from '@/lib/retention/firstWin';

type PromptTrigger = 'games_threshold' | 'first_win';

export function PushNotificationPrompt() {
  const { t } = useLanguage();
  // Hold the prompt until cookie consent is resolved so it doesn't stack under the
  // consent banner (z-110) while pending. Same modal-coordination rule as signup/email.
  const consentDecided = useConsentDecided();
  const [visible, setVisible] = useState(false);
  // Which gate opened the prompt — first_win uses celebratory copy and feeds
  // the show → grant funnel with a `trigger` prop.
  const [trigger, setTrigger] = useState<PromptTrigger>('games_threshold');
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, visible, () => {
    dismissPushPrompt();
    trackGrowthEvent('push_prompt_dismissed', { trigger: 'focus_trap_escape' });
    setVisible(false);
  });

  // Evaluate both gates. First-win wins over the games threshold — it's the
  // higher-intent moment and has its own copy. Showing consumes the pending
  // flag so the prompt doesn't reappear on every later mount.
  const evaluate = useCallback((): boolean => {
    if (shouldShowFirstWinPushPrompt()) {
      clearFirstWinPromptPending();
      setTrigger('first_win');
      setVisible(true);
      trackGrowthEvent('push_prompt_shown', { trigger: 'first_win' });
      return true;
    }
    if (shouldShowPushPrompt()) {
      setTrigger('games_threshold');
      setVisible(true);
      trackGrowthEvent('push_prompt_shown', { trigger: 'games_threshold' });
      return true;
    }
    return false;
  }, []);

  // Funnel parity: emit `push_prompt_shown` exactly once per mount when the
  // prompt becomes visible. Pairs with `push_prompt_dismissed` /
  // `push_prompt_granted` so the show → grant funnel is computable.
  useEffect(() => {
    if (!consentDecided) return;
    evaluate();
  }, [consentDecided, evaluate]);

  // Re-engagement lever: a first win mid-session arms the prompt immediately
  // (the player is on the results screen riding the win) instead of waiting
  // for a remount + the games threshold.
  const visibleRef = useRef(false);
  useEffect(() => { visibleRef.current = visible; }, [visible]);
  useEffect(() => {
    if (!consentDecided) return;
    const onFirstWin = () => {
      if (!visibleRef.current) evaluate();
    };
    window.addEventListener(FIRST_WIN_EVENT, onFirstWin);
    return () => window.removeEventListener(FIRST_WIN_EVENT, onFirstWin);
  }, [consentDecided, evaluate]);

  if (!visible) {
    return null;
  }

  async function handleEnable() {
    try {
      // registerPushToken handles Capacitor perms on native and no-ops on web.
      // Do NOT gate on window.Notification.requestPermission — native WebView
      // exposes that API but it does not trigger the native push-perm dialog.
      await registerPushToken();
      trackGrowthEvent('push_prompt_granted', { trigger });
    } catch {
      // Permission request failed — close prompt silently
      trackGrowthEvent('push_prompt_failed', { trigger });
    }
    setVisible(false);
  }

  function handleDismiss() {
    dismissPushPrompt();
    trackGrowthEvent('push_prompt_dismissed', { trigger: 'not_now_button', promptTrigger: trigger });
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          ref={dialogRef}
          className="fixed bottom-[calc(5rem+var(--admob-banner-height,0px))] inset-x-4 z-50 mx-auto max-w-md"
          role="dialog"
          aria-label={t('notifications.prompt.title')}
          data-testid="push-notification-prompt"
        >
          <div className="relative bg-neo-navy border-neo border-neo-lime rounded-neo p-5 shadow-hard-lg">
            {/* Close button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute top-2 inset-e-2 p-1 text-gray-400 hover:text-white transition-colors"
              aria-label={t('notifications.prompt.notNow')}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon + Content */}
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded-neo bg-neo-lime/20 flex items-center justify-center">
                <Bell className="w-6 h-6 text-neo-lime" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-neo-display text-lg font-bold text-neo-white mb-1">
                  {trigger === 'first_win'
                    ? t('notifications.prompt.firstWinTitle')
                    : t('notifications.prompt.title')}
                </h3>
                <p className="text-sm text-gray-300 mb-4">
                  {trigger === 'first_win'
                    ? t('notifications.prompt.firstWinBody')
                    : t('notifications.prompt.body')}
                </p>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleEnable}
                    className="flex-1 px-4 py-2 bg-neo-lime text-neo-black font-bold text-sm rounded-neo border-neo border-neo-black shadow-hard-sm hover:shadow-hard-pressed active:translate-y-0.5 transition-all"
                  >
                    {t('notifications.prompt.enable')}
                  </button>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="px-4 py-2 text-gray-400 hover:text-white text-sm font-medium transition-colors"
                  >
                    {t('notifications.prompt.notNow')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

export default PushNotificationPrompt;
