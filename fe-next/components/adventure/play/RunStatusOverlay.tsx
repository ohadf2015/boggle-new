'use client';

/**
 * Loading, saving, and error state overlays for a run.
 * Extracted from AdventureLevel to keep it under 500 lines.
 */
import { Loader2 } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';

interface Props {
  phase: 'loading' | 'saving' | 'error' | string;
  onExit: () => void;
  onRetry: () => void;
}

export default function RunStatusOverlay({ phase, onExit, onRetry }: Props) {
  const { t } = useLanguageSafe();

  if (phase === 'loading') {
    return (
      <div className="absolute inset-0 z-20 grid place-items-center bg-black/40" role="status">
        <div className="inline-flex flex-col items-center gap-3 rounded-xl border-[3px] border-black bg-[#1a1a2e] px-4 py-3 font-bold">
          <div className="inline-flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> {t('adventurePlay.loading')}
          </div>
          <button
            type="button"
            data-testid="run-loading-exit"
            onClick={() => {
              trackGrowthEvent('adventure_exit', { from: 'loading' });
              onExit();
            }}
            className="rounded-lg border-[3px] border-black bg-neo-cream text-black px-3 py-1 text-xs font-bold shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none"
          >
            {t('adventurePlay.backToMap')}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'saving') {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex justify-center" role="status" aria-live="polite">
        <div className="inline-flex items-center gap-1.5 rounded-lg border-[2px] border-black bg-[#1a1a2e] px-3 py-1 text-sm font-bold shadow-[2px_2px_0_#000]">
          <Loader2 className="w-4 h-4 animate-spin" /> {t('adventurePlay.saving')}
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="absolute inset-0 z-20 grid place-items-center bg-black/60 p-4">
        <div className="max-w-xs rounded-2xl border-[3px] border-black bg-[#1a1a2e] p-5 text-center">
          <p className="font-bold">{t('adventurePlay.loadError')}</p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => {
                trackGrowthEvent('adventure_exit', { from: 'error' });
                onExit();
              }}
              className="flex-1 rounded-xl border-[3px] border-black bg-neo-cream text-black font-bold py-2"
            >
              {t('adventurePlay.backToMap')}
            </button>
            <button
              type="button"
              onClick={onRetry}
              className="flex-1 rounded-xl border-[3px] border-black bg-neo-cyan text-black font-bold py-2"
            >
              {t('adventurePlay.tryAgain')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
