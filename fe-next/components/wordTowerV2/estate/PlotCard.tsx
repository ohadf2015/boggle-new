'use client';

import { motion } from 'framer-motion';
import { Coins, Hammer, Wrench } from 'lucide-react';
import type { Plot } from '@/lib/wordTowerV2/estate';
import { MAX_PLOT_LEVEL } from '@/lib/wordTowerV2/estateCatalog';
import { DAMAGE_OVERLAY, buildingSprite } from './estateArt';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  district: number;
  plot: Plot;
  name: string;
  /** Coins for the next level (0 = free: a blueprint pays). */
  cost: number;
  affordable: boolean;
  repairCost: number;
  selected: boolean;
  building: boolean;
  /** Depth in the diorama: the back row is drawn smaller than the front one. */
  size: 'back' | 'front' | 'wide';
  reducedMotion: boolean;
  onSelect: () => void;
}

const SPRITE_H: Record<Props['size'], string> = {
  back: 'h-[clamp(90px,13vh,160px)]',
  front: 'h-[clamp(112px,17vh,200px)]',
  wide: 'h-[clamp(150px,28vh,340px)]',
};

/**
 * One plot in the diorama: the building at its stage, five level pips, and the
 * price of its next level. Affordable plots glow — Coin Master's "something is
 * always one tap away" read.
 */
export function PlotCard({ t, district, plot, name, cost, affordable, repairCost, selected, building, size, reducedMotion, onSelect }: Props) {
  const maxed = plot.level >= MAX_PLOT_LEVEL;
  const sprite = buildingSprite(district, plot.slot, plot.level);
  const tag = plot.damaged
    ? { cls: 'bg-neo-red', icon: Wrench, text: repairCost === 0 ? t('wordTowerV2.estate.free') : repairCost.toLocaleString() }
    : maxed
      ? { cls: 'bg-neo-yellow', icon: null, text: t('wordTowerV2.estate.maxed') }
      : {
          // Affordable reads as "you can build this NOW": lime tag, hammer.
          cls: affordable ? 'bg-neo-lime' : 'bg-neo-cream',
          icon: affordable ? Hammer : Coins,
          text: cost === 0 ? t('wordTowerV2.estate.free') : cost.toLocaleString(),
        };
  const Icon = tag.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${name} ${t('wordTowerV2.estate.level', { n: plot.level })}`}
      className="group relative flex w-full flex-col items-center justify-end focus:outline-none"
    >
      <motion.div
        className="relative flex w-full items-end justify-center"
        animate={building && !reducedMotion ? { scale: [0.72, 1.12, 1], y: [10, -6, 0] } : { scale: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sprite}
          alt=""
          aria-hidden
          draggable={false}
          className={`${SPRITE_H[size]} w-auto select-none drop-shadow-[3px_3px_0_rgba(0,0,0,0.55)] transition-transform ${selected ? 'scale-105' : ''}`}
        />
        {plot.damaged ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={DAMAGE_OVERLAY} alt="" aria-hidden className="pointer-events-none absolute bottom-0 h-[70%] w-auto" />
        ) : null}
      </motion.div>

      <div className={`-mt-1 flex items-center gap-1 rounded-neo border-neo border-black px-1.5 py-0.5 font-neo-display text-[11px] font-black text-neo-navy shadow-hard-sm md:text-sm ${tag.cls}`}>
        {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
        <span className="tabular-nums">{tag.text}</span>
      </div>

      <div className="mt-1 flex gap-[3px]" aria-hidden>
        {Array.from({ length: MAX_PLOT_LEVEL }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 w-3 rounded-[2px] border-2 border-black md:w-5 ${i < plot.level ? (maxed ? 'bg-neo-yellow' : 'bg-neo-cyan') : 'bg-neo-navy-light'}`}
          />
        ))}
      </div>
      <span
        className={`mt-1 max-w-[7.5rem] truncate rounded-neo border-neo border-black px-1.5 py-[1px] font-neo-display text-[11px] font-black shadow-hard-sm md:max-w-[16rem] md:px-2 md:text-base ${selected ? 'bg-neo-lime text-neo-navy' : 'bg-neo-navy text-neo-cream'}`}
      >
        {name}
      </span>
    </button>
  );
}
