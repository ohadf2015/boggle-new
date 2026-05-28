'use client';

import { Play, X, Heart } from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useRewardedFeatureUnlock } from '@/hooks/useRewardedFeatureUnlock';

interface BlastContinueModalProps {
  isOpen: boolean;
  bonusMoves: number;
  onContinue: () => void;
  onDecline: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

export function BlastContinueModal({
  isOpen, bonusMoves, onContinue, onDecline, t,
}: BlastContinueModalProps) {
  const { offer, canShowAd } = useRewardedFeatureUnlock({
    placement: 'blast_wave_continue',
    surface: 'retry',
    onUnlock: onContinue,
    disabled: !isOpen,
    context: { bonusMoves },
  });

  if (!isOpen) return null;

  return (
    <AdaptiveAnimatePresence>
      <AdaptiveMotion.div
        data-testid="blast-continue-modal"
        className="fixed inset-0 z-[90] flex items-center justify-center bg-neo-navy/80 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <AdaptiveMotion.div
          className="relative w-full max-w-sm rounded-neo border-neo-thick border-black bg-neo-navy-light p-6 shadow-hard-lg"
          initial={{ scale: 0.85, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.85, y: 20 }}
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full border-neo border-black bg-neo-pink p-3 shadow-hard">
              <Heart className="h-8 w-8 text-neo-navy" strokeWidth={3} />
            </div>

            <h2 className="font-neo-display text-2xl font-black text-neo-white">
              {t('blast.continueModal.title')}
            </h2>

            <p className="font-neo-body text-sm text-neo-white">
              {t('blast.continueModal.body')}
            </p>

            <div className="flex w-full flex-col gap-3 pt-2">
              {canShowAd && (
                <button
                  data-testid="blast-continue-cta"
                  onClick={offer}
                  className="flex items-center justify-center gap-2 rounded-neo border-neo-thick border-black bg-neo-lime px-6 py-3 font-neo-display text-lg font-black text-neo-navy shadow-hard transition-transform active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-pressed"
                >
                  <Play className="h-5 w-5" strokeWidth={3} />
                  {t('blast.continueModal.cta', { moves: bonusMoves })}
                </button>
              )}
              <button
                data-testid="blast-continue-decline"
                onClick={onDecline}
                className="flex items-center justify-center gap-2 rounded-neo border-neo border-black bg-neo-navy px-4 py-2 font-neo-body text-sm text-neo-white hover:text-neo-white"
              >
                <X className="h-4 w-4" />
                {t('blast.continueModal.decline')}
              </button>
            </div>
          </div>
        </AdaptiveMotion.div>
      </AdaptiveMotion.div>
    </AdaptiveAnimatePresence>
  );
}

export default BlastContinueModal;
