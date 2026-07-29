'use client';

import { WordCraftLegendChip } from './WordCraftLegendChip';
import { cn } from '@/lib/utils';

interface Props {
  t: (k: string) => string;
  playerScore: number;
  botScore: number;
  currentTurn: 'player' | 'bot';
  tilesInBag: number;
}

export function WordCraftHUD({ t, playerScore, botScore, currentTurn, tilesInBag }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-neo rounded-neo bg-neo-navy text-neo-white">
      <div
        data-wc-score-chip
        className={cn(
          'px-3 py-1 rounded-neo border-neo font-neo-display text-xl',
          currentTurn === 'player' ? 'bg-neo-lime text-neo-navy' : 'bg-neo-navy-light',
        )}
      >
        {t('wordcraft.you')}: {playerScore}
      </div>
      <div
        className={cn(
          'px-3 py-1 rounded-neo border-neo font-neo-display text-xl',
          currentTurn === 'bot' ? 'bg-neo-pink text-neo-white' : 'bg-neo-navy-light',
        )}
      >
        {t('wordcraft.bot')}: {botScore}
      </div>
      <div data-wc-bag className="ml-auto text-sm font-neo-body opacity-80">
        {t('wordcraft.tilesLeft')}: {tilesInBag}
      </div>
      <WordCraftLegendChip t={t} className="basis-full mt-1" />
    </div>
  );
}
