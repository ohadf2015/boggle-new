'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  onRetry: () => void;
}

const DailyOfflineFallback: React.FC<Props> = ({ onRetry }) => {
  const { t } = useLanguage();

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="text-6xl select-none" aria-hidden="true">
        📡
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-neo-display text-2xl font-bold text-neo-white">
          {t('offline.daily.title')}
        </h2>
        <p className="font-neo-body text-neo-white text-base max-w-xs">
          {t('offline.daily.body')}
        </p>
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="
          px-6 py-3 font-neo-display font-bold text-lg
          bg-neo-cyan text-neo-navy
          border-neo border-black shadow-hard
          rounded-neo
          active:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px]
          transition-transform
        "
      >
        {t('offline.daily.reconnect')}
      </button>
    </div>
  );
};

export default DailyOfflineFallback;
