'use client';
import { useMemo, useState } from 'react';
import { generateLetters } from '@/lib/word-vault/grid/letterSource';
import { applyFrozen } from '@/lib/word-vault/grid/modifiers/frozen';
import type { TileState, VaultGridConfig } from '@/lib/word-vault/grid/types';
import { GridTile } from './GridTile';

type Props = {
  config: VaultGridConfig;
  onSubmit: (word: string) => void;
};

export function VaultGrid({ config, onSubmit }: Props) {
  const initialTiles: TileState[] = useMemo(() => {
    const letters = generateLetters(config);
    let tiles: TileState[] = letters.map((letter, index) => ({
      index, letter, frozen: false, selected: false,
    }));
    (config.modifiers ?? []).forEach((m) => {
      if (m.kind === 'frozen') tiles = applyFrozen(tiles, m);
    });
    return tiles;
  }, [config]);

  const [tiles, setTiles] = useState<TileState[]>(initialTiles);
  const [selected, setSelected] = useState<number[]>([]);

  const handleTap = (index: number) => {
    if (tiles[index].frozen) return;
    if (selected.includes(index)) return;
    setSelected((s) => [...s, index]);
    setTiles((t) =>
      t.map((tile) => (tile.index === index ? { ...tile, selected: true } : tile)),
    );
  };

  const clear = () => {
    setSelected([]);
    setTiles((t) => t.map((tile) => ({ ...tile, selected: false })));
  };

  const submit = () => {
    if (selected.length === 0) return;
    const word = selected.map((i) => tiles[i].letter).join('');
    onSubmit(word);
    clear();
  };

  return (
    <div className="rounded-lg bg-stone-900/90 p-4">
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${config.size}, minmax(0, 1fr))` }}
      >
        {tiles.map((tile) => (
          <GridTile key={tile.index} tile={tile} onTap={handleTap} />
        ))}
      </div>
      <div className="mt-3 flex justify-between gap-2">
        <button
          type="button"
          aria-label="vault-clear"
          onClick={clear}
          className="rounded px-3 py-1 bg-stone-700 text-stone-200"
        >
          נקה
        </button>
        <div className="text-xl font-bold tracking-widest text-yellow-200">
          {selected.map((i) => tiles[i].letter).join('')}
        </div>
        <button
          type="button"
          aria-label="vault-submit"
          onClick={submit}
          className="rounded px-3 py-1 bg-yellow-500 text-stone-900 font-bold"
        >
          אשר
        </button>
      </div>
    </div>
  );
}
