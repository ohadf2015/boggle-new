'use client';

import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  wordCount: number;
  onContinueSolo: () => void;
  onReturnToLobby: () => void;
  boardSeed: string;
}

export function MPGameAbortedModal({ wordCount, onContinueSolo, onReturnToLobby }: Props){
  const { t } = useLanguage();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('mp.abort.title')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-neo-navy/90 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-6 px-8 py-10 max-w-sm w-full text-center border-2 border-neo-white/20 rounded-neo bg-neo-navy">
        <div className="flex flex-col gap-2">
          <p className="font-neo-display text-xl font-bold text-neo-white">
            {t('mp.abort.title')}
          </p>
          <p className="font-neo-body text-neo-white text-sm">
            {t('mp.abort.body')} {wordCount}
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full">
          <button type="button"
            onClick={onContinueSolo}
            aria-label={t('mp.abort.continueSolo')}
            className="w-full px-5 py-3 font-neo-body text-sm font-bold text-neo-navy bg-neo-cyan border-2 border-neo-cyan rounded-neo hover:bg-neo-cyan/80 transition-colors"
          >
            {t('mp.abort.continueSolo')}
          </button>
          <button type="button"
            onClick={onReturnToLobby}
            aria-label={t('mp.abort.returnToLobby')}
            className="w-full px-5 py-3 font-neo-body text-sm text-neo-white border border-neo-white/20 rounded-neo hover:border-neo-white/40 transition-colors"
          >
            {t('mp.abort.returnToLobby')}
          </button>
        </div>
      </div>
    </div>
  );
}
