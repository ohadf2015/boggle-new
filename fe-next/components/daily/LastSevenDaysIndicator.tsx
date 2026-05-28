'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { DailyCompletionDay } from '@/utils/dailyChallenge/storage';

interface Props {
  days: DailyCompletionDay[];
}

export default function LastSevenDaysIndicator({ days }: Props) {
  const { t } = useLanguage();
  const completed = days.filter((d) => d.wordHunt || d.wordWheel).length;

  return (
    <div className="flex flex-col gap-2 p-3 border-2 border-neo-black rounded-neo bg-neo-navy-light shadow-hard">
      <div className="flex items-center justify-between">
        <span className="font-neo-display text-sm text-neo-white uppercase">
          {t('daily.lastSevenDays')}
        </span>
        <span className="font-neo-display text-sm text-neo-lime">
          {completed} / 7
        </span>
      </div>
      <div className="flex gap-1.5 justify-between">
        {days.map((day, i) => {
          const done = day.wordHunt || day.wordWheel;
          return (
            <div
              key={day.date}
              data-testid={`last-seven-day-${i}`}
              title={day.date}
              className={`flex-1 aspect-square rounded-sm border-2 border-neo-black ${
                done ? 'bg-neo-lime' : 'bg-neo-navy-light'
              }`}
            />
          );
        })}
      </div>
      <span className="text-xs text-neo-white">
        {t('daily.dedicationProgress')}
      </span>
    </div>
  );
}
