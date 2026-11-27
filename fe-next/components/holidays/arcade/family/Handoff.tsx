'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { Player } from '@/lib/holidays/arcade/kit/passPlay';
import { cn } from '@/lib/utils';
import { PLAYER_BG, playerName } from './playerChip';
import styles from './family.module.css';

export default function Handoff({ player, index, onReady }: { player: Player; index: number; onReady: () => void }) {
  const { t } = useLanguage();
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="family-handoff" className="absolute inset-0 z-20 grid place-items-center bg-neo-navy/75 p-4">
      <div className={cn('flex w-full max-w-xs flex-col items-center gap-3 rounded-3xl border-[3px] border-black bg-neo-cream p-5 text-center text-neo-navy shadow-hard-lg', styles.slideIn)}>
        <span className={cn('grid size-16 place-items-center rounded-full border-[3px] border-black font-neo-display text-3xl font-black shadow-hard', PLAYER_BG[player.color])} aria-hidden="true">
          {index + 1}
        </span>
        <p className="font-neo-display text-sm font-black uppercase tracking-wide text-neo-navy/70">{t('holiday.arcade.family.passTo')}</p>
        <h2 id="family-handoff" className="font-neo-display text-3xl font-black leading-tight">{playerName(t, player, index)}</h2>
        <button
          type="button"
          autoFocus
          data-testid="family-ready"
          onClick={onReady}
          className="h-12 w-full rounded-xl border-[3px] border-black bg-neo-lime font-neo-display text-lg font-black shadow-hard active:translate-x-px active:translate-y-px active:shadow-hard-pressed"
        >
          {t('holiday.arcade.family.ready')}
        </button>
      </div>
    </div>
  );
}
