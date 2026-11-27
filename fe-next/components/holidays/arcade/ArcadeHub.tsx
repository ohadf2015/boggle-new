'use client';

import { useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useArcadeGate } from './useArcadeGate';
import { ARCADE_GAMES, gamesFor, isArcadeGame, type ArcadeGameId } from '@/lib/holidays/arcade/games';
import { cn } from '@/lib/utils';
import ArcadeGameHost from './ArcadeGameHost';
import ArcadeCard from './ArcadeCard';
import styles from './arcade.module.css';

const MASCOT = { hanukkah: '/holidays/m-hanukkah.webp', christmas: '/holidays/m-christmas.webp' } as const;

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

  const all = gamesFor(holiday);
  const family = all.filter((g) => ARCADE_GAMES[g].family);
  const words = all.filter((g) => !ARCADE_GAMES[g].family);

  return (
    <section aria-labelledby="arcade-title" className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-3 pb-8 pt-4 text-neo-white">
      <header className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MASCOT[holiday]} alt="" width={72} height={72} className={cn('h-16 w-auto drop-shadow-[3px_3px_0_rgb(var(--neo-black))]', styles.floatProp)} />
        <div className="min-w-0">
          <h1 id="arcade-title" className="font-neo-display text-3xl font-black leading-tight">{t(`holiday.arcade.${holiday}.title`)}</h1>
          <p className="mt-1 text-sm text-neo-white/75">{t(`holiday.arcade.${holiday}.subtitle`)}</p>
        </div>
      </header>
      <h2 className="font-neo-display text-xl font-black text-neo-holiday-gold">{t('holiday.arcade.family.section')}</h2>
      <ul className="grid grid-cols-2 gap-3">
        {family.map((g) => (
          <li key={g}>
            <ArcadeCard game={g} onPick={() => go(g)} />
          </li>
        ))}
      </ul>
      <h2 className="font-neo-display text-xl font-black text-neo-holiday-gold">{t('holiday.arcade.wordSection')}</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {words.map((g) => (
          <li key={g}>
            <ArcadeCard game={g} onPick={() => go(g)} />
          </li>
        ))}
      </ul>
      <p className="text-center text-xs text-neo-white/60">{t('holiday.arcade.coinNote')}</p>
    </section>
  );
}
