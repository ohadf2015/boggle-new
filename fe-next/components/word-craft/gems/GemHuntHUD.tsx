'use client';

import { memo } from 'react';
import { Trophy, Hourglass } from 'lucide-react';
import {
  GEM_COLORS,
  WIN_RARITY,
  type GemInventory,
} from '@/lib/word-craft/gems/types';
import { GemIcon } from './GemIcon';
import { cn } from '@/lib/utils';

export interface GemHuntHUDProps {
  inventory: GemInventory;
  totalScore: number;
  tilesRemaining: number;
  turnIndex: number;
  labels: {
    crownsWon: string;
    score: string;
    bagRemaining: string;
    turn: string;
  };
}

function GemHuntHUDImpl({ inventory, totalScore, tilesRemaining, turnIndex, labels }: GemHuntHUDProps) {
  const crowns = GEM_COLORS.map((c) => inventory[c][WIN_RARITY] >= 1);
  const wonCount = crowns.filter(Boolean).length;
  return (
    <header className="rounded-neo border-neo-thick border-black bg-neo-navy-light px-2 py-1.5 shadow-hard">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5" aria-label={labels.crownsWon}>
          <Trophy className="h-3.5 w-3.5 text-neo-yellow" aria-hidden />
          <span className="font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-cream/70">
            {labels.crownsWon}
          </span>
          <span className="font-neo-display text-base font-black tabular-nums text-neo-cream">
            {wonCount}/{GEM_COLORS.length}
          </span>
          <span className="ms-1 flex items-center gap-0.5">
            {GEM_COLORS.map((color, i) => (
              <span
                key={color}
                className={cn('inline-block', crowns[i] ? '' : 'opacity-25 grayscale')}
                aria-hidden
              >
                <GemIcon color={color} rarity={WIN_RARITY} sizePx={14} />
              </span>
            ))}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-neo-display font-black uppercase tracking-wider text-neo-cream/60">
          <span className="inline-flex items-center gap-1">
            {labels.score}
            <span className="text-neo-lime tabular-nums">{totalScore}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Hourglass className="h-3 w-3" aria-hidden />
            {labels.bagRemaining}
            <span className="text-neo-cyan tabular-nums">{tilesRemaining}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            {labels.turn}
            <span className="text-neo-pink tabular-nums">{turnIndex + 1}</span>
          </span>
        </div>
      </div>
    </header>
  );
}

export const GemHuntHUD = memo(GemHuntHUDImpl);
