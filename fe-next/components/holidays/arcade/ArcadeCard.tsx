'use client';

import { Tv, Users } from 'lucide-react';
import { isPartyGame } from '@/lib/holidays/arcade/party/games';
import { useLanguage } from '@/contexts/LanguageContext';
import { ARCADE_GAMES, type ArcadeGameId } from '@/lib/holidays/arcade/games';
import { cn } from '@/lib/utils';
import styles from './arcade.module.css';

export default function ArcadeCard({ game, wide, onPick, onWarm }: { game: ArcadeGameId; wide?: boolean; onPick: () => void; onWarm?: () => void }) {
  const { t } = useLanguage();
  const meta = ARCADE_GAMES[game];
  return (
    <button
      type="button"
      data-testid={`arcade-pick-${game}`}
      onClick={onPick}
      onPointerDown={onWarm}
      onPointerEnter={onWarm}
      onFocus={onWarm}
      className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border-[3px] border-black bg-neo-navy-light text-start shadow-hard-lg transition-transform duration-200 hover:-rotate-1 hover:scale-[1.02] active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard motion-reduce:transition-none motion-reduce:hover:transform-none"
    >
      <span className={cn('relative block w-full overflow-hidden border-b-[3px] border-black', wide ? 'aspect-[16/9] sm:aspect-[4/5]' : 'aspect-[4/5]')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={meta.bg} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-110 motion-reduce:transition-none" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={meta.hero}
          alt=""
          loading="lazy"
          className={cn('absolute start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-[4px_4px_0_rgb(var(--neo-black))] transition-transform duration-300 group-hover:rotate-6 rtl:translate-x-1/2 motion-reduce:transition-none', wide ? 'h-4/5 w-auto sm:h-auto sm:w-3/5' : 'w-3/5', styles.floatProp)}
        />
        <span className={cn('absolute start-2 top-2 inline-flex items-center gap-1 rounded-full border-2 border-black px-2 py-0.5 font-neo-display text-[11px] font-black uppercase text-neo-white shadow-hard-sm', meta.holiday === 'hanukkah' ? 'bg-neo-holiday-blue' : 'bg-neo-holiday-red')}>
          <Users className="size-3" aria-hidden="true" />
          {t('holiday.arcade.family.badge')}
        </span>
        {isPartyGame(game) && (
          <span className="absolute end-2 top-2 inline-flex items-center gap-1 rounded-full border-2 border-black bg-neo-cyan px-2 py-0.5 font-neo-display text-[11px] font-black uppercase text-neo-navy shadow-hard-sm">
            <Tv className="size-3" aria-hidden="true" />
            {t('holiday.arcade.party.badge')}
          </span>
        )}
      </span>
      <span className="block flex-1 p-3">
        <span className="block font-neo-display text-lg font-black leading-tight text-neo-white">{t(`holiday.arcade.${game}.title`)}</span>
        <span className="mt-1 line-clamp-3 block text-xs font-bold leading-snug text-neo-white/75">{t(`holiday.arcade.${game}.blurb`)}</span>
      </span>
    </button>
  );
}
