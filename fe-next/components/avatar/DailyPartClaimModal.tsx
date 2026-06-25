'use client';

import { Play, X, Sparkles } from 'lucide-react';
import { useRewardedFeatureUnlock } from '@/hooks/useRewardedFeatureUnlock';

interface DailyPartClaimModalProps {
  isOpen: boolean;
  onClaim: () => void | Promise<void>;
  onClose: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

export function DailyPartClaimModal({
  isOpen, onClaim, onClose, t,
}: DailyPartClaimModalProps) {
  const { offer, canShowAd } = useRewardedFeatureUnlock({
    placement: 'avatar_daily_free_part',
    onUnlock: onClaim,
    disabled: !isOpen,
  });

  if (!isOpen) return null;

  return (
    <>
      <div
        data-testid="avatar-daily-claim-modal"
        className="fixed inset-0 z-[90] flex items-center justify-center bg-neo-navy/80 p-4 animate-in fade-in-0 duration-300"
      >
        <div
          className="relative w-full max-w-sm rounded-neo border-neo-thick border-black bg-neo-navy-light p-6 shadow-hard-lg animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full border-neo border-black bg-neo-purple p-3 shadow-hard">
              <Sparkles className="h-8 w-8 text-neo-navy" strokeWidth={3} />
            </div>

            <h2 className="font-neo-display text-2xl font-black text-neo-white">
              {t('avatar.dailyPart.title')}
            </h2>

            <p className="font-neo-body text-sm text-neo-white">
              {t('avatar.dailyPart.description')}
            </p>

            <div className="flex w-full flex-col gap-3 pt-2">
              {canShowAd && (
                <button
                  data-testid="avatar-daily-claim-cta"
                  onClick={offer}
                  className="flex items-center justify-center gap-2 rounded-neo border-neo-thick border-black bg-neo-purple px-6 py-3 font-neo-display text-lg font-black text-neo-white shadow-hard transition-transform active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-pressed"
                >
                  <Play className="h-5 w-5" strokeWidth={3} />
                  {t('avatar.dailyPart.claim')}
                </button>
              )}
              <button
                data-testid="avatar-daily-claim-close"
                onClick={onClose}
                className="flex items-center justify-center gap-2 rounded-neo border-neo border-black bg-neo-navy px-4 py-2 font-neo-body text-sm text-neo-white hover:text-neo-white"
              >
                <X className="h-4 w-4" />
                {t('avatar.dailyPart.close')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default DailyPartClaimModal;
