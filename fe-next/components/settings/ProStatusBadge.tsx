'use client';

import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useConsumerPro } from '@/hooks/useConsumerPro';

interface ProStatusBadgeProps {
  isDarkMode: boolean;
}

/**
 * Pro Status Badge — shows a PRO badge when the user has Consumer Pro,
 * or a purchase CTA (via RemoveAdsProbe) when they don't.
 * Only shows for authenticated users.
 */
export function ProStatusBadge({ isDarkMode }: ProStatusBadgeProps) {
  const { t } = useLanguage();
  const { hasConsumerPro, isLoading } = useConsumerPro();

  if (isLoading) return null;

  if (!hasConsumerPro) return null;

  return (
    <div className={cn(
      'flex items-center justify-between p-4 rounded-neo border-3 border-neo-lime mt-2',
      isDarkMode ? 'bg-neo-navy-light' : 'bg-white shadow-hard'
    )}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center border-2 border-neo-black bg-neo-lime">
          <Crown className="w-5 h-5 text-neo-black" />
        </div>
        <div>
          <p className={cn('font-bold flex items-center gap-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
            {t('settings.pro.active')}
            <span className="text-xs bg-neo-lime text-neo-black px-2 py-0.5 rounded-neo font-black">
              {t('settings.pro.badge')}
            </span>
          </p>
          <p className={cn('text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
            {t('settings.pro.includes')}
          </p>
          <ul className={cn('text-xs mt-1 space-y-0.5', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
            <li>{t('settings.pro.benefits.adFree')}</li>
            <li>{t('settings.pro.benefits.avatarSlots')}</li>
            <li>{t('settings.pro.benefits.boardThemes')}</li>
            <li>{t('settings.pro.benefits.extendedHistory')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}