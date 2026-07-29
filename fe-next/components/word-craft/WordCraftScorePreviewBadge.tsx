'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { previewScore } from '@/lib/word-craft/celebration/scorePreview';
import type { Board } from '@/lib/word-craft/board';
import type { PlacedTile } from '@/lib/word-craft/types';
import type { CommitTier } from '@/lib/word-craft/celebration/commitTier';

interface Props {
  board: Board;
  placements: readonly PlacedTile[];
}

const TIER_CLASS: Record<CommitTier, string> = {
  soft: 'bg-neo-cream text-neo-navy',
  nice: 'bg-neo-cyan text-neo-navy',
  great: 'bg-neo-purple text-neo-white',
  huge: 'bg-neo-orange text-neo-navy',
  bingo: 'bg-neo-yellow text-neo-navy',
};

export function WordCraftScorePreviewBadge({ board, placements }: Props) {
  const { t } = useLanguage();
  const preview = useMemo(() => previewScore(board, placements), [board, placements]);
  if (!preview) return null;

  const tint = TIER_CLASS[preview.tier];

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 z-30"
    >
      <div
        className={`rounded-neo border-neo-thick px-3 py-1 font-neo-display text-base font-black shadow-hard ${tint}`}
      >
        +{preview.score}
        {preview.bingoReady ? (
          <span className="ml-2 font-black uppercase">{t('wordcraft.scorePreview.bingoReady')}</span>
        ) : null}
      </div>
    </div>
  );
}
