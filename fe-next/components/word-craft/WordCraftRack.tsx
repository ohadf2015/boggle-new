'use client';

import { memo } from 'react';
import type { RackTile } from '@/lib/word-craft/types';
import { cn } from '@/lib/utils';

export interface WordCraftRackProps {
  tiles: RackTile[];
  selectedId: string | null;
  pendingIds: Set<string>;
  onSelect: (id: string | null) => void;
  disabled?: boolean;
  ariaLabel: string;
}

function WordCraftRackImpl({
  tiles,
  selectedId,
  pendingIds,
  onSelect,
  disabled,
  ariaLabel,
}: WordCraftRackProps) {
  return (
    <div role="toolbar" aria-label={ariaLabel} className="flex gap-2 justify-center flex-wrap p-3 bg-neo-navy-light border-neo border-black rounded-neo shadow-hard">
      {tiles.map((tile) => {
        const isPending = pendingIds.has(tile.id);
        const isSelected = selectedId === tile.id;
        return (
          <button
            key={tile.id}
            type="button"
            disabled={disabled || isPending}
            aria-pressed={isSelected}
            onClick={() => onSelect(isSelected ? null : tile.id)}
            className={cn(
              'relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center',
              'rounded-neo border-neo border-black font-neo-display font-bold text-xl sm:text-2xl',
              'transition-transform',
              isPending
                ? 'opacity-30 bg-neo-cream/50 text-neo-navy cursor-not-allowed'
                : isSelected
                  ? 'bg-neo-lime text-neo-navy shadow-hard-pressed translate-y-px'
                  : 'bg-neo-cream text-neo-navy shadow-hard hover:-translate-y-px',
            )}
          >
            <span>{tile.letter === '_' ? '·' : tile.letter}</span>
            <span className="absolute bottom-0.5 right-1 text-[10px] opacity-70 font-normal">
              {tile.value}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export const WordCraftRack = memo(WordCraftRackImpl);
