'use client';

import { Play, X, Heart, Coins } from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useRewardedFeatureUnlock } from '@/hooks/useRewardedFeatureUnlock';

interface SurvivalExtraLifeModalProps {
  isOpen: boolean;
  restoreAmount: number;
  onRestore: () => void;
  onDecline: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  coinCost?: number;
  canAffordCoinRestore?: boolean;
  onCoinRestore?: () => void;
}

export function SurvivalExtraLifeModal({
  isOpen, restoreAmount, onRestore, onDecline, t,
  coinCost, canAffordCoinRestore, onCoinRestore,
}: SurvivalExtraLifeModalProps) {
  const { offer, canShowAd } = useRewardedFeatureUnlock({
    placement: 'daily_survival_extra_life',
    surface: 'retry',
    onUnlock: onRestore,
    disabled: !isOpen,
    context: { restoreAmount },
  });

  if (!isOpen) return null;

  return (
    <>
      <div
        data-testid="survival-extralife-modal"
        className="fixed inset-0 z-[90] flex items-center justify-center bg-neo-navy/80 p-4 animate-in fade-in-0 duration-300"
      >
        <div
          className="relative w-full max-w-sm rounded-neo border-neo-thick border-black bg-neo-navy-light p-6 shadow-hard-lg animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full border-neo border-black bg-neo-pink p-3 shadow-hard">
              <Heart className="h-8 w-8 text-neo-navy" strokeWidth={3} />
            </div>

            <h2 className="font-neo-display text-2xl font-black text-neo-white">
              {t('wordHunt.survival.extraLifeModal.title')}
            </h2>

            <p className="font-neo-body text-sm text-neo-white">
              {t('wordHunt.survival.extraLifeModal.body')}
            </p>

            <div className="flex w-full flex-col gap-3 pt-2">
              {canShowAd && (
                <button
                  data-testid="survival-extralife-cta"
                  onClick={offer}
                  className="flex items-center justify-center gap-2 rounded-neo border-neo-thick border-black bg-neo-lime px-6 py-3 font-neo-display text-lg font-black text-neo-navy shadow-hard transition-transform active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-pressed"
                >
                  <Play className="h-5 w-5" strokeWidth={3} />
                  {t('wordHunt.survival.extraLifeModal.cta', { amount: restoreAmount })}
                </button>
              )}
              {!canShowAd && canAffordCoinRestore && onCoinRestore && coinCost != null && (
                <button
                  data-testid="survival-extralife-coin-cta"
                  onClick={onCoinRestore}
                  className="flex items-center justify-center gap-2 rounded-neo border-neo-thick border-black bg-neo-yellow px-6 py-3 font-neo-display text-lg font-black text-neo-navy shadow-hard transition-transform active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-pressed"
                >
                  <Coins className="h-5 w-5" strokeWidth={3} />
                  {t('wordHunt.survival.extraLifeModal.coinCta', { cost: coinCost })}
                </button>
              )}
              <button
                data-testid="survival-extralife-decline"
                onClick={onDecline}
                className="flex items-center justify-center gap-2 rounded-neo border-neo border-black bg-neo-navy px-4 py-2 font-neo-body text-sm text-neo-white hover:text-neo-white"
              >
                <X className="h-4 w-4" />
                {t('wordHunt.survival.extraLifeModal.decline')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default SurvivalExtraLifeModal;
