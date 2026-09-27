'use client';

import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { WifiOff, X } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useNetworkState } from '@/hooks/useNetworkState';
import { useOfflineModeFlag } from '@/hooks/useOfflineModeFlag';

const SESSION_DISMISS_KEY = 'lexiclash_offline_banner_dismissed';

function initialDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(SESSION_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function OfflineBanner() {
  const { t } = useLanguageSafe();
  const { online } = useNetworkState();
  const offlineFlag = useOfflineModeFlag();
  const [dismissed, setDismissed] = useState<boolean>(initialDismissed);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(SESSION_DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  };

  const shouldShow = offlineFlag && !online && !dismissed;

  return (
    <AnimatePresence>
      {shouldShow && (
        <m.div
          role="status"
          aria-live="polite"
          initial={{ y: -32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -32, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="relative z-50 w-full shrink-0 flex items-center gap-3 bg-neo-yellow text-neo-navy border-b-neo border-neo-navy px-4 py-2 shadow-hard"
        >
          <WifiOff className="size-5 shrink-0" aria-hidden />
          <div className="flex-1 min-w-0">
            <div className="font-neo-display text-sm font-bold">{t('offline.banner.title')}</div>
            <div className="text-xs opacity-80 truncate">{t('offline.banner.subtitle')}</div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label={t('offline.banner.dismiss')}
            className="shrink-0 rounded-neo border-neo border-neo-navy bg-neo-cream/40 hover:bg-neo-cream/60 active:translate-y-px px-2 py-1"
          >
            <X className="size-4" aria-hidden />
          </button>
        </m.div>
      )}
    </AnimatePresence>
  );
}
