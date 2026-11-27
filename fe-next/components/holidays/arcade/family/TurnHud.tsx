'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { pluralKeyOf } from '@/lib/i18n/pluralKey';
import type { Player } from '@/lib/holidays/arcade/kit/passPlay';
import type { FamilyGameId } from '@/lib/holidays/arcade/games';
import { cn } from '@/lib/utils';
import type { TurnHud as Hud } from './scenes/common';
import { PLAYER_BG, playerName } from './playerChip';

interface Props {
  game: FamilyGameId;
  hud: Hud | null;
  seconds: number;
  player?: Player;
  playerIndex: number;
}

export default function TurnHud({ hud, seconds, player, playerIndex }: Props) {
  const { t, language } = useLanguage();
  const left = hud?.left ?? seconds;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-1.5 p-2">
      {hud?.round ? (
        <p className="self-center rounded-full border-2 border-black bg-neo-navy/85 px-3 py-0.5 font-neo-display text-sm font-black text-neo-white shadow-hard-sm">
          {t('holiday.arcade.spin.roundOf', { n: hud.round, total: 3 })}
        </p>
      ) : (
        <div className="h-3 overflow-hidden rounded-full border-2 border-black bg-neo-navy/70" role="timer" aria-label={t(pluralKeyOf('holiday.arcade.family.timeLeft', left, language), { count: left })}>
          <div className={cn('h-full origin-left bg-neo-holiday-gold transition-transform duration-1000 ease-linear rtl:origin-right', left <= 5 && 'bg-neo-pink')} style={{ transform: `scaleX(${Math.max(0, left / seconds)})` }} />
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        {player ? (
          <span className="flex min-w-0 items-center gap-1.5 rounded-full border-2 border-black bg-neo-navy/85 py-0.5 pe-3 ps-1 font-neo-display text-sm font-black text-neo-white shadow-hard-sm">
            <span className={cn('size-4 shrink-0 rounded-full border-2 border-black', PLAYER_BG[player.color])} aria-hidden="true" />
            <span className="truncate">{playerName(t, player, playerIndex)}</span>
          </span>
        ) : (
          <span />
        )}
        {hud?.lives !== undefined && (
          <span className="flex gap-0.5" role="img" aria-label={t(pluralKeyOf('holiday.arcade.presents.lives', hud.lives, language), { count: hud.lives })}>
            {Array.from({ length: 3 }, (_, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src="/holidays/arcade/spr-gift-red.webp" alt="" width={24} height={24} className={cn('size-6 drop-shadow-[2px_2px_0_rgb(var(--neo-black))]', i >= hud.lives! && 'opacity-25 grayscale')} />
            ))}
          </span>
        )}
        {hud && hud.combo >= 2 && (
          <span key={hud.combo} className="rounded-full border-2 border-black bg-neo-pink px-3 py-0.5 font-neo-display text-sm font-black text-neo-white shadow-hard-sm motion-safe:animate-bounce">
            {t('holiday.arcade.family.combo', { count: hud.combo })}
          </span>
        )}
      </div>
    </div>
  );
}
