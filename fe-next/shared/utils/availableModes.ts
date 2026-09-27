/**
 * Which multiplayer modes a player may pick, given their GAME language.
 *
 * Single source of truth for language-gated mode availability — the lobby
 * mode picker and any "modes available" UI must derive from here so the rule
 * can't drift, the same way a prior JA-only mode used to be gated through
 * this module.
 */
import type { GameMode } from '../types/game';

/** Modes offered to every language. */
export const BASE_MP_MODES: GameMode[] = ['classic', 'word-hunt', 'wheel-rush'];

/** Ordered list of pickable MP modes for the given game language. */
export function availableMpModes(_language: string | null | undefined): GameMode[] {
  return [...BASE_MP_MODES];
}
