'use client';

import { useLanguage } from '@/contexts/LanguageContext';

interface DailyHubHeaderProps {
  todayIso: string | '';
}

export function DailyHubHeader({ todayIso }: DailyHubHeaderProps) {
  const { t } = useLanguage();

  if (!todayIso) return null;

  return (
    <div className="w-full text-center mb-2">
      <h1 className="text-3xl font-neo-display font-black text-neo-white">
        {t('daily.todaysPuzzles', "Today's Puzzles")}
      </h1>
      <p className="text-sm text-neo-cream/80 mt-1">{todayIso}</p>
    </div>
  );
}
