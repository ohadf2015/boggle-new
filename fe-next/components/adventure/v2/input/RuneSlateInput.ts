import type { Tile, TileId } from '@/lib/adventure/v2/types';
import { isTypingTarget } from '@/lib/dom/isTypingTarget';

interface Bridge {
  destroy: () => void;
}

interface Handlers {
  onLetterKey: (letter: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
}

const HE_FINAL_TO_BASE: Record<string, string> = {
  'ך': 'כ',
  'ם': 'מ',
  'ן': 'נ',
  'ף': 'פ',
  'ץ': 'צ',
};

const HE_LETTER_RE = /^[א-ת]$/; // base + final Hebrew letters

export function attachKeyboardBridge(handlers: Handlers): Bridge {
  function onKeyDown(e: KeyboardEvent) {
    if (isTypingTarget(e)) return;

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
      return;
    }
    if (HE_LETTER_RE.test(e.key)) {
      const normalized = HE_FINAL_TO_BASE[e.key] ?? e.key;
      handlers.onLetterKey(normalized);
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
    if (t.claimedBy) continue;
    if (!usedSet.has(t.id) && t.letter.toUpperCase() === letter.toUpperCase()) {
      return t.id;
    }
  }
  return null;
}
