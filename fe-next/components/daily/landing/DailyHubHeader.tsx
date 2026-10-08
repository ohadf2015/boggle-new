'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { PersistentStreakDisplay } from '../streak/PersistentStreakDisplay';

export function DailyHubHeader() {
  const { t } = useLanguage();

  return (
    <div className="w-full flex items-center justify-between gap-3" data-testid="daily-hub-header">
      <h1 className="text-3xl font-neo-display font-black text-neo-white">
        {t('daily.todaysPuzzles', "Today's Puzzles")}
      </h1>
      <PersistentStreakDisplay />
    </div>
  );
}
