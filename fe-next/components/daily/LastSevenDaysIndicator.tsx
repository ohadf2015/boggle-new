'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { neoInfoToast } from '@/components/NeoToast';
import type { DailyCompletionDay } from '@/utils/dailyChallenge/storage';
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils';
import { resolveMissedDayAction, type MissedDayAction } from '@/utils/dailyChallenge/missedDayAction';
import { CATCH_UP_WINDOW_DAYS } from '@/utils/dailyChallenge/catchUp';

interface Props {
  days: DailyCompletionDay[];
  /** ISO YYYY-MM-DD (UTC). Defaults to the current daily date. */
  today?: string;
}

const TILE_BASE =
  'flex-1 aspect-square rounded-sm border-2 border-neo-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan';

function tileClass(action: MissedDayAction): string {
  switch (action.kind) {
    case 'done':
      return `${TILE_BASE} bg-neo-lime`;
    case 'play':
      // Missed but still catchable: ring it so it reads as a live target.
      return `${TILE_BASE} bg-neo-navy-light ring-2 ring-neo-cyan ring-offset-1 ring-offset-neo-navy-light animate-pulse motion-reduce:animate-none`;
    case 'today':
      return `${TILE_BASE} bg-neo-navy-light border-dashed border-neo-white/70`;
    default:
      return `${TILE_BASE} bg-neo-navy-light opacity-60`;
  }
}

export default function LastSevenDaysIndicator({ days, today }: Props) {
  const { t, language } = useLanguage();
  const completed = days.filter((d) => d.wordHunt || d.wordWheel).length;
  const resolvedToday = today ?? getDailyChallengeDate();
  const actions = days.map((day) => resolveMissedDayAction(day, { today: resolvedToday, language }));
  const hasCatchUp = actions.some((a) => a.kind === 'play');

  const labelFor = (day: DailyCompletionDay, action: MissedDayAction): string => {
    const key =
      action.kind === 'done' ? 'daily.catchUp.tileDone'
      : action.kind === 'play' ? 'daily.catchUp.tileMissed'
      : action.kind === 'today' ? 'daily.catchUp.tileToday'
      : action.kind === 'expired' ? 'daily.catchUp.tileExpired'
      : 'daily.catchUp.tilePending';
    return `${day.date} · ${t(key)}`;
  };

  const explainExpired = () => {
    neoInfoToast(t('daily.catchUp.expired').replace('{days}', String(CATCH_UP_WINDOW_DAYS)), {
      icon: '📅',
      duration: 3000,
    });
  };

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
      <div className="flex gap-1.5 justify-between" role="list">
        {days.map((day, i) => {
          const action = actions[i];
          const common = {
            'data-testid': `last-seven-day-${i}`,
            'data-day-state': action.kind,
            title: labelFor(day, action),
            'aria-label': labelFor(day, action),
            className: tileClass(action),
          } as const;
          if (action.kind === 'done' || action.kind === 'play' || action.kind === 'today') {
            return (
              <Link key={day.date} href={action.href} prefetch={false} role="listitem" {...common} />
            );
          }
          return (
            <button
              key={day.date}
              type="button"
              role="listitem"
              onClick={action.kind === 'expired' ? explainExpired : undefined}
              disabled={action.kind === 'pending'}
              {...common}
            />
          );
        })}
      </div>
      <span className="text-xs text-neo-white">
        {hasCatchUp
          ? t('daily.catchUp.tileHint').replace('{days}', String(CATCH_UP_WINDOW_DAYS))
          : t('daily.dedicationProgress')}
      </span>
    </div>
  );
}
