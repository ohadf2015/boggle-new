'use client';

import { Clapperboard, Loader2, X, Heart } from 'lucide-react';
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
  const { offer, canShowAd, status } = useRewardedFeatureUnlock({
    placement: 'blast_wave_continue',
    surface: 'retry',
    onUnlock: onContinue,
    disabled: !isOpen,
    context: { bonusMoves },
  });

  if (!isOpen) return null;

  const adActive = status === 'loading' || status === 'showing';

  return (
    <>
      <div
        data-testid="blast-continue-modal"
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
              {t('blast.continueModal.title')}
            </h2>

            <p className="font-neo-body text-sm text-neo-white">
              {t('blast.continueModal.body')}
            </p>

            <div className="flex w-full flex-col gap-3 pt-2">
              {canShowAd && (
                <button type="button"
                  data-testid="blast-continue-cta"
                  onClick={offer}
                  disabled={adActive}
                  aria-busy={adActive}
                  className="relative flex items-center justify-center gap-2 rounded-neo border-neo-thick border-black bg-neo-lime px-6 py-3 font-neo-display text-lg font-black text-neo-navy shadow-hard transition-transform active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-pressed disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {adActive
                    ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={3} />
                    : <Clapperboard className="h-5 w-5" strokeWidth={3} />
                  }
                  {t('blast.continueModal.cta', { moves: bonusMoves })}
                  {!adActive && (
                    <span
                      aria-hidden
                      className="absolute -top-2.5 -right-2.5 rounded-full border-2 border-black bg-neo-yellow px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-neo-navy shadow-hard"
                    >
                      {t('blast.adBadge')}
                    </span>
                  )}
                </button>
              )}
              <button type="button"
                data-testid="blast-continue-decline"
                onClick={onDecline}
                className="flex items-center justify-center gap-2 rounded-neo border-neo border-black bg-neo-navy px-4 py-2 font-neo-body text-sm text-neo-white hover:text-neo-white"
              >
                <X className="h-4 w-4" />
                {t('blast.continueModal.decline')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default BlastContinueModal;
