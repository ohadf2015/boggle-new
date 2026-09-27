'use client';

import type { WordCraftModifier } from '@/lib/word-craft/modifiers';

type TFn = (path: string, fallback?: string) => string;

/**
 * A small, always-on chip that names the active per-game modifier so the
 * "randomness factor" is VISIBLE — the old modifiers changed scoring silently,
 * which players couldn't feel. Renders nothing for the no-op baseline. land_grab
 * (chain-capture) is the marquee Conquest twist, so it gets the loudest tone.
 */
const PRESENTATION: Record<Exclude<WordCraftModifier, 'none'>, { emoji: string; label: string; note: string; tone: string }> = {
  land_grab: {
    emoji: '⚡',
    label: 'Land Grab',
    note: 'Captures spread to neighbours',
    tone: 'bg-neo-lime text-neo-navy',
  },
  bingo_bonanza: {
    emoji: '🎯',
    label: 'Bingo Bonanza',
    note: 'Bigger 7-tile bonus',
    tone: 'bg-neo-cyan text-neo-navy',
  },
  long_words: {
    emoji: '📏',
    label: 'Long Words',
    note: 'Bonus for 5+ letters',
    tone: 'bg-neo-purple text-white',
  },
  rich_letters: {
    emoji: '💎',
    label: 'Rich Letters',
    note: 'Rare tiles score double',
    tone: 'bg-neo-pink text-white',
  },
  quick_draw: {
    emoji: '⚡',
    label: 'Quick Draw',
    note: '5-tile rack — faster turns',
    tone: 'bg-neo-cyan text-neo-navy',
  },
  golden_tiles: {
    emoji: '✦',
    label: 'Golden Tiles',
    note: '✦ tiles capture their ring',
    // Gold = celebration semantic; correct for the golden twist.
    tone: 'bg-neo-yellow text-neo-navy',
  },
};

export function WordCraftModifierChip({ modifier, t }: { modifier: WordCraftModifier; t: TFn }) {
  if (modifier === 'none') return null;
  const p = PRESENTATION[modifier];
  if (!p) return null;

  const label = t(`wordcraft.modifier.${modifier}`, p.label);
  const note = t(`wordcraft.modifier.desc.${modifier}`, p.note);

  return (
    <div
      role="status"
      data-wc-modifier={modifier}
      className="self-center inline-flex items-center gap-2 px-2.5 py-1 rounded-neo border-neo-thick border-black bg-neo-navy-light shadow-hard-sm shrink-0"
    >
      <span
        aria-hidden
        className={`inline-flex items-center justify-center w-5 h-5 rounded-neo border-2 border-black text-[11px] leading-none ${p.tone}`}
      >
        {p.emoji}
      </span>
      <span className="text-[11px] font-neo-display font-black uppercase tracking-wider text-neo-white">
        {label}
      </span>
      <span className="hidden sm:inline text-[10px] font-neo-body text-neo-white/65">{note}</span>
    </div>
  );
}
