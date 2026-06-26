'use client';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAllCards } from '@/lib/blast/v2/tutorial/mechanic-cards';
import type { MechanicKey } from '@/lib/blast/v2/tutorial/unlocks-seen';

type Props = {
  onReplayFtue?: () => void;
  onReplayMechanic?: (key: MechanicKey) => void;
};

export function BlastTutorialReplaySection({ onReplayFtue, onReplayMechanic }: Props) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const cards = getAllCards();

  return (
    <div className="border-neo-thick border-black rounded-neo p-4 space-y-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left font-bold flex justify-between items-center"
      >
        <span>{t('blast.settings.tutorials', 'Replay Tutorials')}</span>
        <span className="text-xs">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-black pt-3">
          <button
            type="button"
            onClick={onReplayFtue}
            className="w-full text-left text-sm px-3 py-2 hover:bg-white/10 rounded transition-colors"
          >
            {t('blast.tutorial.ftue.label', 'Level 1 FTUE')}
          </button>
          {cards.map((card) => (
            <button
              type="button"
              key={card.key}
              onClick={() => onReplayMechanic?.(card.key)}
              className="w-full text-left text-sm px-3 py-2 hover:bg-white/10 rounded transition-colors"
            >
              {card.iconAsset} {t(card.titleKey, `NEW: ${card.key}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
