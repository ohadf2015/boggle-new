'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { pluralKeyOf } from '@/lib/i18n/pluralKey';
import type { Player } from '@/lib/holidays/arcade/kit/passPlay';
import { cn } from '@/lib/utils';
import type { TurnHud as Hud } from './scenes/common';
import { PLAYER_BG, playerName } from './playerChip';
import styles from './family.module.css';

interface Props {
  hud: Hud | null;
  seconds: number;
  players?: Player[];
  turn: number;
}

export default function TurnHud({ hud, seconds, players, turn }: Props) {
  const { t, language } = useLanguage();
  const left = hud?.left ?? seconds;
  const mult = hud?.mult ?? 1;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-1.5 p-2">
      {hud?.round ? (
        <p className="self-center rounded-full border-2 border-black bg-neo-navy/85 px-3 py-0.5 font-neo-display text-sm font-black text-neo-white shadow-hard-sm">
          {t('holiday.arcade.spin.roundOf', { n: hud.round, total: hud.rounds ?? hud.round })}
          {hud.pushes !== undefined && <span className="ms-2 text-neo-cyan">{t('holiday.arcade.spin.pushes', { count: hud.pushes })}</span>}
        </p>
      ) : (
        <div className="h-3 overflow-hidden rounded-full border-2 border-black bg-neo-navy/70" role="timer" aria-label={t(pluralKeyOf('holiday.arcade.family.timeLeft', left, language), { count: left })}>
          <div className={cn('h-full origin-left bg-[var(--arcade-accent)] transition-transform duration-1000 ease-linear rtl:origin-right', left <= 5 && 'bg-neo-pink')} style={{ transform: `scaleX(${Math.max(0, left / seconds)})` }} />
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        {players ? (
          <ol data-testid="family-scoreboard" aria-label={t('holiday.arcade.family.scoreboard')} className="flex min-w-0 flex-wrap gap-1">
            {players.map((p, i) => (
              <li
                key={i}
                className={cn(
                  'flex min-w-0 items-center gap-1 rounded-full border-2 border-black py-0.5 pe-2 ps-1 font-neo-display text-sm font-black shadow-hard-sm',
                  i === turn ? 'bg-[var(--arcade-accent)] text-neo-white' : 'bg-neo-navy/85 text-neo-white',
                )}
              >
                <span className={cn('size-3.5 shrink-0 rounded-full border-2 border-black', PLAYER_BG[p.color])} aria-hidden="true" />
                <span className="max-w-[6rem] truncate">{playerName(t, p, i)}</span>
                <span className="tabular-nums">{i === turn ? (hud?.score ?? 0) : p.score ?? '–'}</span>
              </li>
            ))}
          </ol>
        ) : (
          <span />
        )}
        {hud && hud.combo >= 2 && (
          <span className="flex shrink-0 items-center gap-1">
            <span key={hud.combo} className={cn('rounded-full border-2 border-black bg-neo-pink px-3 py-0.5 font-neo-display text-sm font-black text-neo-white shadow-hard-sm', styles.pop)}>
              {t('holiday.arcade.family.combo', { count: hud.combo })}
            </span>
            {mult > 1 && (
              <span key={`m${mult}`} className={cn('rounded-full border-2 border-black bg-neo-lime px-2 py-0.5 font-neo-display text-sm font-black text-neo-navy shadow-hard-sm', styles.pop)}>
                {t('holiday.arcade.family.mult', { n: mult })}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
