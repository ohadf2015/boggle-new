'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHoliday } from '@/hooks/useHoliday';
import { holidayWindows, localDateIn, trackIndex, windowFor, type HolidayKey, type HolidayWindow } from '@/lib/holidays/calendar';
import { HOLIDAY_PROGRESS_EVENT, consumeLastLit, type LitResult } from '@/lib/holidayEvent/markHolidayPlayed';
import { buildProgressView, type HolidayDayView, type HolidayProgressView } from '@/lib/holidayEvent/progressView';
import type { HolidayDayReward } from '@/lib/holidayEvent/rewards';
import { cn } from '@/lib/utils';
import HolidayCommunityCounter from '@/components/daily/holiday/HolidayCommunityCounter';
import HolidayRescueCard from '@/components/daily/holiday/HolidayRescueCard';
import HolidayTablePanel from '@/components/daily/holiday/HolidayTablePanel';
import ArcadeTile from '@/components/holidays/arcade/ArcadeTile';
import HolidaySeasonLink from '@/components/holidays/landing/HolidaySeasonLink';

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });
const HolidayCardExtras = dynamic(() => import('./gift/HolidayCardExtras'), { ssr: false });

const THEME: Record<HolidayKey, { prop: string; accent: string }> = {
  hanukkah: { prop: '/holidays/props-candle.webp', accent: 'bg-neo-holiday-blue' },
  christmas: { prop: '/holidays/props-gift-red.webp', accent: 'bg-neo-holiday-red' },
};

type T = (key: string, params?: Record<string, string | number>) => string;

function rewardLabel(t: T, r: HolidayDayReward): string {
  const parts: string[] = [];
  if (r.partKey) parts.push(t(`holiday.part.${r.partKey.slice(r.partKey.indexOf(':') + 1)}`));
  if (r.coins) parts.push(t('holiday.reward.coins', { count: r.coins }));
  if (r.title) parts.push(t(`holiday.title.${r.title}`));
  return parts.join(' · ');
}

function previewWindow(holiday: HolidayKey, today: string, locale: string): HolidayWindow | null {
  return holidayWindows(Number(today.slice(0, 4)), locale).find((w) => w.key === holiday) ?? null;
}

type Load = { state: 'loading' } | { state: 'error' } | { state: 'ready'; view: HolidayProgressView };

function useServerProgress(holiday: HolidayKey | null, today: string, locale: string, enabled: boolean) {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!enabled || !holiday) return;
    let alive = true;
    fetch(`/api/holiday/progress?holiday=${holiday}&localDate=${today}&locale=${locale}`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const view = (await res.json()) as HolidayProgressView;
        if (alive) setLoad({ state: 'ready', view });
      })
      .catch(() => alive && setLoad({ state: 'error' }));
    return () => {
      alive = false;
    };
  }, [enabled, holiday, today, locale, tick]);

  return { load, refetch };
}

