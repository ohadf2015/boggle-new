'use client';
import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';

interface RemoveAdsProbeProps {
  isDarkMode: boolean;
}

export function RemoveAdsProbe({ isDarkMode }: RemoveAdsProbeProps) {
  const { t } = useLanguage();
  const [tapped, setTapped] = useState(false);

  useEffect(() => {
    trackGrowthEvent('iap_viewed', { surface: 'settings' });
  }, []);

  function handleTap() {
    if (tapped) return;
    setTapped(true);
    trackGrowthEvent('iap_tapped', { surface: 'settings', intent: 'remove_ads' });
  }

  return (
    <div className={cn(
      'flex items-center justify-between p-4 rounded-neo border-3 border-neo-purple mt-2',
      isDarkMode ? 'bg-neo-navy-light' : 'bg-white shadow-hard'
    )}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center border-2 border-neo-black bg-neo-purple">
          <Sparkles className="w-5 h-5 text-neo-white" />
        </div>
        <div>
          <p className={cn('font-bold', isDarkMode ? 'text-white' : 'text-neo-black')}>
            {t('settings.removeAds.title')}
          </p>
          <p className={cn('text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
            {t('settings.removeAds.body')}
          </p>
        </div>
      </div>
      {tapped ? (
        <span className="text-xs font-bold text-neo-purple shrink-0">
          {t('settings.removeAds.comingSoon')}
        </span>
      ) : (
        <button
          type="button"
          onClick={handleTap}
          aria-label={t('settings.removeAds.button')}
          className={cn(
            'shrink-0 rounded-neo border-2 border-neo-purple px-3 py-1.5 text-xs font-bold',
            'text-neo-purple transition-all hover:bg-neo-purple/10 active:scale-95'
          )}
        >
          {t('settings.removeAds.button')}
        </button>
      )}
    </div>
  );
}
