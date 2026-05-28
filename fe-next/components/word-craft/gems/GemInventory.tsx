'use client';

import { memo, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import {
  GEM_COLORS,
  TRANSMUTE_COST,
  type GemColor,
  type GemInventory as GemInventoryT,
  type GemRarity,
} from '@/lib/word-craft/gems/types';
import { canTransmute } from '@/lib/word-craft/gems/gemHuntRules';
import { GemIcon } from './GemIcon';
import { cn } from '@/lib/utils';

export interface GemInventoryProps {
  inventory: GemInventoryT;
  onTransmute: (color: GemColor, rarity: GemRarity) => void;
  labels: {
    title: string;
    transmuteCta: string;
    transmuteAria: string;
    crownGoal: string;
  };
}

function GemInventoryImpl({ inventory, onTransmute, labels }: GemInventoryProps) {
  // Per-color last-known counts so we can bounce the chip when collected.
  const lastCountsRef = useRef<Record<string, number>>({});
  useEffect(() => {
    for (const color of GEM_COLORS) {
      for (const rarity of [1, 2, 3] as GemRarity[]) {
        const key = `${color}-${rarity}`;
        const cur = inventory[color][rarity];
        const prev = lastCountsRef.current[key] ?? 0;
        if (cur > prev) {
          const el = document.querySelector<HTMLElement>(`[data-inv-cell="${key}"]`);
          if (el) {
            gsap.fromTo(
              el,
              { scale: 1 },
              { scale: 1.25, duration: 0.18, ease: 'back.out(2)', yoyo: true, repeat: 1 },
            );
          }
        }
        lastCountsRef.current[key] = cur;
      }
    }
  }, [inventory]);

  return (
    <section
      aria-label={labels.title}
      className="rounded-neo border-neo-thick border-black bg-neo-navy-light/95 p-2 shadow-hard"
    >
      <header className="mb-1.5 flex items-center justify-between px-0.5">
        <h2 className="font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-white">
          {labels.title}
        </h2>
        <span className="font-neo-body text-[9px] uppercase tracking-wider text-neo-white">
          {labels.crownGoal}
        </span>
      </header>
      <div className="grid grid-cols-4 gap-1.5">
        {GEM_COLORS.map((color) => (
          <div
            key={color}
            data-inv-col={color}
            className="flex flex-col items-center gap-1 rounded-neo border border-black/30 bg-neo-navy/70 p-1.5"
          >
            {([3, 2, 1] as GemRarity[]).map((rarity) => {
              const count = inventory[color][rarity];
              const transmuteable = canTransmute(inventory, color, rarity);
              const key = `${color}-${rarity}`;
              return (
                <button
                  key={rarity}
                  type="button"
                  data-inv-cell={key}
                  onClick={() => transmuteable && onTransmute(color, rarity)}
                  disabled={!transmuteable}
                  aria-label={
                    transmuteable
                      ? labels.transmuteAria
                      : `${color} ${rarity}`
                  }
                  className={cn(
                    'group relative flex w-full items-center justify-between gap-1 rounded border border-black/30 px-1 py-0.5',
                    count > 0 ? 'bg-neo-navy-light' : 'bg-neo-navy/40 opacity-50',
                    transmuteable && 'cursor-pointer ring-2 ring-neo-yellow/80 animate-pulse',
                    !transmuteable && 'cursor-default',
                  )}
                >
                  <GemIcon color={color} rarity={rarity} sizePx={rarity === 3 ? 16 : rarity === 2 ? 14 : 12} />
                  <span
                    className={cn(
                      'font-neo-display text-[10px] font-black tabular-nums',
                      count > 0 ? 'text-neo-white' : 'text-neo-white',
                    )}
                  >
                    {count}
                  </span>
                  {transmuteable ? (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -top-1 -end-1 rounded-full bg-neo-yellow px-1 py-0.5 text-[7px] font-black uppercase tracking-wider text-neo-navy"
                    >
                      ↑{TRANSMUTE_COST}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

export const GemInventory = memo(GemInventoryImpl);
