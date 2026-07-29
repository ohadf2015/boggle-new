'use client';
import { memo } from 'react';
import type { TileState } from '@/lib/word-vault/grid/types';

type Props = {
  tile: TileState;
  onTap: (index: number) => void;
};

export const GridTile = memo(function GridTile({ tile, onTap }: Props) {
  const disabled = tile.frozen;
  return (
    <button
      type="button"
      role="button"
      aria-label={`vault-tile-${tile.index}`}
      onClick={() => !disabled && onTap(tile.index)}
      data-frozen={tile.frozen}
      data-selected={tile.selected}
      className={[
        'aspect-square w-full text-2xl font-bold rounded-md border-2 transition',
        tile.selected ? 'border-yellow-400 bg-yellow-200/30' : 'border-stone-600 bg-stone-800',
        tile.frozen ? 'opacity-60 cursor-not-allowed bg-cyan-900/40' : 'hover:bg-stone-700',
      ].join(' ')}
      disabled={disabled}
    >
      {tile.letter}
    </button>
  );
});
