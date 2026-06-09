'use client';

import { memo } from 'react';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WordCraftTerritoryStripProps {
  playerCount: number;
  botCount: number;
  labels: {
    territoryLabel: string;
    yourTerritory: string;
    botTerritory: string;
    endgameBonusHint: string;
  };
}

/**
 * Slim color-coded territory chip row under the scoreboard. Each side shows
 * its claimed-cell count tinted in its team color. Endgame hint surfaces the
 * "+2 per claimed cell" rule so the player understands why captures matter.
 */
function WordCraftTerritoryStripImpl({ playerCount, botCount, labels }: WordCraftTerritoryStripProps) {
  const total = playerCount + botCount;
  if (total === 0) return null;
  return (
    <div
      data-testid="wc-territory-strip"
      className="flex items-center justify-between gap-2 px-1 text-[10px] sm:text-xs font-neo-display font-black uppercase tracking-wider"
    >
      <span className="inline-flex items-center gap-1.5">
        <Crown className="w-3 h-3 text-neo-white" aria-hidden />
        <span className="text-neo-white">{labels.territoryLabel}</span>
      </span>
      <span className="inline-flex items-center gap-3">
        <span
          data-team="player"
          className={cn('inline-flex items-center gap-1 text-neo-cyan')}
          aria-label={labels.yourTerritory}
        >
          <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full bg-neo-cyan" />
          <span className="tabular-nums">{playerCount}</span>
        </span>
        <span
          data-team="bot"
          className="inline-flex items-center gap-1 text-neo-pink"
          aria-label={labels.botTerritory}
        >
          <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full bg-neo-pink" />
          <span className="tabular-nums">{botCount}</span>
        </span>
        <span className="text-neo-white normal-case tracking-normal font-neo-body">
          {labels.endgameBonusHint}
        </span>
      </span>
    </div>
  );
}

export const WordCraftTerritoryStrip = memo(WordCraftTerritoryStripImpl);
