import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';

/**
 * Letter-spacing for a block label. Pixi 8 only honours letterSpacing by drawing
 * each grapheme on its own, advancing LEFT TO RIGHT — so any spacing at all
 * renders a Hebrew or Arabic word backwards. RTL scripts get none.
 */
const RTL_SCRIPT = /[֐-ࣿיִ-﷿ﹰ-﻿]/;

export function labelTracking(text: string): number {
  return RTL_SCRIPT.test(text) ? 0 : 2;
}

/** What a slab shows: uppercase, and Hebrew's word-final letter in sofit form. */
export function blockLabel(word: string): string {
  return applyHebrewFinalLetters(word.toUpperCase());
}
