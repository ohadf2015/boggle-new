'use client';

import { useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useHoliday } from '@/hooks/useHoliday';
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
        <span className="rounded-full border-2 border-black bg-neo-holiday-gold px-2 font-neo-display text-xs font-bold text-neo-navy">
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
