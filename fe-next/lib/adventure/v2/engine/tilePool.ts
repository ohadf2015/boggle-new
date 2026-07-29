import type { Tile, TileId, Locale } from '../types';

type FreqRow = [string, number, number, Tile['rarity']];

export const EN_FREQUENCY: FreqRow[] = [
  ['E', 12, 1, 'common'], ['A', 9, 1, 'common'], ['I', 9, 1, 'common'],
  ['O', 8, 1, 'common'], ['N', 7, 1, 'common'], ['R', 7, 1, 'common'],
  ['T', 7, 1, 'common'], ['L', 5, 1, 'common'], ['S', 5, 1, 'common'],
  ['U', 5, 1, 'common'], ['D', 4, 2, 'common'], ['G', 4, 2, 'common'],
  ['B', 3, 3, 'uncommon'], ['C', 3, 3, 'uncommon'], ['M', 3, 3, 'uncommon'],
  ['P', 3, 3, 'uncommon'], ['F', 2, 4, 'uncommon'], ['H', 2, 4, 'uncommon'],
  ['V', 2, 4, 'uncommon'], ['W', 2, 4, 'uncommon'], ['Y', 2, 4, 'uncommon'],
  ['K', 1, 5, 'uncommon'], ['J', 1, 8, 'rare'],
  ['X', 1, 8, 'rare'], ['Q', 1, 10, 'rare'], ['Z', 1, 10, 'rare'],
];

// Hebrew letter frequency (rough, base-form only — finals normalized at dict load).
export const HE_FREQUENCY: FreqRow[] = [
  ['י', 11, 1, 'common'], ['ו', 10, 1, 'common'], ['א', 9, 1, 'common'],
  ['ה', 9, 1, 'common'], ['ר', 8, 1, 'common'], ['מ', 7, 1, 'common'],
  ['ת', 6, 1, 'common'], ['ל', 6, 1, 'common'], ['נ', 5, 2, 'common'],
  ['ב', 4, 2, 'common'], ['ש', 4, 2, 'common'], ['ד', 3, 2, 'common'],
  ['כ', 3, 3, 'uncommon'], ['ע', 3, 3, 'uncommon'], ['ח', 2, 3, 'uncommon'],
  ['פ', 2, 3, 'uncommon'], ['ק', 2, 4, 'uncommon'], ['ס', 2, 4, 'uncommon'],
  ['ג', 2, 4, 'uncommon'], ['ז', 1, 6, 'rare'], ['ט', 1, 6, 'rare'],
  ['צ', 1, 6, 'rare'],
];

const FREQ_BY_LOCALE: Record<Locale, FreqRow[]> = {
  en: EN_FREQUENCY,
  he: HE_FREQUENCY,
};

function pickWeighted(freq: FreqRow[], rng: () => number): FreqRow {
  const total = freq.reduce((acc, [, w]) => acc + w, 0);
  const r = rng() * total;
  let acc = 0;
  for (const row of freq) {
    acc += row[1];
    if (r <= acc) return row;
  }
  return freq[freq.length - 1];
}

export function drawTiles(count: number, locale: Locale, rng: () => number = Math.random): Tile[] {
  const freq = FREQ_BY_LOCALE[locale];
  const tiles: Tile[] = [];
  for (let id = 0; id < count; id++) {
    const [letter, , letterValue, rarity] = pickWeighted(freq, rng);
    tiles.push({ id: id as TileId, letter, letterValue, rarity });
  }
  return tiles;
}

export function refillTiles(
  existing: Tile[],
  usedIds: TileId[],
  locale: Locale,
  rng: () => number = Math.random,
): Tile[] {
  const next = [...existing];
  const freq = FREQ_BY_LOCALE[locale];
  for (const id of usedIds) {
    const [letter, , letterValue, rarity] = pickWeighted(freq, rng);
    next[id] = { id, letter, letterValue, rarity };
  }
  return next;
}
