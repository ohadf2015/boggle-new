'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export interface AdventureThemeBannerProps {
  themeDisplayKey: string;
  gameModeDisplayKey: string;
  themedBonusMultiplier: number;
  themedWordCount: number;
  themedWordsFound: number;
  worldColorPrimary: string; // e.g., 'neo-lime'
}

const AdventureThemeBanner = memo(function AdventureThemeBanner({
  themeDisplayKey,
  gameModeDisplayKey,
  themedBonusMultiplier,
  themedWordCount,
  themedWordsFound,
  worldColorPrimary,
}: AdventureThemeBannerProps) {
  const { t } = useLanguage();

  const bonusPercent = Math.round((themedBonusMultiplier - 1) * 100);
  const colorClass = `text-${worldColorPrimary}`;

  return (
    <div
      data-testid="adventure-theme-banner"
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-neo border-neo shadow-hard-sm',
        'bg-neo-navy border-black',
        'text-xs min-h-0'
      )}
    >
      {/* World theme */}
      <span className={cn('font-black text-sm leading-none truncate', colorClass)}>
        {t(themeDisplayKey)}
      </span>

      {/* Game mode badge */}
      <span className="px-1.5 py-0.5 rounded border border-white/20 bg-white/10 text-neo-white font-bold uppercase tracking-wide shrink-0">
        {t(gameModeDisplayKey)}
      </span>

      <span className="text-neo-white shrink-0">·</span>

      {/* Themed bonus */}
      <span className="text-neo-lime font-bold shrink-0">
        🌿 +{bonusPercent}% {t('adventure.theme.bonus')}
      </span>

      <span className="text-neo-white shrink-0">·</span>

      {/* Found counter */}
      <span className="text-neo-white shrink-0">
        {themedWordsFound}/{themedWordCount} {t('adventure.theme.found')}
      </span>
    </div>
  );
});

export default AdventureThemeBanner;
