import type { BlastLevel, CellId } from '../types';
import type { LocaleConfig } from '../locale-config';
import { detectAllCascades } from './cascade';

/**
 * Which board cells to briefly pulse as a "cascade available" telegraph.
 *
 * Collapse games live on anticipation: when a clear collapses the board and a
 * NEW theme word becomes formable, a short pulse on those tiles tells the player
 * "something opened up here" without naming the word (the puzzle stays a puzzle).
 *
 * Only fires when the last move actually triggered a cascade (`chainDepth > 0`)
 * so it reads as a reaction to the player's clear, not a permanent answer-glow.
 * Returns the first still-formable theme word's cells, or [] when there's
 * nothing new to surface.
 */
export function selectCascadeTelegraph(
  level: BlastLevel,
  foundWords: Set<string>,
  config: LocaleConfig,
  chainDepth: number,
): CellId[] {
  if (chainDepth <= 0) return [];
  const cascades = detectAllCascades(level, foundWords, config);
  return cascades[0]?.cells ?? [];
}
