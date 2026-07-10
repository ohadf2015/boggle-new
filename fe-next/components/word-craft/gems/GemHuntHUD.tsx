'use client';

import { memo } from 'react';
import { Trophy, Hourglass } from 'lucide-react';
import {
  GEM_COLORS,
  TRANSMUTE_COST,
  WIN_RARITY,
  type GemColor,
  type GemInventory,
} from '@/lib/word-craft/gems/types';
import { GemIcon } from './GemIcon';
import { cn } from '@/lib/utils';

const GEM_PROGRESS_CLASS: Record<GemColor, string> = {
  amber: 'bg-neo-yellow',
  ruby: 'bg-neo-pink',
  sapphire: 'bg-neo-cyan',
  emerald: 'bg-neo-lime',
};

const CHIPS_TO_CROWN = TRANSMUTE_COST * TRANSMUTE_COST; // 9

export interface GemHuntHUDProps {
  inventory: GemInventory;
  totalScore: number;
  tilesRemaining: number;
  turnIndex: number;
  diceBonusLabel?: string | null;
  labels: {
    crownsWon: string;
    score: string;
    bagRemaining: string;
    turn: string;
  };
}

function GemHuntHUDImpl({ inventory, totalScore, tilesRemaining, turnIndex, diceBonusLabel, labels }: GemHuntHUDProps) {
  const crowns = GEM_COLORS.map((c) => inventory[c][WIN_RARITY] >= 1);
  const wonCount = crowns.filter(Boolean).length;

  // Chip-equivalent progress toward each crown (9 chips = 1 crown via 3+3 transmutes).
  const progress = GEM_COLORS.map((c) => {
    if (inventory[c][WIN_RARITY] >= 1) return 1;
    const effective = inventory[c][1] + inventory[c][2] * TRANSMUTE_COST;
    return Math.min(1, effective / CHIPS_TO_CROWN);
  });

  return (
    <header className="rounded-neo border-neo-thick border-black bg-neo-navy-light px-2 py-1.5 shadow-hard">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5" aria-label={labels.crownsWon}>
          <Trophy className="h-3.5 w-3.5 text-neo-yellow" aria-hidden />
          <span className="font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-white">
            {labels.crownsWon}
          </span>
          <span className="font-neo-display text-base font-black tabular-nums text-neo-white">
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
        <div className="flex items-center gap-3 text-[10px] font-neo-display font-black uppercase tracking-wider text-neo-white">
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

      {diceBonusLabel ? (
        <div className="mt-1 flex items-center gap-1" aria-label={diceBonusLabel}>
          <span className="inline-flex items-center gap-1 rounded-neo border border-black bg-neo-purple px-1.5 py-0.5 font-neo-display text-[9px] font-black uppercase tracking-widest text-neo-white shadow-hard-sm">
            🎲 {diceBonusLabel}
          </span>
        </div>
      ) : null}

      {/* Per-gem crown progress bars — visual near-miss tension, aria-hidden */}
      <div className="mt-1.5 grid grid-cols-4 gap-1" aria-hidden>
        {GEM_COLORS.map((color, i) => {
          const pct = progress[i];
          const done = pct >= 1;
          return (
            <div
              key={color}
              className="h-1.5 overflow-hidden rounded-sm border border-black/30 bg-neo-navy"
            >
              <div
                className={cn(
                  'h-full rounded-sm transition-[width] duration-300',
                  GEM_PROGRESS_CLASS[color],
                  done && 'animate-pulse',
                )}
                style={{ width: `${Math.round(pct * 100)}%` }}
              />
            </div>
          );
        })}
      </div>
    </header>
  );
}

export const GemHuntHUD = memo(GemHuntHUDImpl);
