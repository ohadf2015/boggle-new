'use client';

import { Coins, Link, Dices, Feather, Bomb, Sparkles, Zap, type LucideIcon } from 'lucide-react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import type { BlastWaveModifier, BlastModifierId, BlastModifierColor } from './utils/blastModifiers';

/** Explicit icon map — keeps lucide tree-shakeable (no `import * as Icons`). */
const ICONS: Record<BlastModifierId, LucideIcon> = {
  goldRush: Coins,
  chainFrenzy: Link,
  doubleDown: Dices,
  featherfall: Feather,
  bombParty: Bomb,
  luckyVowels: Sparkles,
  megaCombo: Zap,
};

/**
 * Full Tailwind class strings per color family (no dynamic `bg-neo-${c}` —
 * Tailwind can't see interpolated names). Banner = solid party color on black
 * ink; chip = muted tint with a solid border.
 */
const BANNER_CLASSES: Record<BlastModifierColor, string> = {
  lime: 'bg-neo-lime text-neo-black',
  pink: 'bg-neo-pink text-neo-black',
  cyan: 'bg-neo-cyan text-neo-black',
  purple: 'bg-neo-purple text-neo-white',
  yellow: 'bg-neo-yellow text-neo-black',
  orange: 'bg-neo-orange text-neo-black',
};

const CHIP_CLASSES: Record<BlastModifierColor, string> = {
  lime: 'bg-neo-navy-light text-neo-lime border-neo-lime',
  pink: 'bg-neo-navy-light text-neo-pink border-neo-pink',
  cyan: 'bg-neo-navy-light text-neo-cyan border-neo-cyan',
  purple: 'bg-neo-navy-light text-neo-purple border-neo-purple',
  yellow: 'bg-neo-navy-light text-neo-yellow border-neo-yellow',
  orange: 'bg-neo-navy-light text-neo-orange border-neo-orange',
};

interface BlastModifierBadgeProps {
  modifier: BlastWaveModifier | null | undefined;
  variant: 'chip' | 'banner';
  // Accepts the app's `t` (string) and BlastStage's looser `t` (string | undefined);
  // missing keys fall back to the modifier id / empty string below.
  t: (key: string, params?: Record<string, string>) => string | undefined;
}

/**
 * Renders the active wave modifier as either a compact in-game `chip` or a
 * reveal `banner`. Returns null when there is no modifier (the common case on
 * wave 1 / un-rolled waves), so callers can render it unconditionally.
 */
export function BlastModifierBadge({ modifier, variant, t }: BlastModifierBadgeProps) {
  if (!modifier) return null;
  const Icon = ICONS[modifier.id];
  const name = t(`blast.modifier.${modifier.id}.name`) || modifier.id;

  if (variant === 'chip') {
    return (
      <AdaptiveMotion.div
        data-testid="blast-modifier-chip"
        initial={{ scale: 0.4, opacity: 0, y: -8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 0.2 }}
        className={`inline-flex items-center gap-1.5 rounded-neo border-neo px-2.5 py-1 font-neo-display text-xs font-black uppercase shadow-hard-sm ${CHIP_CLASSES[modifier.color]}`}
      >
        <Icon className="h-4 w-4" aria-hidden />
        <span className="tracking-wide">{name}</span>
      </AdaptiveMotion.div>
    );
  }

  const desc = t(`blast.modifier.${modifier.id}.desc`) || '';
  return (
    <AdaptiveMotion.div
      data-testid="blast-modifier-banner"
      initial={{ scale: 0.6, opacity: 0, rotate: -3 }}
      animate={{ scale: 1, opacity: 1, rotate: -1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 16, delay: 0.45 }}
      className={`flex flex-col items-center gap-1 rounded-neo border-neo-thick border-neo-black px-5 py-3 text-center shadow-hard-lg ${BANNER_CLASSES[modifier.color]}`}
    >
      <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] opacity-70">
        {t('blast.modifier.incoming') || 'Modifier'}
      </span>
      <span className="flex items-center gap-2 font-neo-display text-2xl font-black uppercase">
        <Icon className="h-6 w-6" aria-hidden />
        {name}
      </span>
      {desc && <span className="max-w-[28ch] text-sm font-bold leading-snug">{desc}</span>}
    </AdaptiveMotion.div>
  );
}
