'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ARCADE_GAMES, type ArcadeGameId } from '@/lib/holidays/arcade/games';
import { MAX_PLAYERS, PLAYER_COLORS } from '@/lib/holidays/arcade/kit/passPlay';
import { cn } from '@/lib/utils';
import { PLAYER_BG } from './playerChip';
import styles from './family.module.css';

interface Props {
  game: ArcadeGameId;
  onStart: (names: string[]) => void;
}

export default function PassPlaySetup({ game, onStart }: Props) {
  const { t } = useLanguage();
  const [count, setCount] = useState(1);
  const [names, setNames] = useState<string[]>(Array(MAX_PLAYERS).fill(''));
  const meta = ARCADE_GAMES[game];

  return (
    <div data-testid="family-setup" className="absolute inset-0 z-10 flex flex-col items-center justify-end gap-3 overflow-y-auto bg-gradient-to-t from-neo-navy via-neo-navy/80 to-neo-navy/10 px-4 pb-5 pt-8 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={meta.hero} alt="" width={160} height={160} className={cn('h-28 w-auto drop-shadow-[4px_4px_0_rgb(var(--neo-black))]', styles.bob)} />
      <span className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-[var(--arcade-accent)] text-neo-white px-3 py-0.5 font-neo-display text-xs font-black uppercase tracking-wide shadow-hard-sm">
        <Users className="size-3.5" aria-hidden="true" />
        {t('holiday.arcade.family.badge')}
      </span>
      <h2 className="font-neo-display text-3xl font-black leading-tight [text-shadow:3px_3px_0_rgb(var(--neo-black))]">{t(`holiday.arcade.${game}.title`)}</h2>
      <p className="max-w-xs text-sm font-bold leading-snug text-neo-white/90">{t(`holiday.arcade.${game}.how`)}</p>
      <fieldset className="w-full max-w-xs">
        <legend className="mb-2 w-full text-center font-neo-display text-sm font-black text-neo-white/80">{t('holiday.arcade.family.players')}</legend>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: MAX_PLAYERS }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={count === i + 1}
              data-testid={`family-count-${i + 1}`}
              onClick={() => setCount(i + 1)}
              className={cn(
                'flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl border-[3px] border-black font-neo-display text-lg font-black shadow-hard transition-transform active:translate-x-px active:translate-y-px active:shadow-hard-pressed',
                count === i + 1 ? 'bg-[var(--arcade-accent)] text-neo-white' : 'bg-neo-navy-light text-neo-white',
              )}
            >
              {i + 1}
              <span className="flex -space-x-1 rtl:space-x-reverse" aria-hidden="true">
                {PLAYER_COLORS.slice(0, i + 1).map((c) => (
                  <span key={c} className={cn('size-2.5 rounded-full border border-black', PLAYER_BG[c])} />
                ))}
              </span>
            </button>
          ))}
        </div>
      </fieldset>
      {count > 1 && (
        <div className="grid w-full max-w-xs grid-cols-2 gap-2">
          {Array.from({ length: count }, (_, i) => (
            <label key={i} className="flex items-center gap-1.5 rounded-xl border-2 border-black bg-neo-cream px-2 py-1">
              <span className={cn('size-4 shrink-0 rounded-full border-2 border-black', PLAYER_BG[PLAYER_COLORS[i]])} aria-hidden="true" />
              <span className="sr-only">{t('holiday.arcade.family.nameLabel', { n: i + 1 })}</span>
              <input
                value={names[i]}
                maxLength={12}
                onChange={(e) => setNames((n) => n.map((v, j) => (j === i ? e.target.value : v)))}
                placeholder={t('holiday.arcade.family.playerN', { n: i + 1 })}
                className="min-w-0 flex-1 bg-transparent font-neo-display text-sm font-bold text-neo-navy outline-none placeholder:text-neo-navy/50"
              />
            </label>
          ))}
        </div>
      )}
      <button
        type="button"
        data-testid="family-start"
        onClick={() => onStart(names.slice(0, count))}
        className="h-14 w-full max-w-xs rounded-2xl border-[3px] border-black bg-neo-lime font-neo-display text-xl font-black text-neo-navy shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard"
      >
        {t(count > 1 ? 'holiday.arcade.family.startTogether' : 'holiday.arcade.family.start')}
      </button>
    </div>
  );
}
