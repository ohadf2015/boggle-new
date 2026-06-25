'use client';

import { Play, RotateCcw, Trophy } from 'lucide-react';
import { useRewardedFeatureUnlock } from '@/hooks/useRewardedFeatureUnlock';

interface BlastRetryWaveModalProps {
  isOpen: boolean;
  waveNumber: number;
  /** Percent of board cleared on the failed attempt — used for the "you got X%" hook. */
  clearPct: number;
  /** Watch-ad callback — restart this wave with cumulative state rewound to pre-wave. */
  onRetry: () => void;
  /** Decline callback — fall through to the existing results summary (Play Again restarts at wave 1). */
  onDecline: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

/**
 * BlastRetryWaveModal — shown after a wave loss when an ad provider is available.
 * One-shot per run (caller enforces). Decline lets the standard results summary
 * render. Accept restarts the failed wave only — wave 1 progress is preserved.
 */
export function BlastRetryWaveModal({
  isOpen, waveNumber, clearPct, onRetry, onDecline, t,
}: BlastRetryWaveModalProps) {
  const { offer, canShowAd } = useRewardedFeatureUnlock({
    placement: 'blast_wave_retry',
    surface: 'retry',
    onUnlock: onRetry,
    disabled: !isOpen,
    context: { waveNumber, clearPct },
  });

  if (!isOpen) return null;

  return (
    <>
      <div
        data-testid="blast-retry-wave-modal"
        className="fixed inset-0 z-[90] flex items-center justify-center bg-neo-navy/80 p-4 animate-in fade-in-0 duration-300"
      >
        <div
          className="relative w-full max-w-sm rounded-neo border-neo-thick border-black bg-neo-navy-light p-6 shadow-hard-lg animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full border-neo border-black bg-neo-cyan p-3 shadow-hard">
              <Trophy className="h-8 w-8 text-neo-navy" strokeWidth={3} />
            </div>

            <h2 className="font-neo-display text-2xl font-black text-neo-white">
              {t('blast.retryWaveModal.title', { wave: waveNumber })}
            </h2>

            <p className="font-neo-body text-sm text-neo-white">
              {t('blast.retryWaveModal.body', { wave: waveNumber, percent: Math.round(clearPct) })}
            </p>

            <div className="flex w-full flex-col gap-3 pt-2">
              {canShowAd && (
                <button
                  data-testid="blast-retry-wave-cta"
                  onClick={offer}
                  className="flex items-center justify-center gap-2 rounded-neo border-neo-thick border-black bg-neo-lime px-6 py-3 font-neo-display text-lg font-black text-neo-navy shadow-hard transition-transform active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-pressed"
                >
                  <Play className="h-5 w-5" strokeWidth={3} />
                  {t('blast.retryWaveModal.cta', { wave: waveNumber })}
                </button>
              )}
              <button
                data-testid="blast-retry-wave-decline"
                onClick={onDecline}
                className="flex items-center justify-center gap-2 rounded-neo border-neo border-black bg-neo-navy px-4 py-2 font-neo-body text-sm text-neo-white hover:text-neo-white"
              >
                <RotateCcw className="h-4 w-4" />
                {t('blast.retryWaveModal.decline')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default BlastRetryWaveModal;
