'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Flame } from 'lucide-react';
import { HOME_PREVIEW_COPY as C } from './copy';

interface DailyBlockProps {
  lang: string;
  t: (key: string) => string;
  streak: number;
  streakLoading: boolean;
}

/** A tear-off ticket: the streak is the stub, today's puzzle is the ticket. */
export function DailyBlock({ lang, t, streak, streakLoading }: DailyBlockProps) {
  const today = new Date();
  const weekday = new Intl.DateTimeFormat(lang, { weekday: 'long' }).format(today);
  const day = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }).format(today);

  return (
    <section aria-labelledby="hp-daily-title" className="relative h-full" data-testid="hp-daily">
      <div className="flex h-full overflow-hidden rounded-3xl border-[3px] border-black bg-neo-orange text-black shadow-hard-lg">
        <div className="relative flex w-[34%] shrink-0 flex-col items-center justify-center gap-1 border-e-[3px] border-dashed border-black bg-neo-yellow px-2 py-4 lg:w-[30%] lg:py-8">
          <Image
            src="/mascot/streak-inferno-nobg.webp"
            alt=""
            width={256}
            height={256}
            className="h-16 w-16 lg:h-28 lg:w-28"
          />
          {streakLoading ? (
            <span className="h-12 w-14 rounded-lg bg-black/15 lg:h-20 lg:w-24" aria-hidden="true" />
          ) : streak > 0 ? (
            <>
              <span className="font-neo-display text-5xl font-bold leading-none tabular-nums lg:text-8xl">{streak}</span>
              <span className="text-center text-[11px] font-bold uppercase tracking-wider lg:text-sm">
                {t('homeFresh.sections.daily.streak')}
              </span>
            </>
          ) : (
            <span className="text-center font-neo-display text-sm font-bold leading-tight lg:text-lg">{C.dailyNoStreak}</span>
          )}
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col gap-2 p-4 lg:justify-center lg:gap-4 lg:p-10">
          <div className="flex items-center gap-2">
            <span className="rounded-lg border-2 border-black bg-black px-2 py-0.5 font-neo-display text-[11px] font-bold tracking-widest text-neo-yellow uppercase lg:text-sm">
              {t('daily.badge')}
            </span>
            <span className="truncate text-xs font-bold lg:text-base">
              {weekday} · {day}
            </span>
          </div>
          <h2 id="hp-daily-title" className="font-neo-display text-xl font-bold leading-tight lg:text-4xl">
            {t('homeFresh.sections.daily.title')}
          </h2>
          <p className="hidden text-sm font-medium lg:block lg:text-lg">{t('homeFresh.sections.daily.line')}</p>
          <Link
            href={`/${lang}/daily`}
            className="mt-auto inline-flex items-center gap-1.5 lg:mt-2 self-start rounded-xl border-[3px] border-black bg-black px-2.5 py-2 font-neo-display text-sm whitespace-nowrap font-bold text-neo-yellow shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed lg:px-5 lg:py-3 lg:text-lg"
          >
            <Flame className="h-4 w-4 lg:h-5 lg:w-5" strokeWidth={2.75} aria-hidden="true" />
            {t('homeFresh.sections.daily.cta')}
            <ArrowRight className="hidden h-5 w-5 rtl:-scale-x-100 lg:block" strokeWidth={3} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <span aria-hidden="true" className="absolute start-[34%] -top-3 h-6 w-6 -translate-x-1/2 rounded-full border-[3px] border-black bg-neo-navy rtl:translate-x-1/2 lg:start-[30%]" />
      <span aria-hidden="true" className="absolute start-[34%] -bottom-3 h-6 w-6 -translate-x-1/2 rounded-full border-[3px] border-black bg-neo-navy rtl:translate-x-1/2 lg:start-[30%]" />
    </section>
  );
}
