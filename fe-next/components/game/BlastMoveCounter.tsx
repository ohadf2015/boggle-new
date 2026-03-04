/**
 * BlastMoveCounter
 * Shows move count with optional bonus move indicator for blast multiplayer.
 */

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface BlastMoveCounterProps {
  movesUsed: number;
  bonusMove?: boolean;
}

export function BlastMoveCounter({ movesUsed, bonusMove }: BlastMoveCounterProps) {
  const { t } = useLanguage();

  return (
    <div
      data-testid="blast-move-counter"
      className="flex items-center gap-2 px-3 py-1 rounded-neo border-neo border-black bg-neo-navy text-neo-white"
    >
      <span className="text-sm font-neo-body font-medium">
        {t('blast.multiplayer.moves')}
      </span>
      <span className="text-lg font-neo-display font-bold">
        {movesUsed}
      </span>
      {bonusMove && (
        <span className="text-xs font-neo-body text-neo-yellow animate-neo-pop">
          {t('blast.multiplayer.bonusMove')}
        </span>
      )}
    </div>
  );
}
