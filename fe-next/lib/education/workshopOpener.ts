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
 */

import { getTileBag, type SupportedLocale } from '@/lib/word-craft/tileBag';
import type { BoardDims } from '@/lib/word-craft/boardDimensions';
import type { PlacedTile } from '@/lib/word-craft/types';

/** Short board + small bag for a 4-6 minute academy match. */
export const WORKSHOP_DIMS: BoardDims = { size: 7, bagSize: 36 };

export interface WorkshopOpener {
  tiles: PlacedTile[];
  /** Where the dealt word fits vertically across the opener (null = no shared letter). */
  cross: { col: number; startRow: number } | null;
}

interface Placement {
  row: number;
  startCol: number;
  cross: { col: number; startRow: number } | null;
  cost: number;
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
  return {
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
