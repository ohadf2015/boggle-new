'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PowerCard } from '@/lib/word-craft/run/powerCards';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { PowerCardView } from './PowerCardView';

interface CardPickScreenProps {
  cards: PowerCard[];
  activeCards?: PowerCard[];
  onPick: (cardId: string) => void;
}

export function CardPickScreen({ cards, activeCards = [], onPick }: CardPickScreenProps) {
  const { t } = useLanguage();

  useEffect(() => {
    trackGrowthEvent('wordcraft_card_pick_shown', { rarities: cards.map((c) => c.rarity) });
    // Fire once per mount (new card offer) — cards identity changes each pick round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePick = (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    trackGrowthEvent('wordcraft_card_picked', { cardId, rarity: card?.rarity ?? 'unknown' });
    onPick(cardId);
  };

  return (
    <section className="flex flex-col items-center gap-4 p-4">
      <h2 className="text-2xl font-neo-display text-neo-lime">{t('wordcraft.run.cardPick.title')}</h2>
      <p className="text-sm font-neo-body text-neo-white">{t('wordcraft.run.cardPick.subtitle')}</p>
      {activeCards.length > 0 && (
        <div className="flex w-full max-w-2xl flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-neo-white/60">
            {t('wordcraft.run.cardPick.yourBuild')}:
          </span>
          {activeCards.map((c) => (
            <span
              key={c.id}
              className="rounded-neo border-neo border-neo-cream/40 bg-neo-navy-light px-2 py-0.5 text-xs font-neo-body text-neo-cyan"
            >
              {t(`wordcraft.run.card.${c.id}.name`)}
            </span>
          ))}
        </div>
      )}
      <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <PowerCardView key={card.id} card={card} onSelect={handlePick} />
        ))}
      </div>
    </section>
  );
}
