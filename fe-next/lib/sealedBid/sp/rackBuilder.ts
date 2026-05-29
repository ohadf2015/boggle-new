/**
 * Pure helpers for the tile-choosing bid UI. The player builds a word by tapping
 * rack tiles; we track the chosen tile INDICES (not letters) so duplicate letters
 * stay distinct. The engine works entirely in base-letter form — Hebrew sofit
 * (final) letters are applied only at the display layer via `toDisplay`.
 */
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';

/** Resolve chosen tile indices to a word string, in pick order. */
export function wordFromChosen(rack: string, chosen: number[]): string {
  let out = '';
  for (const i of chosen) {
    const ch = rack[i];
    if (ch !== undefined) out += ch;
  }
  return out;
}

/** Display form of a built word: Hebrew gets its trailing letter as a sofit; a
 *  no-op for any word that needs no final-letter conversion (incl. English). */
export function toDisplay(word: string): string {
  return applyHebrewFinalLetters(word);
}
