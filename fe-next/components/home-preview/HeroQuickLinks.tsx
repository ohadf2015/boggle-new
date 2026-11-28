'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Check, Users } from 'lucide-react';
import { PressSurface } from '@/components/motion/PressSurface';
import { StreakFlame } from '@/components/streak/StreakFlame';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import { getSecondsUntilNextDaily } from '@/utils/dailyChallenge/dateUtils';
import { formatTimeHHMMSS } from '@/shared/utils/timeFormatting';
import styles from './homeMotion.module.css';

interface HeroQuickLinksProps {
  lang: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  animate: boolean;
  streak: number;
  streakLoading: boolean;
  /** Streak alive but today not played: the daily card warns. */
  atRisk?: boolean;
  playedToday?: boolean;
}

const CARD =
  'flex h-[60px] min-w-0 items-center gap-2 rounded-2xl border-[3px] border-black ps-2 pe-3 text-black [@media(max-height:700px)]:h-[54px] lg:h-[68px]';
const ICON = 'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-black';
const LABEL = 'truncate font-neo-display text-base font-bold leading-tight lg:text-xl';

function NextDailyIn({ t }: Pick<HeroQuickLinksProps, 't'>) {
  const [left, setLeft] = useState(getSecondsUntilNextDaily);
  useEffect(() => {
    const id = setInterval(() => setLeft(getSecondsUntilNextDaily()), 1000);
    return () => clearInterval(id);
  }, []);
  const time = formatTimeHHMMSS(left);
  return (
    <span className="truncate text-xs font-bold tabular-nums">
      <span aria-hidden="true">
        {t('homePlay.dailyDone')} · <span data-testid="hp-daily-next">{time}</span>
      </span>
      <span className="sr-only">
        {t('homePlay.dailyDone')}. {t('homePlay.dailyNextIn', { time })}
      </span>
    </span>
  );
}

/** Tier 3 of the hero: multiplayer and today's daily, two equal colour-coded cards under PLAY. */
export function HeroQuickLinks({ lang, t, animate, streak, streakLoading, atRisk = false, playedToday = false }: HeroQuickLinksProps) {
  const dailyRef = useRef<HTMLAnchorElement>(null);
  const pulsed = useRef(false);
  const known = !streakLoading && streak > 0;
  const done = !streakLoading && playedToday;
  const dailyAria = !done && known && atRisk ? `${t('homePlay.chipDaily')}: ${t('dailyStreak.flame.atRisk', { n: streak })}` : undefined;

  // Daily status resolves after first paint; pulse once when it is known to be unplayed.
  useEffect(() => {
    if (!animate || streakLoading || pulsed.current) return;
    pulsed.current = true;
    if (playedToday) return;
    dailyRef.current?.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: 520, delay: 700, easing: 'cubic-bezier(0.22,1,0.36,1)' });
  }, [animate, streakLoading, playedToday]);

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:gap-3" data-testid="hp-secondary">
      <PressSurface asChild lip={4}>
        <Link
          href={`/${lang}/multiplayer?autoCreate=true`}
          data-testid="hp-play-friends"
          data-motion={animate ? 'live' : undefined}
          onClick={() => trackLandingCtaClick('home_play_friends')}
          className={`${CARD} relative bg-neo-pink`}
        >
          {animate ? (
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
              <span data-testid="hp-mp-stripes" className={styles.stripes} />
              <span className={styles.shine} style={{ animationDelay: '3.1s' }} />
            </span>
          ) : null}
          <span className={`${ICON} bg-black text-neo-pink`}>
            {animate ? <span data-testid="hp-mp-ping" aria-hidden="true" className={`${styles.ping} rounded-xl`} /> : null}
            <Users className={`h-5 w-5 ${animate ? styles.hop : ''}`} strokeWidth={2.75} aria-hidden="true" />
          </span>
          <span className={`relative ${LABEL}`}>{t('homePlay.chipMultiplayer')}</span>
        </Link>
      </PressSurface>

      <PressSurface asChild lip={4}>
        <Link
          ref={dailyRef}
          href={`/${lang}/daily`}
          data-testid="hp-chip-daily"
          aria-label={dailyAria}
          onClick={() => trackLandingCtaClick('home_daily_chip')}
          className={`${CARD} bg-neo-orange`}
        >
          <span className={`${ICON} bg-neo-yellow ${animate && known && atRisk && !done ? styles.tug : ''}`}>
            <StreakFlame days={known ? streak : 0} size={26} mood={known && atRisk ? 'worried' : 'happy'} animated={known} />
            {done && (
              <span className="absolute -end-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-black bg-neo-lime">
                <Check className="h-3 w-3" strokeWidth={4} aria-hidden="true" />
              </span>
            )}
          </span>
          <span className="flex min-w-0 flex-col leading-none">
            <span className={LABEL}>{t('homePlay.chipDaily')}</span>
            {done && <NextDailyIn t={t} />}
          </span>
        </Link>
      </PressSurface>
    </div>
  );
}
