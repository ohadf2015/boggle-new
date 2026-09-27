/**
 * Word Workshop opening board: the Baron plays a lesson word before the
 * student's first turn, so the first frame already has letters on it and the
 * student has something to build off.
 *
 * The opener is a lesson target OTHER than targets[0] (targets[0] is the word
 * dealt into the student's opening rack — see lib/word-craft/lessonBag). The
 * row and start column are picked so the dealt word can cross the opener
 * vertically on a shared letter, which guarantees a legal first move. Opener
 * tiles are unclaimed (neutral), so neither side starts with territory.
 *
 * A short second word (`branch`) then crosses the opener vertically so the
 * phone board opens with a little crossword, not one lonely row: a spare
 * lesson target first, else a stock short word verified against the shipped
 * dictionary (public/dicts). Its column stays 2+ away from the dealt word's
 * crossing, so the guaranteed first move stays legal and no accidental word
 * forms. Locales without verified stock words get no branch.
 */

import { getTileBag, type SupportedLocale } from '@/lib/word-craft/tileBag';
import type { BoardDims } from '@/lib/word-craft/boardDimensions';
import type { PlacedTile } from '@/lib/word-craft/types';

/** Short board + small bag for a 4-6 minute academy match. */
export const WORKSHOP_DIMS: BoardDims = { size: 7, bagSize: 36 };

export interface WorkshopOpener {
  /** The opener row (one horizontal word). */
  tiles: PlacedTile[];
  /** The second word's NEW tiles (the shared cell is the opener's own tile); [] = none. */
  branch: PlacedTile[];
  /** Every word pre-placed on the board: [opener, branch?]. */
  words: string[];
  /** Where the dealt word fits vertically across the opener (null = no shared letter). */
  cross: { col: number; startRow: number } | null;
}

interface Placement {
  row: number;
  startCol: number;
  cross: { col: number; startRow: number } | null;
  cost: number;
}

/** Short, common words checked against public/dicts/<locale>.dict.gz (2026-09-24). */
const STOCK_BRANCH_WORDS: Partial<Record<SupportedLocale, readonly string[]>> = {
  en: ['SUN', 'CAT', 'HAT', 'RED', 'OWL', 'ART', 'EAR', 'TEA', 'SEA', 'CAR', 'PEN', 'TEN', 'HEN', 'ONE', 'ICE', 'EGG', 'DOG', 'MAP', 'CUP', 'BOX', 'ZOO', 'SKY', 'OAK', 'JAM', 'ARM', 'BUS', 'FOX', 'LOG', 'NET', 'PIG', 'RUN', 'WEB', 'AIR', 'HOT', 'ANT', 'BEE', 'TOY', 'ROW'],
  es: ['SOL', 'MAR', 'PAN', 'OSO', 'LUZ', 'SAL', 'DOS', 'PIE', 'UNO', 'OLA', 'OJO', 'AVE', 'MES', 'RED', 'TREN', 'CASA'],
  sv: ['SOL', 'HUS', 'BIL', 'BOK', 'ORD', 'MUS', 'LEK', 'HAV', 'RIS', 'OST', 'TRE', 'SJÖ', 'ÖGA'],
};

function planBranch(
  opener: string[],
  place: Placement,
  candidates: readonly string[],
  size: number,
): { word: string[]; col: number; startRow: number; shared: number } | null {
  const centre = Math.floor(size / 2);
  for (const cand of candidates) {
    const word = [...cand];
    if (word.length < 2 || word.length > size) continue;
    let best: { col: number; startRow: number; shared: number; cost: number } | null = null;
    for (let i = 0; i < opener.length; i++) {
      const col = place.startCol + i;
      // Keep 2+ columns from the dealt word's crossing: no adjacency, no accidental words.
      if (place.cross && Math.abs(col - place.cross.col) < 2) continue;
      for (let j = 0; j < word.length; j++) {
        if (word[j] !== opener[i]) continue;
        const startRow = place.row - j;
        if (startRow < 0 || startRow + word.length > size) continue;
        const cost = Math.abs(startRow + (word.length - 1) / 2 - centre) - (place.cross ? Math.abs(col - place.cross.col) * 0.5 : 0) + i * 0.01;
        if (!best || cost < best.cost) best = { col, startRow, shared: j, cost };
      }
    }
    if (best) return { word, col: best.col, startRow: best.startRow, shared: best.shared };
  }
  return null;
}

function bestPlacement(opener: string[], dealt: string[] | null, size: number): Placement | null {
  if (opener.length > size) return null;
  const centre = Math.floor(size / 2);
  const centredCol = Math.floor((size - opener.length) / 2);
  let best: Placement | null = null;
  if (dealt && dealt.length <= size) {
    for (let i = 0; i < opener.length; i++) {
      for (let j = 0; j < dealt.length; j++) {
        if (opener[i] !== dealt[j]) continue;
        // Row r must leave j letters above and the rest below.
        for (let row = j; row <= size - dealt.length + j; row++) {
          for (let startCol = 0; startCol <= size - opener.length; startCol++) {
            const cost = Math.abs(row - centre) * 2 + Math.abs(startCol - centredCol) + Math.abs(startCol + i - centre) * 0.1;
            if (!best || cost < best.cost) best = { row, startCol, cross: { col: startCol + i, startRow: row - j }, cost };
          }
        }
      }
    }
  }
  return best ?? { row: centre, startCol: centredCol, cross: null, cost: 0 };
}

export function planWorkshopOpener(targets: readonly string[], size: number, locale: SupportedLocale): WorkshopOpener | null {
  if (targets.length === 0) return null;
  const dealt = [...targets[0]];
  const pool = targets.length > 1 ? targets.slice(1) : targets.slice(0, 1);
  let chosen: { word: string[]; place: Placement } | null = null;
  for (const t of pool) {
    const word = [...t];
    const place = bestPlacement(word, dealt, size);
    if (!place) continue;
    if (!chosen || (chosen.place.cross === null && place.cross !== null)) chosen = { word, place };
    if (chosen.place.cross) break;
  }
  if (!chosen) return null;
  const { values } = getTileBag(locale);
  const { word, place } = chosen;
  const openerWord = word.join('');
  const spare = pool.filter((w) => w !== openerWord && w !== targets[0]);
  const stock = (STOCK_BRANCH_WORDS[locale] ?? []).filter((w) => [...w].every((ch) => values[ch] !== undefined));
  const used = new Set([openerWord, targets[0]]);
  const branchPlan = planBranch(word, place, [...spare, ...stock].filter((w) => !used.has(w)), size);
  const branch: PlacedTile[] = branchPlan
    ? branchPlan.word.flatMap((letter, k) =>
        k === branchPlan.shared
          ? []
          : [{ row: branchPlan.startRow + k, col: branchPlan.col, letter, value: values[letter] ?? 1, isBlank: false, rackTileId: `opener-b${k}` }],
      )
    : [];
  return {
    words: branchPlan ? [openerWord, branchPlan.word.join('')] : [openerWord],
    branch,
    tiles: word.map((letter, k) => ({
      row: place.row,
      col: place.startCol + k,
      letter,
      value: values[letter] ?? 1,
      isBlank: false,
      rackTileId: `opener-${k}`,
    })),
    cross: place.cross,
  };
}
