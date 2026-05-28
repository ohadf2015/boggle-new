'use client';

import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  attempt: number;
  maxAttempts: number;
  onGiveUp: () => void;
}

const GIVE_UP_THRESHOLD = 3;

export function ReconnectingOverlay({ attempt, maxAttempts, onGiveUp }: Props){
  const { t } = useLanguage();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('mp.reconnect.title')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-neo-navy/90 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-6 px-8 py-10 max-w-sm w-full text-center">
        <div
          className="w-12 h-12 rounded-full border-4 border-neo-cyan border-t-transparent animate-spin"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-2">
          <p className="font-neo-display text-xl font-bold text-neo-white">
            {t('mp.reconnect.title')}
          </p>
          <p className="font-neo-body text-neo-white text-sm">
            {t('mp.reconnect.attempt')} {attempt}/{maxAttempts}
          </p>
        </div>
        {attempt >= GIVE_UP_THRESHOLD && (
          <button
            onClick={onGiveUp}
            aria-label={t('mp.reconnect.giveUp')}
            className="px-5 py-2 font-neo-body text-sm text-neo-white border border-neo-white/20 rounded-neo hover:border-neo-white/40 transition-colors"
          >
            {t('mp.reconnect.giveUp')}
          </button>
        )}
      </div>
    </div>
  );
}
