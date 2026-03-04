/**
 * WordHuntLifeBar
 * Displays a life bar for Word Hunt mode with green/yellow/red color transition
 */

'use client';

import { useLanguage } from '@/contexts/LanguageContext';

interface WordHuntLifeBarProps {
  life: number;
  maxLife: number;
}

export function WordHuntLifeBar({ life, maxLife }: WordHuntLifeBarProps) {
  const { t } = useLanguage();
  const percentage = Math.min(100, Math.max(0, (life / maxLife) * 100));

  let colorClass: string;
  if (percentage > 60) {
    colorClass = 'bg-green-500';
  } else if (percentage > 30) {
    colorClass = 'bg-yellow-500';
  } else {
    colorClass = 'bg-red-500';
  }

  return (
    <div
      data-testid="word-hunt-life-bar"
      className="w-full h-4 rounded-neo border-neo border-black bg-gray-800 overflow-hidden"
      role="progressbar"
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={t('wordHunt.lifeBar')}
    >
      <div
        data-testid="word-hunt-life-bar-fill"
        className={`h-full transition-all duration-300 ${colorClass}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
