'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, Users } from 'lucide-react';
import { StreakFlame } from '@/components/streak/StreakFlame';
import { PressSurface } from '@/components/motion/PressSurface';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import { getSecondsUntilNextDaily } from '@/utils/dailyChallenge/dateUtils';
import { formatTimeHHMMSS } from '@/shared/utils/timeFormatting';
import { useTodayLabel } from './useTodayLabel';

interface HeroQuickLinksProps {
  lang: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  streak: number;
  streakLoading: boolean;
  atRisk?: boolean;
  playedToday?: boolean;
}

const CHIP =
  'flex h-[60px] min-w-0 items-center gap-2 rounded-2xl border-[3px] border-black ps-2 pe-2.5 text-black [@media(max-height:700px)]:h-[54px] lg:h-[80px] lg:gap-3 lg:rounded-3xl lg:ps-3 lg:pe-4';
const ICON_TILE =
  'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-black lg:h-14 lg:w-14 lg:rounded-2xl';
const TITLE = 'line-clamp-2 font-neo-display text-[15px] font-bold leading-tight lg:text-2xl';

function useNextDailyIn(): string {
  const [left, setLeft] = useState(getSecondsUntilNextDaily);
  useEffect(() => {
    const id = setInterval(() => setLeft(getSecondsUntilNextDaily()), 1000);
    return () => clearInterval(id);
  }, []);
  return formatTimeHHMMSS(left);
}

function DoneLine({ t }: Pick<HeroQuickLinksProps, 't'>) {
  const time = useNextDailyIn();
  return (
    <span data-sub className="mt-0.5 flex items-center gap-1 truncate text-xs font-bold tabular-nums opacity-90 lg:text-base">
      {t('homePlay.dailyDone')}
      <span aria-hidden="true">
        · <span data-testid="hp-daily-next">{time}</span>
      </span>
      <span className="sr-only">{t('homePlay.dailyNextIn', { time })}</span>
    </span>
  );
}

/** The hero's secondary row: friends and today's daily, side by side and below PLAY. */
export function HeroQuickLinks({ lang, t, streak, streakLoading, atRisk = false, playedToday = false }: HeroQuickLinksProps) {
  const date = useTodayLabel(lang, { weekday: 'short', day: 'numeric', month: 'short' });
  const known = !streakLoading && streak > 0;
  const done = !streakLoading && playedToday;
  const dailySub = known ? t('homePlay.chipStreak', { n: streak }) : date;
  const dailyAria = done
    ? undefined
    : known && atRisk
      ? `${t('homePlay.chipDaily')}: ${t('dailyStreak.flame.atRisk', { n: streak })}`
      : undefined;

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:gap-4" data-testid="hp-secondary">
      <PressSurface asChild lip={4}>
        <Link
          href={`/${lang}/multiplayer?autoCreate=true`}
          data-testid="hp-play-friends"
          onClick={() => trackLandingCtaClick('home_play_friends')}
          className={`${CHIP} bg-neo-pink`}
        >
          <span className={`${ICON_TILE} bg-black text-neo-pink`}>
            <Users className="h-5 w-5 lg:h-7 lg:w-7" strokeWidth={2.75} aria-hidden="true" />
          </span>
          <span className={TITLE}>{t('homePlay.friendsPlay')}</span>
        </Link>
      </PressSurface>

      <PressSurface asChild lip={4}>
        <Link
          // One tap into today's puzzle, not the hub in between.
          href={`/${lang}/daily`}
          data-testid="hp-chip-daily"
          aria-label={dailyAria}
          onClick={() => trackLandingCtaClick('home_daily_chip')}
          className={`${CHIP} bg-neo-orange`}
        >
          <span className={`${ICON_TILE} bg-neo-yellow`}>
            <StreakFlame days={known ? streak : 0} size={26} mood={known && atRisk ? 'worried' : 'happy'} animated={known} />
            {done && (
              <span className="absolute -end-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-black bg-neo-lime">
                <Check className="h-3 w-3" strokeWidth={4} aria-hidden="true" />
              </span>
            )}
          </span>
          <span className="flex min-w-0 flex-col items-start leading-none">
            <span className={TITLE}>{t('homePlay.chipDaily')}</span>
            {done ? (
              <DoneLine t={t} />
            ) : (
              <span data-sub className="mt-0.5 truncate text-xs font-bold opacity-90 lg:text-base">{dailySub}</span>
            )}
          </span>
        </Link>
      </PressSurface>
    </div>
  );
}
