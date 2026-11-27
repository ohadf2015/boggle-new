'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useHoliday } from '@/hooks/useHoliday';
import { holidayDailyDay } from '@/lib/holidays/dailyBoard';
import { getEmptyHolidaySubmitState, getHolidaySubmitState, subscribeHolidaySettlement } from '@/lib/holidays/dailyClient';
import { cn } from '@/lib/utils';
import HolidayCandles from './HolidayCandles';
import HolidayCommunityCounter from './HolidayCommunityCounter';
import HolidayCracker from './HolidayCracker';
import HolidayDreidel from './HolidayDreidel';
import HolidayGifts from './HolidayGifts';
import HolidayMascotPop from './HolidayMascotPop';
import HolidayRescueCard from './HolidayRescueCard';
import HolidayShareButton from './HolidayShareButton';
import HolidayTableJoinPrompt from './HolidayTableJoinPrompt';
import HolidayTablePanel from './HolidayTablePanel';
import { holidayApi } from './holidayApi';
import styles from './holidayDaily.module.css';
import { takeHolidayInvite } from './holidayShare';

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

function isRendered(el: HTMLElement | null): boolean {
  for (let n = el; n; n = n.parentElement) if (getComputedStyle(n).display === 'none') return false;
  return !!el;
}

export default function HolidayDailyResults(props: { puzzleDate: string; language: string }) {
  const { holiday } = useHoliday();
  const probe = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!holiday) return;
    const check = () => setShown(isRendered(probe.current));
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [holiday]);

  if (!holiday) return null;
  return (
    <div ref={probe} className="contents">
      {shown && <HolidayDailyResultsBody {...props} />}
    </div>
  );
}

function HolidayDailyResultsBody({ puzzleDate, language }: { puzzleDate: string; language: string }) {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const { holiday } = useHoliday();
  const sfx = useSoundEffects();
  const { submitted, settlement } = useSyncExternalStore(subscribeHolidaySettlement, getHolidaySubmitState, getEmptyHolidaySubmitState);
  const [relit, setRelit] = useState<number | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const cheered = useRef(false);
  const day = holiday ? holidayDailyDay(holiday, puzzleDate, language) : null;
  const mine = settlement && settlement.holiday === holiday && settlement.puzzleDate === puzzleDate ? settlement : null;

  useEffect(() => {
    if (!user || !holiday || !submitted) return;
    const invite = takeHolidayInvite();
    if (!invite) return;
    holidayApi
      .rescue(invite.ref, invite.holiday)
      .then((r) => r.status === 'relit' && r.day && setRelit(r.day))
      .catch(() => {});
  }, [user, holiday, submitted]);

  useEffect(() => {
    if (!mine || mine.alreadySettled || cheered.current) return;
    cheered.current = true;
    if (mine.kind === 'nightly' || mine.giftFound) sfx.playStreakMilestoneSound();
  }, [mine, sfx]);

  if (!holiday || !day || loading) return null;
  const hanukkah = holiday === 'hanukkah';

  return (
    <section
      data-testid="holiday-daily-results"
      data-holiday={holiday}
      className={cn('relative space-y-3 overflow-hidden rounded-2xl border-[3px] border-black bg-neo-navy-light p-3 text-neo-white shadow-hard', styles.pop)}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-neo-display text-base font-bold">
            {hanukkah ? t('holiday.daily.nightlyTitle', 'Nightly Board') : t('holiday.daily.adventTitle', 'Advent Board')}
          </h2>
          <p className="text-xs font-bold text-neo-white/80">
            {!user
              ? t('holiday.daily.guestLine', 'Sign in to light tonight’s candle and keep your holiday streak.')
              : !mine
                ? hanukkah
                  ? t('holiday.daily.nightN', 'Night {n}', { n: day })
                  : t('holiday.daily.giftN', 'Gift {n}', { n: day })
                : hanukkah
                  ? t('holiday.daily.litByBoard', 'Night {n} lit by the Nightly Board. {words} gelt words, +{coins} coins.', {
                      n: mine.day,
                      words: mine.geltWords,
                      coins: mine.coins,
                    })
                  : mine.giftFound
                    ? t('holiday.daily.giftUnwrapped', 'Gift {n} unwrapped! +{coins} coins.', { n: mine.day, coins: mine.coins })
                    : t('holiday.daily.giftMissed', 'Gift {n} stayed wrapped today. Your day still counts.', { n: mine.day })}
          </p>
        </div>
        {mine && <HolidayMascotPop holiday={holiday} cue={1} />}
      </div>

      {hanukkah ? (
        <HolidayCandles total={8} lit={day} newest={mine ? day - 1 : null} glow={mine ? new Set([day - 1]) : undefined} />
      ) : (
        <HolidayGifts total={12} opened={mine?.giftFound ? day : day - 1} />
      )}

      {relit && (
        <p role="status" className="rounded-xl border-2 border-black bg-neo-holiday-gold px-3 py-2 font-neo-display text-sm font-bold text-neo-navy">
          {hanukkah
            ? t('holiday.rescue.relitHanukkah', 'You relit night {n} for your friend!', { n: relit })
            : t('holiday.rescue.relitChristmas', 'You filled your friend’s stocking for day {n}!', { n: relit })}
        </p>
      )}

      {user &&
        (hanukkah ? (
          <HolidayDreidel puzzleDate={puzzleDate} initial={mine?.spinFace ? { face: mine.spinFace, coins: mine.spinCoins ?? 0 } : null} />
        ) : (
          <HolidayCracker puzzleDate={puzzleDate} initial={mine?.crackerJoke ? { joke: mine.crackerJoke, coins: mine.crackerCoins ?? 0 } : null} />
        ))}

      <HolidayShareButton holiday={holiday} day={day} />

      {user ? (
        <>
          <HolidayTableJoinPrompt holiday={holiday} />
          <HolidayTablePanel holiday={holiday} />
          <HolidayRescueCard holiday={holiday} />
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="w-full rounded-xl border-[3px] border-black bg-neo-cream px-3 py-2 font-neo-display text-sm font-bold text-neo-navy shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed"
          >
            {t('holiday.event.signInCta', 'Sign in to collect your rewards')}
          </button>
          <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode="signup" />
        </>
      )}
      <HolidayCommunityCounter holiday={holiday} />
    </section>
  );
}
