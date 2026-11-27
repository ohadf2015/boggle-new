'use client';

import { useCallback, useEffect } from 'react';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHoliday } from '@/hooks/useHoliday';
import { ARCADE_GAMES, gamesFor, isArcadeGame, type ArcadeGameId } from '@/lib/holidays/arcade/games';
import ArcadeGameHost from './ArcadeGameHost';

export default function ArcadeHub() {
  const { t, language } = useLanguage();
  const { holiday, resolved } = useHoliday();
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

  return (
    <section aria-labelledby="arcade-title" className="mx-auto flex w-full max-w-lg flex-col gap-3 px-3 pb-8 pt-4 text-neo-white">
      <header>
        <h1 id="arcade-title" className="font-neo-display text-3xl font-black leading-tight">{t(`holiday.arcade.${holiday}.title`)}</h1>
        <p className="mt-1 text-sm text-neo-white/75">{t(`holiday.arcade.${holiday}.subtitle`)}</p>
      </header>
      <ul className="grid gap-3">
        {gamesFor(holiday).map((g, i) => (
          <li key={g}>
            <button
              type="button"
              data-testid={`arcade-pick-${g}`}
              onClick={() => go(g)}
              className="group grid w-full grid-cols-[6.5rem_1fr] items-center gap-3 overflow-hidden rounded-2xl border-[3px] border-black bg-neo-navy-light p-2 text-start shadow-hard-lg transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard"
            >
              <span className="relative block aspect-square overflow-hidden rounded-xl border-2 border-black bg-neo-navy">
                <Image src={ARCADE_GAMES[g].cover} alt="" fill sizes="104px" priority={i === 0} className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none" />
              </span>
              <span className="min-w-0">
                <span className="block font-neo-display text-xl font-black leading-tight">{t(`holiday.arcade.${g}.title`)}</span>
                <span className="mt-1 block text-sm leading-snug text-neo-white/75">{t(`holiday.arcade.${g}.blurb`)}</span>
                <span className="mt-2 inline-block rounded-lg border-2 border-black bg-neo-holiday-gold px-2 py-0.5 font-neo-display text-xs font-black text-neo-navy">
                  {t('holiday.arcade.play')}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-center text-xs text-neo-white/60">{t('holiday.arcade.coinNote')}</p>
    </section>
  );
}
