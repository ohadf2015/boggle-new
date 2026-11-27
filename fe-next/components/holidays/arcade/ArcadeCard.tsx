'use client';

import { Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ARCADE_GAMES, type ArcadeGameId } from '@/lib/holidays/arcade/games';
import { cn } from '@/lib/utils';
import styles from './arcade.module.css';

export default function ArcadeCard({ game, onPick }: { game: ArcadeGameId; onPick: () => void }) {
  const { t } = useLanguage();
  const meta = ARCADE_GAMES[game];
  return (
    <button
      type="button"
      data-testid={`arcade-pick-${game}`}
      onClick={onPick}
      className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border-[3px] border-black bg-neo-navy-light text-start shadow-hard-lg transition-transform duration-200 hover:-rotate-1 hover:scale-[1.02] active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard motion-reduce:transition-none motion-reduce:hover:transform-none"
    >
      <span className={cn('relative block w-full overflow-hidden border-b-[3px] border-black', meta.family ? 'aspect-[4/5] sm:aspect-[16/10]' : 'aspect-[4/3]')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={meta.bg} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-110 motion-reduce:transition-none" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={meta.hero}
          alt=""
          loading="lazy"
          className={cn('absolute start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-[4px_4px_0_rgb(var(--neo-black))] transition-transform duration-300 group-hover:rotate-6 rtl:translate-x-1/2 motion-reduce:transition-none', meta.family ? cn('w-3/5 sm:h-4/5 sm:w-auto', styles.floatProp) : 'w-2/5')}
        />
        {meta.family && (
          <span className="absolute start-2 top-2 inline-flex items-center gap-1 rounded-full border-2 border-black bg-neo-holiday-gold px-2 py-0.5 font-neo-display text-[11px] font-black uppercase text-neo-navy shadow-hard-sm">
            <Users className="size-3" aria-hidden="true" />
            {t('holiday.arcade.family.badge')}
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
