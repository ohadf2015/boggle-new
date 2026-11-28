'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PressSurface } from '@/components/motion/PressSurface';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHoliday } from '@/hooks/useHoliday';
import { formatHolidayDay, holidayWindows, localDateIn, trackIndex, windowFor, type HolidayKey } from '@/lib/holidays/calendar';
import { cn } from '@/lib/utils';

const LOOK: Record<HolidayKey, { hero: string; stripe: string; cta: string }> = {
  hanukkah: { hero: '/holidays/hero-hanukkah.webp', stripe: 'bg-neo-holiday-blue', cta: 'bg-neo-holiday-blue' },
  christmas: { hero: '/holidays/hero-christmas.webp', stripe: 'bg-neo-holiday-red', cta: 'bg-neo-holiday-red' },
};

/** The holiday's single home-page entry: everything else lives in the hub behind it. */
export default function HolidayHomeCard() {
  const { t, language } = useLanguage();
  const { holiday: live, theme, resolved } = useHoliday();
  if (!resolved || !theme) return null;

  const today = localDateIn(new Date());
  const look = LOOK[theme];
  const win = live ? windowFor(live, today, language) : null;
  const night = win ? trackIndex(win, today) : null;
  const opens = live ? null : holidayWindows(Number(today.slice(0, 4)), language).find((w) => w.key === theme)?.start ?? null;

  const chip = night !== null && win
    ? t(`holiday.arcade.lobby.${theme === 'hanukkah' ? 'night' : 'day'}`, { n: night + 1, total: win.trackDays.length })
    : opens
      ? t('holiday.home.opens', { date: formatHolidayDay(opens, language) })
      : null;

  const body = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={look.hero} alt="" className="aspect-[21/9] w-full border-b-[3px] border-black object-cover object-[50%_30%] sm:aspect-auto sm:w-48 sm:border-b-0 sm:border-e-[3px]" />
      <span className="flex flex-1 flex-col gap-1 p-3 text-neo-white sm:p-4">
        <span className="flex items-center justify-between gap-2">
          <span className="font-neo-display text-xl font-black leading-tight sm:text-2xl">{t(`holiday.event.${theme}.title`)}</span>
          {chip && (
            <span className="shrink-0 rounded-full border-2 border-black bg-neo-cream px-2 py-0.5 font-neo-display text-xs font-black text-neo-navy tabular-nums">{chip}</span>
          )}
        </span>
        <span className="text-sm leading-snug text-neo-white/85">{t('holiday.home.line')}</span>
        {live && (
          <span className={cn('mt-2 inline-flex items-center gap-1.5 self-start rounded-xl border-2 border-black px-3 py-1.5 font-neo-display text-sm font-black text-neo-white shadow-hard-sm', look.cta)}>
            {t('holiday.home.cta')}
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </span>
        )}
      </span>
    </>
  );

  const shell = 'relative flex flex-col overflow-hidden rounded-2xl border-[3px] border-black bg-neo-navy-light sm:flex-row';
  return (
    <section aria-label={t(`holiday.event.${theme}.title`)} className="relative">
      <span className={cn('absolute inset-x-3 -top-1.5 z-[1] h-3 rounded-full border-2 border-black', look.stripe)} aria-hidden="true" />
      {live ? (
        <PressSurface asChild lip={4}>
          <Link href={`/${language}/holiday-arcade`} data-testid="holiday-home-card" className={cn(shell, 'shadow-hard')}>
            {body}
          </Link>
        </PressSurface>
      ) : (
        <div data-testid="holiday-home-card" className={cn(shell, 'shadow-hard')}>
          {body}
        </div>
      )}
    </section>
  );
}
