'use client';

import { useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useHoliday } from '@/hooks/useHoliday';
import { daysUntilTrack, formatHolidayDay, windowFor } from '@/lib/holidays/calendar';
import { holidayDailyDay } from '@/lib/holidays/dailyBoard';
import { cn } from '@/lib/utils';
import HolidayCandles from './HolidayCandles';
import HolidayGifts from './HolidayGifts';
import HolidayTableJoinPrompt from './HolidayTableJoinPrompt';
import styles from './holidayDaily.module.css';

interface Props {
  puzzleDate: string;
  language: string;
}

function firstGiftDate(puzzleDate: string, language: string): string | null {
  const win = windowFor('christmas', puzzleDate, language);
  if (!win || daysUntilTrack(win, puzzleDate) === null) return null;
  return formatHolidayDay(win.trackDays[0], language);
}

function AdventTeaser({ date }: { date: string }) {
  const { t } = useLanguage();
  return (
    <section
      data-testid="holiday-daily-teaser"
      data-holiday="christmas"
      className={cn('mx-auto w-full max-w-sm rounded-2xl border-[3px] border-black bg-neo-navy-light p-3 text-start text-neo-white shadow-hard', styles.pop)}
    >
      <h2 className="font-neo-display text-base font-bold">{t('holiday.daily.adventTitle', 'Advent Board')}</h2>
      <HolidayGifts total={12} opened={0} className="mt-2" />
      <p className="mt-2 text-xs font-bold leading-snug text-neo-white/80">
        {t('holiday.daily.adventSoon', 'The Advent Board opens on {date}. From then until Christmas, one holiday word is wrapped on the board every day.', { date })}
      </p>
      <HolidayTableJoinPrompt holiday="christmas" />
    </section>
  );
}

export default function HolidayDailyIntro({ puzzleDate, language }: Props) {
  const { t } = useLanguage();
  const { playStreakMilestoneSound } = useSoundEffects();
  const { holiday } = useHoliday();
  const day = holiday ? holidayDailyDay(holiday, puzzleDate, language) : null;
  const chimed = useRef(false);

  useEffect(() => {
    if (!day || chimed.current) return;
    chimed.current = true;
    const id = window.setTimeout(() => playStreakMilestoneSound(), 650);
    return () => window.clearTimeout(id);
  }, [day, playStreakMilestoneSound]);

  if (holiday === 'christmas' && !day) {
    const date = firstGiftDate(puzzleDate, language);
    return date ? <AdventTeaser date={date} /> : null;
  }
  if (!holiday || !day) return null;
  const hanukkah = holiday === 'hanukkah';

  return (
    <section
      data-testid="holiday-daily-intro"
      data-holiday={holiday}
      className={cn(
        'mx-auto w-full max-w-sm rounded-2xl border-[3px] border-black bg-neo-navy-light p-3 text-start text-neo-white shadow-hard',
        styles.pop,
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-neo-display text-base font-bold">
          {hanukkah ? t('holiday.daily.nightlyTitle', 'Nightly Board') : t('holiday.daily.adventTitle', 'Advent Board')}
        </h2>
        <span className={cn('rounded-full border-2 border-black px-2 font-neo-display text-xs font-bold text-neo-white', hanukkah ? 'bg-neo-holiday-blue' : 'bg-neo-holiday-red')}>
          {hanukkah ? t('holiday.daily.nightN', 'Night {n}', { n: day }) : t('holiday.daily.giftN', 'Gift {n}', { n: day })}
        </span>
      </div>
      {hanukkah ? (
        <HolidayCandles total={8} lit={day} newest={day - 1} className="mt-2" />
      ) : (
        <HolidayGifts total={12} opened={day - 1} today={day - 1} className="mt-2" />
      )}
      <p className="mt-2 text-xs font-bold leading-snug text-neo-white/80">
        {hanukkah
          ? t('holiday.daily.nightlyIntro', '{n} gold gelt tiles shine on tonight’s board. Trace words through them for coins, then spin the dreidel.', { n: day })
          : t('holiday.daily.adventIntro', 'One holiday word is wrapped on today’s board. Find it to unwrap today’s gift.')}
      </p>
      <HolidayTableJoinPrompt holiday={holiday} />
    </section>
  );
}
