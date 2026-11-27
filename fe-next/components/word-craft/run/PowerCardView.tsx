'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { PowerCard } from '@/lib/word-craft/run/powerCards';

const RARITY_BORDER: Record<PowerCard['rarity'], string> = {
  common: 'border-neo-cyan',
  rare: 'border-neo-purple',
  legendary: 'border-neo-yellow',
};

// Filled rarity chip — bg + navy ink reads at a glance, unlike a faint label.
// Exported so the run-result recap can reuse the same rarity colors.
export const RARITY_CHIP: Record<PowerCard['rarity'], string> = {
  common: 'bg-neo-cyan text-neo-navy',
  rare: 'bg-neo-purple text-neo-white',
  legendary: 'bg-neo-yellow text-neo-navy',
};

interface PowerCardViewProps {
  card: PowerCard;
  onSelect?: (cardId: string) => void;
  selected?: boolean;
  /** Position in the draw (0-based) — staggers the wc-rise reveal so a 3-card pack deals in one at a time instead of popping together. */
  revealIndex?: number;
}

export function PowerCardView({ card, onSelect, selected = false, revealIndex }: PowerCardViewProps) {
  const { t } = useLanguage();
  const inner = (
    <>
      <span
        className={`self-start rounded-neo border-neo border-black px-2 py-0.5 text-[10px] font-neo-display font-black uppercase tracking-wider ${RARITY_CHIP[card.rarity]}`}
      >
        {t(`wordcraft.run.rarity.${card.rarity}`)}
      </span>
      <span className="text-lg font-neo-display text-neo-white">
        {t(`wordcraft.run.card.${card.id}.name`)}
      </span>
      <span className="text-sm font-neo-body text-neo-white/90">
        {t(`wordcraft.run.card.${card.id}.desc`)}
      </span>
    </>
  );

  // Legendary cards pulse so a rare drop reads as a genuine moment, not a coin flip.
  const legendaryAccent =
    card.rarity === 'legendary' ? 'ring-2 ring-neo-yellow/40 animate-pulse motion-reduce:animate-none' : '';
  const className = `flex flex-col gap-2 rounded-neo border-neo-thick ${RARITY_BORDER[card.rarity]} ${legendaryAccent} bg-neo-navy-light p-4 text-left ${
    selected ? 'shadow-hard-lg' : 'shadow-hard'
  }`;

  if (!onSelect) {
    return <div className={className}>{inner}</div>;
  }
  return (
    <button
      type="button"
      className={`${className} wc-rise transition-transform duration-150 hover:-translate-y-1 active:translate-y-0`}
      style={{ '--wc-delay': `${(revealIndex ?? 0) * 70}ms` } as React.CSSProperties}
      onClick={() => onSelect(card.id)}
    >
      {inner}
    </button>
  );
}
