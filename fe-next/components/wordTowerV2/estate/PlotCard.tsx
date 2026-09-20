'use client';

import { motion } from 'framer-motion';
import { Crown, Hammer, Lock, Wrench } from 'lucide-react';
import type { Plot } from '@/lib/wordTowerV2/estate';
import { MAX_PLOT_LEVEL } from '@/lib/wordTowerV2/estateCatalog';
import { DAMAGE_OVERLAY, type PlotState, plotIdentity } from './estateArt';
import { PLOT_ICON_COMPONENTS } from './estateIcons';

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
 * The finished building as a cyan-lit hologram standing on the empty lot.
 *
 * Deliberately NOT a flat silhouette: at phone size a black blob of the
 * warehouse and a black blob of the boathouse look alike, and it is the fish
 * on the fish market and the stripes on the lighthouse that a player actually
 * recognises. So the real colours stay, cooled towards cyan with a glow that
 * says "plan, not building". The mask erases the bottom quarter — otherwise
 * the ghost's own base tile would double the real lot's edge.
 */
const GHOST_STYLE = {
  filter: 'saturate(0.55) brightness(1.15) drop-shadow(0 0 5px rgba(34,225,255,0.95)) drop-shadow(0 0 14px rgba(34,225,255,0.55))',
  WebkitMaskImage: 'linear-gradient(to top, transparent 11%, black 27%)',
  maskImage: 'linear-gradient(to top, transparent 11%, black 27%)',
} as const;

/** The four states a player must tell apart WITHOUT reading a number. */
const SPRITE_FX: Record<PlotState, string> = {
  // Not yet: drained of colour, so the lit plots pop out of the row.
  locked: 'saturate-[0.3] brightness-[0.72]',
  affordable: 'saturate-[1.15] drop-shadow-[0_0_10px_rgba(190,255,50,0.55)]',
  maxed: 'saturate-[1.1] drop-shadow-[0_0_10px_rgba(255,214,0,0.55)]',
  damaged: 'saturate-[0.8]',
};

/**
 * Borders: black reads as an edge only against a bright fill. The dark "not
 * yet" chips sit on a navy diorama, where a black border is invisible — those
 * two wear a cream one instead.
 */
const TAG_CLS: Record<PlotState, string> = {
  locked: 'border-neo-cream/70 bg-neo-navy-light text-neo-cream',
  affordable: 'border-black bg-neo-lime text-neo-navy',
  maxed: 'border-black bg-neo-yellow text-neo-navy',
  damaged: 'border-black bg-neo-red text-neo-navy',
};

const LEVEL_CLS: Record<PlotState, string> = {
  locked: 'border-neo-cream/70 bg-neo-navy text-neo-cream',
  affordable: 'border-black bg-neo-lime text-neo-navy',
  maxed: 'border-black bg-neo-yellow text-neo-navy',
  damaged: 'border-black bg-neo-red text-neo-navy',
};

/**
 * One plot in the diorama. Every plot must answer three questions at a glance,
 * on a phone and from a sofa: WHAT is it, HOW FAR along, and CAN I build it.
 *
 * - WHAT: the real stage sprite, plus a cyan ghost of the finished building on
 *   the empty lot (all fifteen `l0` sprites are the same grey slab) and the
 *   type's own icon on the name plate.
 * - HOW FAR: five pips AND an L0-L5 badge pinned to the lot.
 * - CAN I: three redundant channels — colour, icon, and a lime ground glow the
 *   locked plots do not have — so it survives colour-blindness and reduced
 *   motion, with a bob on top for anyone who gets motion.
 */
export function PlotCard({ t, district, plot, name, cost, affordable, repairCost, selected, building, size, reducedMotion, onSelect }: Props) {
  const maxed = plot.level >= MAX_PLOT_LEVEL;
  const id = plotIdentity({ district, slot: plot.slot, level: plot.level, damaged: plot.damaged, affordable });
  const TypeIcon = PLOT_ICON_COMPONENTS[id.icon];
  const tag =
    id.state === 'damaged'
      ? { icon: Wrench, text: repairCost === 0 ? t('wordTowerV2.estate.free') : repairCost.toLocaleString() }
      : id.state === 'maxed'
        ? { icon: Crown, text: t('wordTowerV2.estate.maxed') }
        : {
            // Affordable reads as "you can build this NOW": lime + hammer.
            // Locked keeps the coin price but wears a padlock beside it.
            icon: id.state === 'affordable' ? Hammer : Lock,
            text: cost === 0 ? t('wordTowerV2.estate.free') : cost.toLocaleString(),
          };
  const Icon = tag.icon;
  const lively = id.state === 'affordable' && !reducedMotion;

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
        <motion.span
          className="relative inline-flex items-end justify-center"
          animate={lively ? { y: [0, -5, 0] } : { y: 0 }}
          transition={lively ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
        >
          {/* Ground glow: the "build me" signal that reads from across a room. */}
          {id.state === 'affordable' ? (
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-[3%] left-1/2 h-[13%] w-[92%] -translate-x-1/2 rounded-[50%] bg-neo-lime opacity-70 blur-[7px]"
            />
          ) : null}

          {id.ghost ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={id.ghost}
              alt=""
              aria-hidden
              draggable={false}
              className={`${SPRITE_H[size]} pointer-events-none absolute bottom-0 left-1/2 w-auto -translate-x-1/2 select-none`}
              // A plot you cannot pay for dims as a whole — plan included.
              style={{ ...GHOST_STYLE, opacity: id.ghostOpacity * (id.state === 'locked' ? 0.78 : 1) }}
            />
          ) : null}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={id.sprite}
            alt=""
            aria-hidden
            draggable={false}
            className={`${SPRITE_H[size]} ${SPRITE_FX[id.state]} relative w-auto select-none drop-shadow-[3px_3px_0_rgba(0,0,0,0.55)] transition-transform ${selected ? 'scale-105' : ''}`}
          />

          {plot.damaged ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={DAMAGE_OVERLAY} alt="" aria-hidden className="pointer-events-none absolute bottom-0 h-[70%] w-auto" />
          ) : null}

          {/* Level pinned to the lot's corner: zero extra rows, so nothing
              scrolls, and it reads the same L0-L5 the panel above prints
              (Hebrew says ר0-ר5, so it has to come from t()). */}
          <span
            aria-hidden
            className={`absolute bottom-[1%] start-0 rounded-neo border-2 px-1 font-neo-display text-[10px] font-black leading-[1.35] tabular-nums shadow-hard-sm md:px-1.5 md:text-base ${LEVEL_CLS[id.state]}`}
          >
            {t('wordTowerV2.estate.level', { n: plot.level })}
          </span>
        </motion.span>
      </motion.div>

      <div className={`-mt-1 flex items-center gap-1 rounded-neo border-neo px-1.5 py-0.5 font-neo-display text-[11px] font-black shadow-hard-sm md:text-sm ${TAG_CLS[id.state]}`}>
        <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden />
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
        className={`mt-1 flex max-w-[7.5rem] items-center gap-1 rounded-neo border-neo border-black px-1.5 py-[1px] font-neo-display text-[11px] font-black shadow-hard-sm md:max-w-[16rem] md:gap-1.5 md:px-2 md:text-base ${selected ? 'bg-neo-lime text-neo-navy' : 'bg-neo-navy text-neo-cream'}`}
      >
        <TypeIcon className="h-3.5 w-3.5 shrink-0 md:h-5 md:w-5" aria-hidden />
        <span className="truncate">{name}</span>
      </span>
    </button>
  );
}
