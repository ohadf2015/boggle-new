import type { Locale, Tile, TileId } from '../types';
import { PROTO_DICT_EN } from './__protoDict';
import { PROTO_DICT_HE } from './__protoDictHe';
import { isComposableFromTiles } from './wordValidator';
import { findAdjacencyPathForWord } from './adjacency';

const SLATE_COLS = 4;

const MIN_BOT_WORD_LEN = 4;
const MAX_BOT_WORD_LEN = 6;

const cachedDictByLen: Partial<Record<Locale, Map<number, string[]>>> = {};

function getDictByLen(locale: Locale): Map<number, string[]> {
  const cached = cachedDictByLen[locale];
  if (cached) return cached;
  const dict = locale === 'he' ? PROTO_DICT_HE : PROTO_DICT_EN;
  const m = new Map<number, string[]>();
  for (const w of dict) {
    const len = w.length;
    if (len < MIN_BOT_WORD_LEN || len > MAX_BOT_WORD_LEN) continue;
    if (!m.has(len)) m.set(len, []);
    m.get(len)!.push(w);
  }
  cachedDictByLen[locale] = m;
  return m;
}

export interface BotPick {
  word: string;
  tileIds: TileId[];
  letterValueSum: number;
}

/**
 * Pick the longest valid word the bot can compose from currently-unclaimed tiles.
 * Returns null if no valid word ≥4 letters exists.
 */
export function pickBotWord(tiles: Tile[], locale: Locale = 'en'): BotPick | null {
  const free = tiles.filter((t) => !t.claimedBy);
  const byLen = getDictByLen(locale);

  for (let len = MAX_BOT_WORD_LEN; len >= MIN_BOT_WORD_LEN; len--) {
    const candidates = byLen.get(len) ?? [];
    for (const word of candidates) {
      if (!isComposableFromTiles(word, free)) continue;
      // Bot must respect adjacency on the slate (parity with player)
      const tileIds = findAdjacencyPathForWord(word, tiles, SLATE_COLS);
      if (!tileIds) continue;
      const letterValueSum = tileIds.reduce((acc, id) => {
        const t = tiles.find((tt) => tt.id === id);
        return acc + (t?.letterValue ?? 0);
      }, 0);
      return { word, tileIds, letterValueSum };
    }
  }

  return null;
}

/** Greedy selection: for each letter in word, claim the first matching unused tile. */
function pickTileIdsForWord(word: string, free: Tile[]): TileId[] | null {
  const used = new Set<TileId>();
  const result: TileId[] = [];
  for (const letter of word.toUpperCase()) {
    const match = free.find((t) => !used.has(t.id) && t.letter.toUpperCase() === letter);
    if (!match) return null;
    used.add(match.id);
    result.push(match.id);
  }
  return result;
}

/** Reset the cache (test helper). */
export function __resetBotDictCache() {
  delete cachedDictByLen.en;
  delete cachedDictByLen.he;
}
