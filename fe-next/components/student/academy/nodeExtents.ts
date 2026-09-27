/**
 * The px box an island button occupies around its map point — what `fitArt`
 * must keep on screen and apart. Mirrors AcademyNodeButton's geometry: the
 * button is pulled up by 82% of its height (the art stands ON the island),
 * the boss is centred, and the recommended island wears a pointer above.
 *
 * `compact` sheds detail when the view is crowded, in this order:
 *   1 → drop the boss chip ("Master 0/4 words" — its ring already says 0/4)
 *   2 → shrink the recommended island
 *   3 → drop the pointer's tag word (keep the arrow)
 */

import type { IslandKind, IslandState } from './academyIslands';

export interface NodeLook {
  big: boolean;
  recommended: boolean;
  /** A tag word is available for the pointer. */
  tag: boolean;
  compact: number;
}

export const showBossChip = (compact: number) => compact < 1;
export const showTag = (compact: number) => compact < 3;

export function nodeSize(isBoss: boolean, look: NodeLook): number {
  if (isBoss) return look.big ? 132 : 78;
  if (look.recommended) {
    const small = look.compact >= 2;
    return look.big ? (small ? 164 : 196) : small ? 88 : 104;
  }
  return look.big ? 140 : 74;
}

/** Fredoka black averages ~0.62em per glyph. */
const GLYPH = 0.62;

export function nodeExtents(
  node: { kind: IslandKind; state: IslandState },
  label: string,
  chip: string | null,
  look: NodeLook,
  scale: number,
): { up: number; down: number; half: number } {
  const isBoss = node.kind === 'boss';
  const size = nodeSize(isBoss, look);
  const font = isBoss ? (look.big ? 14 : 11) : look.recommended ? (look.big ? 18 : 13) : look.big ? 14 : 11;
  const maxPlaque = isBoss ? Infinity : look.recommended ? (look.big ? 320 : 192) : look.big ? 256 : 160;
  let plaqueW = Math.min(maxPlaque, label.length * font * GLYPH + 20);
  if (isBoss && chip && showBossChip(look.compact)) plaqueW += chip.length * font * GLYPH + 18;
  const plaqueH = font * 1.25 + 8;
  const stars = node.state === 'done' ? (look.big ? 26 : 20) : 0;
  const height = stars + size + plaqueH - 4;

  let up: number;
  let down: number;
  if (isBoss) {
    up = height / 2 + 12;
    down = height / 2 + 4;
  } else {
    // Pointer height, plus the ~9px it bobs and the ~6px the island bobs.
    const pointer = look.recommended ? (look.tag && showTag(look.compact) ? (look.big ? 64 : 60) : look.big ? 44 : 36) + 16 : 0;
    up = 0.82 * height + pointer;
    down = 0.18 * height + 4;
  }
  const half = Math.max(size * 0.55, plaqueW / 2) + 4;
  return { up: up * scale, down: down * scale, half: half * scale };
}
