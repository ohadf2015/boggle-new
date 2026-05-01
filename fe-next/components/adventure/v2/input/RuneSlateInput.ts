import type { Tile, TileId } from '@/lib/adventure/v2/types';

interface Bridge {
  destroy: () => void;
}

interface Handlers {
  onLetterKey: (letter: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
}

export function attachKeyboardBridge(handlers: Handlers): Bridge {
  function onKeyDown(e: KeyboardEvent) {
    // Ignore when typing in form inputs (just in case)
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      handlers.onEnter();
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      handlers.onBackspace();
      return;
    }
    if (/^[a-zA-Z]$/.test(e.key)) {
      handlers.onLetterKey(e.key.toUpperCase());
    }
  }
  window.addEventListener('keydown', onKeyDown);
  return {
    destroy: () => window.removeEventListener('keydown', onKeyDown),
  };
}

export function findTileByLetter(
  tiles: Tile[],
  usedIds: TileId[],
  letter: string,
): TileId | null {
  const usedSet = new Set(usedIds);
  for (const t of tiles) {
    if (!usedSet.has(t.id) && t.letter.toUpperCase() === letter.toUpperCase()) {
      return t.id;
    }
  }
  return null;
}
