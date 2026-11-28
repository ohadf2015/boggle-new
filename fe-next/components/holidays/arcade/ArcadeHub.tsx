'use client';

import { useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useArcadeGate } from './useArcadeGate';
import { ARCADE_GAMES, gamesFor, isArcadeGame, type ArcadeGameId } from '@/lib/holidays/arcade/games';
import { cn } from '@/lib/utils';
import ArcadeGameHost from './ArcadeGameHost';
import ArcadeCard from './ArcadeCard';
import { prefetchGame } from './gameLoaders';
import ArcadeMoreFun from './ArcadeMoreFun';
import HolidayEventCard from '@/components/holidays/HolidayEventCard';
import { localDateIn, trackIndex, windowFor } from '@/lib/holidays/calendar';
import styles from './arcade.module.css';

const LOOK = {
  hanukkah: { hero: '/holidays/hero-hanukkah.webp', stripe: 'bg-neo-holiday-blue', bulbs: ['bg-neo-holiday-blue', 'bg-neo-holiday-snow', 'bg-neo-cyan'], chip: 'bg-neo-holiday-blue text-neo-white' },
  christmas: { hero: '/holidays/hero-christmas.webp', stripe: 'bg-neo-holiday-red', bulbs: ['bg-neo-holiday-red', 'bg-neo-holiday-pine', 'bg-neo-holiday-snow'], chip: 'bg-neo-holiday-red text-neo-white' },
} as const;

export default function ArcadeHub() {
  const { t, language } = useLanguage();
  const { holiday, resolved } = useArcadeGate();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get('g');
  const selected: ArcadeGameId | null = holiday && isArcadeGame(raw) && ARCADE_GAMES[raw].holiday === holiday ? raw : null;

  useEffect(() => {
    if (resolved && !holiday) router.replace(`/${language}`);
  }, [resolved, holiday, router, language]);

  const go = useCallback(
    (g: ArcadeGameId | null) => {
      const q = new URLSearchParams(params.toString());
      if (g) q.set('g', g);
      else q.delete('g');
      const qs = q.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  if (!resolved || !holiday) {
    return <div className="mx-auto mt-6 h-96 w-full max-w-lg animate-pulse rounded-2xl bg-neo-navy-light/60" role="status" aria-label={t('holiday.arcade.loading')} />;
  }

  if (selected) return <ArcadeGameHost key={selected} holiday={holiday} game={selected} onExit={() => go(null)} />;

  const games = gamesFor(holiday);
  const today = localDateIn(new Date());
  const win = windowFor(holiday, today, language);
  const night = win ? trackIndex(win, today) : null;
  const look = LOOK[holiday];

  return (
    <section aria-labelledby="arcade-title" className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-10 pt-3 text-neo-white">
      <nav className="flex items-center justify-between gap-2">
        <Link
          href={`/${language}`}
          data-testid="arcade-home"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border-[3px] border-black bg-neo-cream px-3 font-neo-display text-sm font-black text-neo-navy shadow-hard-sm active:translate-x-px active:translate-y-px active:shadow-hard-pressed"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
          {t('holiday.arcade.lobby.home')}
        </Link>
        {night !== null && win && (
          <span data-testid="arcade-night" className={cn('rounded-full border-[3px] border-black px-3 py-1 font-neo-display text-sm font-black shadow-hard-sm tabular-nums', look.chip)}>
            {t(`holiday.arcade.lobby.${holiday === 'hanukkah' ? 'night' : 'day'}`, { n: night + 1, total: win.trackDays.length })}
          </span>
        )}
      </nav>

      <header className="relative overflow-hidden rounded-3xl border-[3px] border-black bg-neo-navy-light shadow-hard-lg">
        <div className={cn('h-2', look.stripe)} aria-hidden="true" />
        <div className={cn(styles.lights, 'absolute inset-x-3 top-3 z-[1]')} aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} className={cn(styles.bulb, look.bulbs[i % look.bulbs.length])} />
          ))}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={look.hero} alt="" className="aspect-[21/9] w-full border-b-[3px] border-black object-cover sm:aspect-[3/1]" />
        <div className="p-4 sm:p-5">
          <h1 id="arcade-title" className="font-neo-display text-3xl font-black leading-none sm:text-5xl">{t(`holiday.arcade.${holiday}.title`)}</h1>
          <p className="mt-2 text-sm text-neo-white/80 sm:text-base">{t(`holiday.arcade.${holiday}.subtitle`)}</p>
        </div>
      </header>

      <div id="holiday-event" className="scroll-mt-20 empty:hidden">
        <HolidayEventCard inHub />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-neo-display text-2xl font-black text-neo-cream">
          <Users className="size-6" aria-hidden="true" />
          {t('holiday.arcade.family.section')}
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {games.map((g, i) => (
            <li key={g} className={cn(i === 0 && 'col-span-2 sm:col-span-1')}>
              <ArcadeCard game={g} wide={i === 0} onPick={() => go(g)} onWarm={() => prefetchGame(g)} />
            </li>
          ))}
        </ul>
      </div>
      <p className="-mt-2 text-center text-xs text-neo-white/60">{t('holiday.arcade.coinNote')}</p>

      <ArcadeMoreFun holiday={holiday} lang={language} t={t} />
    </section>
  );
}
