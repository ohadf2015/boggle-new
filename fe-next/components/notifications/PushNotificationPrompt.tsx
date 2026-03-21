'use client';

/**
 * PushNotificationPrompt
 * Engagement-triggered prompt to enable push notifications.
 * Shows after user has played MIN_GAMES_BEFORE_PROMPT games,
 * and hides for PROMPT_DISMISS_DAYS days if "Not Now" is clicked.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { shouldShowPushPrompt, dismissPushPrompt } from '@/utils/pushNotifications';
import { registerPushToken } from '@/utils/pushNotifications/tokenRegistration';

export function PushNotificationPrompt() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(shouldShowPushPrompt());
  }, []);

  if (!visible) {
    return null;
  }

  async function handleEnable() {
    try {
      if (typeof window.Notification !== 'undefined' && Notification.requestPermission) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // Attempt FCM token registration (native only, no-op on web)
          await registerPushToken();
        }
      }
    } catch {
      // Permission request failed — close prompt silently
    }
    setVisible(false);
  }

  function handleDismiss() {
    dismissPushPrompt();
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-20 inset-x-4 z-50 mx-auto max-w-md"
          role="dialog"
          aria-label={t('notifications.prompt.title')}
          data-testid="push-notification-prompt"
        >
          <div className="relative bg-neo-navy border-neo border-neo-yellow rounded-neo p-5 shadow-hard-lg">
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-2 end-2 p-1 text-gray-400 hover:text-white transition-colors"
              aria-label={t('notifications.prompt.notNow')}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon + Content */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-neo bg-neo-yellow/20 flex items-center justify-center">
                <Bell className="w-6 h-6 text-neo-yellow" />
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
                    className="flex-1 px-4 py-2 bg-neo-yellow text-neo-black font-bold text-sm rounded-neo border-neo border-neo-black shadow-hard-sm hover:shadow-hard-pressed active:translate-y-0.5 transition-all"
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PushNotificationPrompt;
