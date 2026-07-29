'use client';

import { m, AnimatePresence } from 'framer-motion';
import { Heart, Play, Loader2, LogOut } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRewardedFeatureUnlock } from '@/hooks/useRewardedFeatureUnlock';

interface OutOfLivesModalProps {
  open: boolean;
  isAdmin: boolean;
  level: number;
  onRevive: () => void;
  onQuit: () => void;
}

export default function OutOfLivesModal({ open, isAdmin, level, onRevive, onQuit }: OutOfLivesModalProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';

  const { offer, status, canShowAd } = useRewardedFeatureUnlock({
    placement: 'connections_revive',
    surface: 'retry',
    onUnlock: onRevive,
    disabled: !open || isAdmin,
    context: { level },
  });

  const isLoading = status === 'loading' || status === 'showing';

  return (
    <AnimatePresence>
      {open && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-neo-navy/85 backdrop-blur-sm px-6"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <m.div
            initial={{ scale: 0.85, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="relative w-full max-w-sm rounded-neo border-neo-thick border-neo-red bg-neo-navy-light shadow-hard-lg p-6 text-center"
          >
            <m.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 14 }}
              className="mx-auto mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-neo-red/15 border-neo-thick border-neo-red"
            >
              <Heart className="w-8 h-8 text-neo-red" aria-hidden="true" />
            </m.div>

            <h2 className="font-neo-display text-2xl text-neo-white font-bold mb-2">
              {t('connections.outOfLives')}
            </h2>
            <p className="text-neo-white text-sm mb-6">
              {t('connections.reviveDescription')}
            </p>

            <div className="flex flex-col gap-3">
              {isAdmin ? (
                <m.button
                  type="button"
                  onClick={onRevive}
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-neo border-neo-thick border-neo-lime bg-neo-lime text-neo-navy font-neo-display font-bold px-5 py-3 shadow-hard"
                >
                  <Heart className="w-4 h-4" aria-hidden="true" />
                  {t('connections.adminRefill')}
                </m.button>
              ) : (
                <m.button
                  type="button"
                  onClick={offer}
                  disabled={isLoading || !canShowAd}
                  whileHover={!isLoading && canShowAd ? { scale: 1.03, y: -1 } : undefined}
                  whileTap={!isLoading && canShowAd ? { scale: 0.97 } : undefined}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-neo border-neo-thick border-neo-purple bg-neo-purple text-neo-white font-neo-display font-bold px-5 py-3 shadow-hard disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Play className="w-4 h-4" aria-hidden="true" />
                  )}
                  {t('connections.reviveAd')}
                </m.button>
              )}

              <button
                type="button"
                onClick={onQuit}
                className="w-full inline-flex items-center justify-center gap-2 rounded-neo border-neo border-neo-white/30 bg-transparent text-neo-white font-neo-body text-sm px-5 py-2.5 hover:bg-neo-white/5 transition-colors"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                {t('connections.quitToMenu')}
              </button>

              {!isAdmin && !canShowAd && (
                <p className="text-neo-white text-xs">{t('connections.noAdAvailable')}</p>
              )}
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
