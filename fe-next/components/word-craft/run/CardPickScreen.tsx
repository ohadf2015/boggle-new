'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PowerCard } from '@/lib/word-craft/run/powerCards';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { PowerCardView } from './PowerCardView';

interface CardPickScreenProps {
  cards: PowerCard[];
  onPick: (cardId: string) => void;
}

export function CardPickScreen({ cards, onPick }: CardPickScreenProps) {
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
      <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <PowerCardView key={card.id} card={card} onSelect={handlePick} />
        ))}
      </div>
    </section>
  );
}
