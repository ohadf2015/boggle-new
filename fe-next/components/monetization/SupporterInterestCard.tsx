'use client';
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';

// Evaluated once at module load — platform never changes at runtime
const isNative = Capacitor.isNativePlatform();

export function SupporterInterestCard() {
  const { t } = useLanguage();
  const [tapped, setTapped] = useState(false);

  useEffect(() => {
    if (isNative) return;
    trackGrowthEvent('iap_viewed', { surface: 'supporter_card' });
  }, []);

  // Web-only: native users have real ads, no need for this nudge
  if (isNative) return null;

  function handleTap() {
    trackGrowthEvent('iap_tapped', { surface: 'supporter_card' });
    setTapped(true);
  }

  return (
    <div className="rounded-neo border-neo border-neo-purple/60 bg-neo-navy-light px-6 py-5 shadow-hard">
      {tapped ? (
        <p className="text-center font-neo-display font-bold text-neo-lime">
          {t('supporter.card.thanks')}
        </p>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-neo-display text-lg font-black text-neo-purple">
              {t('supporter.card.title')}
            </h3>
            <p className="mt-1 text-sm text-neo-white/80">{t('supporter.card.body')}</p>
          </div>
          <button
            onClick={handleTap}
            className="shrink-0 rounded-neo border-neo border-neo-purple bg-neo-purple/20 px-5 py-2.5 font-bold text-neo-white shadow-hard-sm transition-all hover:bg-neo-purple/30 hover:shadow-hard"
          >
            {t('supporter.card.cta')}
          </button>
        </div>
      )}
    </div>
  );
}