function Day({ day, today, theme, t }: { day: HolidayDayView; today: boolean; theme: (typeof THEME)[HolidayKey]; t: T }) {
  return (
    <li
      data-testid="holiday-day"
      data-lit={day.lit}
      data-source={day.source}
      aria-current={today ? 'date' : undefined}
      title={rewardLabel(t, day.reward)}
      className={cn(
        'relative flex aspect-[3/4] min-w-0 items-end justify-center rounded-lg border-2 border-black bg-neo-navy p-0.5',
        today && 'ring-2 ring-neo-holiday-gold ring-offset-2 ring-offset-neo-navy-light',
        day.source === 'daily' && 'shadow-[0_0_0_2px_var(--neo-holiday-gold),0_0_12px_var(--neo-holiday-gold)]',
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={theme.prop}
        alt=""
        loading="lazy"
        className={cn('h-full w-full object-contain', !day.lit && 'opacity-35 grayscale')}
      />
      <span className="absolute -top-2 start-1/2 -translate-x-1/2 rounded-full border-2 border-black bg-neo-cream px-1 font-neo-display text-[10px] font-bold leading-none text-neo-navy rtl:translate-x-1/2">
        {day.index + 1}
      </span>
      {day.source === 'friend' && (
        <span aria-hidden="true" className="absolute -bottom-1.5 end-0 size-3 rounded-full border-2 border-black bg-neo-pink" />
      )}
      <span className="sr-only">{t(day.lit ? 'holiday.event.dayLit' : 'holiday.event.dayUnlit', { day: day.index + 1 })}</span>
      {day.source === 'daily' && <span className="sr-only">{t('holiday.event.litByDaily')}</span>}
      {day.source === 'friend' && <span className="sr-only">{t('holiday.event.litByFriend')}</span>}
    </li>
  );
}

export default function HolidayEventCard() {
  const { t, language } = useLanguage();
  const { holiday, resolved } = useHoliday();
  const { user, loading: authLoading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [pop, setPop] = useState<LitResult | null>(null);
  const today = localDateIn(new Date());
  const liveWin = holiday ? windowFor(holiday, today, language) : null;
  const signedIn = !!user;
  const tracked = signedIn && !!liveWin;
  const { load, refetch } = useServerProgress(holiday, today, language, resolved && !authLoading && tracked);

  useEffect(() => {
    if (!signedIn) return;
    const fresh = consumeLastLit();
    if (fresh) setPop(fresh);
    const onLit = (e: Event) => {
      consumeLastLit();
      const detail = (e as CustomEvent<LitResult | undefined>).detail;
      if (detail?.status === 'lit') setPop(detail);
      refetch();
    };
    window.addEventListener(HOLIDAY_PROGRESS_EVENT, onLit);
    return () => window.removeEventListener(HOLIDAY_PROGRESS_EVENT, onLit);
  }, [signedIn, refetch]);

  if (!resolved || !holiday || authLoading) return null;
  const win = liveWin ?? previewWindow(holiday, today, language);
  if (!win) return null;
  if (tracked && load.state === 'loading') return null;

  const theme = THEME[holiday];
  const view = tracked && load.state === 'ready' ? load.view : buildProgressView(win, new Set());
  const todayIndex = trackIndex(win, today);
  const litCount = view.days.filter((d) => d.lit).length;

  return (
    <section
      data-testid="holiday-event-card"
      aria-labelledby="holiday-event-title"
      className="relative overflow-hidden rounded-2xl border-[3px] border-black bg-neo-navy-light p-3 text-neo-white shadow-hard"
    >
      <div className={cn('absolute inset-x-0 top-0 h-1.5', theme.accent)} aria-hidden="true" />
      <header className="flex items-baseline justify-between gap-2">
        <h2 id="holiday-event-title" className="font-neo-display text-lg font-bold leading-tight">
          {t(`holiday.event.${holiday}.title`)}
        </h2>
        <span className="shrink-0 font-neo-display text-xs font-bold text-neo-holiday-gold tabular-nums">
          {t('holiday.event.progress', { lit: litCount, total: view.days.length })}
        </span>
      </header>
      <p className="mt-0.5 text-xs text-neo-white/70">{t(`holiday.event.${holiday}.subtitle`)}</p>

      {tracked && load.state === 'error' ? (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border-2 border-black bg-neo-navy p-2 text-xs">
          <span>{t('holiday.event.loadError')}</span>
          <button type="button" onClick={refetch} className="rounded-lg border-2 border-black bg-neo-cream px-2 py-1 font-bold text-neo-navy">
            {t('holiday.event.retry')}
          </button>
        </div>
      ) : (
        <ol className={cn('mt-4 grid gap-1.5', view.days.length > 8 ? 'grid-cols-6 lg:grid-cols-12' : 'grid-cols-8')}>
          {view.days.map((d) => (
            <Day key={d.index} day={d} today={d.index === todayIndex} theme={theme} t={t} />
          ))}
        </ol>
      )}

      {liveWin && <HolidayCommunityCounter holiday={holiday} className="mt-2" />}
      {tracked && <HolidayRescueCard holiday={holiday} />}
      {tracked && <HolidayTablePanel holiday={holiday} />}
      {tracked && load.state === 'ready' && <HolidayCardExtras holiday={holiday} win={win} today={today} view={view} locale={language} />}
      <ArcadeTile />
      <HolidaySeasonLink className="mt-3 block text-center text-sm font-bold text-neo-holiday-gold underline-offset-4 hover:underline" />

      {pop && (
        <div
          data-testid="holiday-reward-pop"
          role="status"
          className="mt-3 flex items-center gap-2 rounded-xl border-2 border-black bg-neo-holiday-gold px-3 py-2 font-neo-display text-sm font-bold text-neo-navy shadow-hard-sm motion-safe:animate-in motion-safe:zoom-in-95"
        >
          <span>{t('holiday.event.earned', { day: pop.index + 1 })}</span>
          <span className="truncate">{rewardLabel(t, pop.reward)}</span>
        </div>
      )}

      {!signedIn && (
        <>
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="mt-3 w-full rounded-xl border-[3px] border-black bg-neo-cream px-3 py-2 font-neo-display text-sm font-bold text-neo-navy shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed"
          >
            {t('holiday.event.signInCta')}
          </button>
          <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode="signup" />
        </>
      )}
    </section>
  );
}
