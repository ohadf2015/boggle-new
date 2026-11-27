'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { Match } from '@/lib/holidays/arcade/kit/passPlay';
import { cn } from '@/lib/utils';
import { PLAYER_BG, playerName } from './playerChip';
import styles from './family.module.css';
import { useFreshTap } from '../useFreshTap';

export default function Handoff({ match, onReady }: { match: Match; onReady: () => void }) {
  const { t } = useLanguage();
  const { surface, guard } = useFreshTap(700);
  const index = match.turn;
  const player = match.players[index];
  const done = match.players.slice(0, index).map((p, i) => ({ p, i }));
  const toBeat = done.length ? Math.max(...done.map(({ p }) => p.score ?? 0)) : null;
  return (
    <div {...surface} role="dialog" aria-modal="true" aria-labelledby="family-handoff" className="absolute inset-0 z-20 grid place-items-center bg-neo-navy/80 p-4">
      <div className={cn('flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl border-[3px] border-black bg-neo-cream p-5 text-center text-neo-navy shadow-hard-lg', styles.slideIn)}>
        <span className={cn('grid size-20 place-items-center rounded-full border-[3px] border-black font-neo-display text-4xl font-black shadow-hard', PLAYER_BG[player.color], styles.bob)} aria-hidden="true">
          {index + 1}
        </span>
        <p className="font-neo-display text-sm font-black uppercase tracking-wide text-neo-navy/70">{t('holiday.arcade.family.passTo')}</p>
        <h2 id="family-handoff" data-testid="family-handoff-title" className="font-neo-display text-4xl font-black leading-tight">
          {t('holiday.arcade.family.yourTurn', { name: playerName(t, player, index) })}
        </h2>
        {toBeat !== null && (
          <p data-testid="family-to-beat" className="rounded-full border-2 border-black bg-[var(--arcade-accent)] text-neo-white px-4 py-1 font-neo-display text-lg font-black tabular-nums shadow-hard-sm">
            {t('holiday.arcade.family.toBeat', { score: toBeat })}
          </p>
        )}
        {done.length > 0 && (
          <ol className="flex w-full flex-wrap justify-center gap-1.5">
            {done.map(({ p, i }) => (
              <li key={i} className="flex items-center gap-1 rounded-full border-2 border-black bg-neo-white px-2 py-0.5 font-neo-display text-sm font-black">
                <span className={cn('size-3.5 rounded-full border-2 border-black', PLAYER_BG[p.color])} aria-hidden="true" />
                <span className="max-w-[7rem] truncate">{playerName(t, p, i)}</span>
                <span className="tabular-nums">{p.score ?? 0}</span>
              </li>
            ))}
          </ol>
        )}
        <button
          type="button"
          autoFocus
          data-testid="family-ready"
          onClick={guard(onReady)}
          className="h-14 w-full rounded-xl border-[3px] border-black bg-neo-lime font-neo-display text-xl font-black shadow-hard active:translate-x-px active:translate-y-px active:shadow-hard-pressed"
        >
          {t('holiday.arcade.family.ready')}
        </button>
      </div>
    </div>
  );
}
