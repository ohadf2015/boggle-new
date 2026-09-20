'use client';

/**
 * One relic in the rail: a framed icon with a numeral baked on.
 *
 * Round-1 chips were flat 20px squares with nothing written on them, so the
 * judge could not tell two relics apart, let alone read what they do. This chip
 * is at least 32px (see `relicSlot`), carries its rarity as a solid frame
 * colour, and always prints a number — live payout this run when it has one,
 * otherwise the relic's standing effect. It flashes and holds a bright ring the
 * moment a word triggers it — the bonus itself is announced by
 * `RelicFireCallout`, which NAMES the relic. A 30px tag stuck on the icon was
 * the round-3 gap, not the fix for it.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { RELICS, type RelicId } from '@/lib/adventure/play/relics';
import { RARITY_FRAME, relicArt } from './art';
import { relicBadge } from './relicBadge';
import { cn } from '@/lib/utils';

interface Props {
  id: RelicId;
  /** Points this relic has contributed so far, if it is a scoring relic. */
  contrib?: number;
  firing: boolean;
  /** Bumps on every trigger so the flash replays rather than sticking. */
  fireKey?: number;
  open: boolean;
  onToggle: () => void;
  innerRef?: (el: HTMLButtonElement | null) => void;
}

export default function RelicChip({ id, contrib, firing, fireKey = 0, open, onToggle, innerRef }: Props) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  const frame = RARITY_FRAME[RELICS[id]?.rarity ?? 'common'];
  const badge = relicBadge(id, contrib);
  const name = t(`adventurePlay.relic.${id}`);

  return (
    <span className="relative block">
      <motion.button
        key={firing ? `${id}-${fireKey}` : id}
        ref={innerRef}
        type="button"
        data-relic={id}
        data-firing={firing || undefined}
        onClick={onToggle}
        aria-label={name}
        title={`${name} · ${badge.text}`}
        aria-expanded={open}
        initial={false}
        animate={firing && !reduce ? { scale: [1, 1.35, 0.95, 1], rotate: [0, -8, 6, 0] } : { scale: 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className={cn(
          'relative grid aspect-square w-full place-items-center rounded-lg border-[3px] border-black p-px shadow-[2px_2px_0_#000]',
          frame.bg,
          open && 'ring-[3px] ring-neo-cream',
        )}
        style={firing ? { boxShadow: `0 0 0 3px #000, 0 0 18px 6px ${frame.glow}` } : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- small static art */}
        <img src={relicArt(id)} alt="" draggable={false}
          className="h-full w-full object-contain drop-shadow-[1px_1px_0_rgba(0,0,0,0.65)]" />
      </motion.button>

      {/* The numeral, baked onto the chip's bottom edge — never absent, so no chip is anonymous. */}
      <motion.span
        key={`${badge.tone}-${badge.text}`}
        data-testid={badge.tone === 'points' ? `relic-contrib-${id}` : `relic-tag-${id}`}
        role="img"
        aria-label={badge.tone === 'points'
          ? t('adventurePlay.loot.contribAria', { name, n: contrib ?? 0 })
          : `${name} ${badge.text}`}
        dir="ltr"
        initial={reduce || badge.tone !== 'points' ? false : { scale: 1.7 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={cn(
          'pointer-events-none absolute -bottom-1.5 start-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded border-2 border-black px-0.5 font-neo-display text-[10px] font-black leading-none tabular-nums text-black rtl:translate-x-1/2 lg:text-xs',
          badge.tone === 'points' ? 'bg-neo-lime' : 'bg-neo-cream',
        )}
      >
        {badge.text}
      </motion.span>

    </span>
  );
}
