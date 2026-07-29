'use client';

/**
 * PushNotificationPrompt
 * Engagement-triggered prompt to enable push notifications.
 * Shows after user has played MIN_GAMES_BEFORE_PROMPT games,
 * and hides for PROMPT_DISMISS_DAYS days if "Not Now" is clicked.
 */

import { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { shouldShowPushPrompt, dismissPushPrompt } from '@/utils/pushNotifications';
import { registerPushToken } from '@/utils/pushNotifications/tokenRegistration';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useConsentDecided } from '@/hooks/useConsentDecided';
import { trackGrowthEvent } from '@/utils/growthTracking';

export function PushNotificationPrompt() {
  const { t } = useLanguage();
  // Hold the prompt until cookie consent is resolved so it doesn't stack under the
  // consent banner (z-110) while pending. Same modal-coordination rule as signup/email.
  const consentDecided = useConsentDecided();
  const [visible, setVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, visible, () => {
    dismissPushPrompt();
    trackGrowthEvent('push_prompt_dismissed', { trigger: 'focus_trap_escape' });
    setVisible(false);
  });

  // Funnel parity: emit `push_prompt_shown` exactly once per mount when the
  // prompt becomes visible. Pairs with `push_prompt_dismissed` /
  // `push_prompt_granted` so the show → grant funnel is computable. Without
  // this, MIN_GAMES_BEFORE_PROMPT=3 tuning is blind.
  useEffect(() => {
    if (!consentDecided) return;
    const should = shouldShowPushPrompt();
    setVisible(should);
    if (should) {
      trackGrowthEvent('push_prompt_shown', {});
    }
  }, [consentDecided]);

  if (!visible) {
    return null;
  }

  async function handleEnable() {
    try {
      // registerPushToken handles Capacitor perms on native and no-ops on web.
      // Do NOT gate on window.Notification.requestPermission — native WebView
      // exposes that API but it does not trigger the native push-perm dialog.
      await registerPushToken();
      trackGrowthEvent('push_prompt_granted', {});
    } catch {
      // Permission request failed — close prompt silently
      trackGrowthEvent('push_prompt_failed', {});
    }
    setVisible(false);
  }

  function handleDismiss() {
    dismissPushPrompt();
    trackGrowthEvent('push_prompt_dismissed', { trigger: 'not_now_button' });
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
                  {t('notifications.prompt.title')}
                </h3>
                <p className="text-sm text-gray-300 mb-4">
                  {t('notifications.prompt.body')}
                </p>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleEnable}
                    className="flex-1 px-4 py-2 bg-neo-lime text-neo-black font-bold text-sm rounded-neo border-neo border-neo-black shadow-hard-sm hover:shadow-hard-pressed active:translate-y-0.5 transition-all"
                  >
                    {t('notifications.prompt.enable')}
                  </button>
                  <button
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
