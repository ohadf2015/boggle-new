'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { PowerCard } from '@/lib/word-craft/run/powerCards';

const RARITY_BORDER: Record<PowerCard['rarity'], string> = {
  common: 'border-neo-cyan',
  rare: 'border-neo-purple',
  legendary: 'border-neo-yellow',
};

interface PowerCardViewProps {
  card: PowerCard;
  onSelect?: (cardId: string) => void;
  selected?: boolean;
}

export function PowerCardView({ card, onSelect, selected = false }: PowerCardViewProps) {
  const { t } = useLanguage();
  const inner = (
    <>
      <span className="text-xs font-neo-body uppercase tracking-wide opacity-70">
        {t(`wordcraft.run.rarity.${card.rarity}`)}
      </span>
      <span className="text-lg font-neo-display text-neo-white">
        {t(`wordcraft.run.card.${card.id}.name`)}
      </span>
      <span className="text-sm font-neo-body text-neo-white">
        {t(`wordcraft.run.card.${card.id}.desc`)}
      </span>
    </>
  );

  const className = `flex flex-col gap-2 rounded-neo border-neo-thick ${RARITY_BORDER[card.rarity]} bg-neo-navy-light p-4 text-left ${
    selected ? 'shadow-hard-lg' : 'shadow-hard'
  }`;

  if (!onSelect) {
    return <div className={className}>{inner}</div>;
  }
  return (
    <button type="button" className={`${className} animate-neo-press`} onClick={() => onSelect(card.id)}>
      {inner}
    </button>
  );
}
