'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { Board } from '@/lib/word-craft/board';
import type { PlacedTile } from '@/lib/word-craft/types';

interface Props {
  board: Board;
  placements: readonly PlacedTile[];
  diceBonus?: { letters: Set<string>; multiplier: number } | null;
}

// Conquest preview: how much TERRITORY the pending word will claim if
// submitted — one cell per tile placed. Color escalates with the size of the
// land grab so a big sweep reads bolder than a single tile.
function tintForCells(cells: number): string {
  if (cells >= 5) return 'bg-neo-yellow text-neo-navy';
  if (cells >= 4) return 'bg-neo-orange text-neo-navy';
  if (cells >= 3) return 'bg-neo-purple text-neo-white';
  if (cells >= 2) return 'bg-neo-cyan text-neo-navy';
  return 'bg-neo-cream text-neo-navy';
}

export function WordCraftScorePreviewBadge({ board: _board, placements, diceBonus }: Props) {
  const { t } = useLanguage();
  const cells = placements.length;
  if (cells < 1) return null;

  const bonusFires =
    diceBonus != null &&
    placements.some((p) => diceBonus.letters.has(p.letter.toUpperCase()));

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 z-30 flex flex-col items-center gap-1"
    >
      <div
        className={`rounded-neo border-neo-thick px-3 py-1 font-neo-display text-base font-black shadow-hard ${tintForCells(cells)}`}
      >
        {t('wordcraft.territory.claimPreview', { count: cells })}
      </div>
      {bonusFires ? (
        <div
          aria-hidden
          className="rounded-neo border border-black bg-neo-purple px-1.5 py-0.5 font-neo-display text-[9px] font-black uppercase tracking-widest text-neo-white shadow-hard-sm"
        >
          🎲 ×{diceBonus.multiplier}
        </div>
      ) : null}
    </div>
  );
}
