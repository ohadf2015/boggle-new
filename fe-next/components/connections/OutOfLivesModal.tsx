'use client';

import { useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Heart, Play, Loader2, LogOut } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRewardedFeatureUnlock } from '@/hooks/useRewardedFeatureUnlock';
import { getCurrentLives, msUntilNextLife } from '@/lib/connections/livesStore';

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

  // Time-based refill. On the web `canShowAd` is always false (the rewarded
  // provider is gated off pending AdSense approval), so before this the modal's
  // only live control was "quit to menu" — a permanent dead end that is the most
  // likely cause of Connections' 7.7% completion vs classic's 35%. Poll instead
  // of trusting one render: the wait outlives any single paint, and the value
  // lives in localStorage where nothing notifies us.
  const [msLeft, setMsLeft] = useState<number | null>(null);
  const [lifeReady, setLifeReady] = useState(false);
  useEffect(() => {
    if (!open || isAdmin) return;
    const tick = () => {
      setLifeReady(getCurrentLives(language) > 0);
      setMsLeft(msUntilNextLife(language));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [open, isAdmin, language]);

  const waitLabel = (() => {
    if (msLeft === null) return null;
    const totalSec = Math.max(0, Math.ceil(msLeft / 1000));
    const mm = Math.floor(totalSec / 60);
    const ss = totalSec % 60;
    return mm > 0 ? `${mm}m ${ss}s` : `${ss}s`;
  })();

  return (
    <AnimatePresence>
      {open && (
        // CSS entrances (animate-in) instead of framer-motion for the backdrop
        // and card: a starved main thread — e.g. while the large Hebrew bundle
        // parses — would leave a framer-motion `initial` opacity:0 pinned, so the
        // user sees only the dark backdrop ("black screen"). CSS runs off the
        // main thread and always settles visible.
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neo-navy/85 backdrop-blur-sm px-6 animate-in fade-in-0 duration-300"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div
            className="relative w-full max-w-sm rounded-neo border-neo-thick border-neo-red bg-neo-navy-light shadow-hard-lg p-6 text-center animate-in fade-in-0 zoom-in-95 duration-300"
          >
            <div
              className="mx-auto mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-neo-red/15 border-neo-thick border-neo-red animate-in zoom-in-50 duration-300"
            >
              <Heart className="w-8 h-8 text-neo-red" aria-hidden="true" />
            </div>

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
              ) : lifeReady ? (
                // A life has regenerated — let them straight back in. This is the
                // branch that makes the modal recoverable without an ad provider.
                <m.button
                  type="button"
                  onClick={onRevive}
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-neo border-neo-thick border-neo-lime bg-neo-lime text-neo-navy font-neo-display font-bold px-5 py-3 shadow-hard"
                >
                  <Heart className="w-4 h-4" aria-hidden="true" />
                  {t('connections.continueWithRegenLife', 'Continue')}
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
                <DirectionalIcon icon={LogOut} mirror className="w-4 h-4" />
                {t('connections.quitToMenu')}
              </button>

              {/* Was a flat "no ad available. Try again later." — true but a dead
                  end, because nothing told the player that waiting actually works.
                  The countdown is the recovery instruction. */}
              {!isAdmin && !lifeReady && waitLabel && (
                <p className="text-neo-white text-xs">
                  {t('connections.nextLifeIn', 'Next life in {{time}}', { time: waitLabel })}
                </p>
              )}
              {!isAdmin && !lifeReady && !waitLabel && !canShowAd && (
                <p className="text-neo-white text-xs">{t('connections.noAdAvailable')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
