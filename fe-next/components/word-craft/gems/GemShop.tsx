'use client';

import { memo, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Sparkles, ArrowLeftRight, Wand2, RotateCcw } from 'lucide-react';
import type { AbilityCard, AbilityKind, GemInventory } from '@/lib/word-craft/gems/types';
import { GemIcon } from './GemIcon';
import { cn } from '@/lib/utils';

const ABILITY_ICON: Record<AbilityKind, typeof Sparkles> = {
  portal: ArrowLeftRight,
  joker: Wand2,
  reroll: RotateCcw,
};

export interface GemShopProps {
  shop: AbilityCard[];
  inventory: GemInventory;
  pendingAbilities: AbilityCard[];
  onBuy: (card: AbilityCard) => void;
  onReroll: (rerollCard: AbilityCard) => void;
  labels: {
    title: string;
    cost: string;
    insufficient: string;
    purchased: string;
    abilityName: Record<AbilityKind, string>;
    abilityDesc: Record<AbilityKind, string>;
  };
}

function GemShopImpl({ shop, inventory, pendingAbilities, onBuy, onReroll, labels }: GemShopProps) {
  // Stagger card deal-in when shop rotates.
  const wrapRef = useRef<HTMLDivElement>(null);
  const shopKey = shop.map((c) => c.id).join('|');
  useEffect(() => {
    const cards = wrapRef.current?.querySelectorAll<HTMLElement>('[data-shop-card]');
    if (!cards || cards.length === 0) return;
    gsap.fromTo(
      cards,
      { y: 18, opacity: 0, rotateX: 65 },
      { y: 0, opacity: 1, rotateX: 0, duration: 0.32, ease: 'back.out(1.7)', stagger: 0.06 },
    );
  }, [shopKey]);

  return (
    <section aria-label={labels.title} className="rounded-neo border-neo-thick border-black bg-neo-navy/95 p-2 shadow-hard">
      <header className="mb-1.5 flex items-center justify-between px-0.5">
        <h2 className="inline-flex items-center gap-1 font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-white">
          <Sparkles className="h-3 w-3 text-neo-yellow" aria-hidden />
          {labels.title}
        </h2>
        {pendingAbilities.length > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-black bg-neo-lime px-2 py-0.5 text-[9px] font-black uppercase text-neo-navy">
            {labels.purchased} · {pendingAbilities.length}
          </span>
        ) : null}
      </header>
      <div
        ref={wrapRef}
        className="grid grid-cols-3 gap-1.5"
        style={{ perspective: '600px' }}
      >
        {shop.map((card) => {
          const Icon = ABILITY_ICON[card.kind];
          const affordable = inventory[card.cost.color][card.cost.rarity] >= 1;
          const isReroll = card.kind === 'reroll';
          return (
            <button
              key={card.id}
              type="button"
              data-shop-card={card.id}
              data-affordable={affordable ? 'true' : 'false'}
              onClick={() => {
                if (!affordable) return;
                if (isReroll) onReroll(card); else onBuy(card);
              }}
              disabled={!affordable}
              aria-label={`${labels.abilityName[card.kind]} — ${labels.abilityDesc[card.kind]}`}
              className={cn(
                'group relative flex h-full flex-col gap-1 rounded-neo border-2 border-black bg-neo-navy-light p-1.5 text-start shadow-hard transition-transform',
                'will-change-transform',
                affordable && 'cursor-pointer hover:-translate-y-0.5 hover:rotate-[-1deg] active:translate-y-0',
                !affordable && 'cursor-not-allowed opacity-50',
              )}
            >
              <span className="inline-flex items-center gap-1">
                <Icon className="h-3.5 w-3.5 text-neo-cyan" aria-hidden />
                <span className="font-neo-display text-[11px] font-black uppercase tracking-wider text-neo-white">
                  {labels.abilityName[card.kind]}
                </span>
              </span>
              <span className="font-neo-body text-[9px] leading-tight text-neo-white">
                {labels.abilityDesc[card.kind]}
              </span>
              <span className="mt-auto inline-flex items-center justify-between gap-1 rounded border border-black/40 bg-neo-navy/80 px-1 py-0.5">
                <span className="font-neo-body text-[8px] uppercase tracking-wider text-neo-white">
                  {labels.cost}
                </span>
                <GemIcon color={card.cost.color} rarity={card.cost.rarity} sizePx={12} />
              </span>
              {!affordable ? (
                <span className="pointer-events-none absolute inset-x-1 bottom-1 rounded bg-neo-red/85 px-1 text-center font-neo-display text-[7px] font-black uppercase tracking-widest text-neo-white">
                  {labels.insufficient}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export const GemShop = memo(GemShopImpl);
