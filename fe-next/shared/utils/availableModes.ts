/**
 * Which multiplayer modes a player may pick, given their GAME language.
 *
 * Shiritori (しりとり) is a Japanese-native word-chain game; it is only offered to
 * players whose game language is Japanese. This is the single source of truth for
 * that gating — the lobby mode picker and any "modes available" UI must derive
 * from here so the rule can't drift. Spec: docs/2026-05-21-shiritori-mode-spec.md.
 */
import type { GameMode } from '../types/game';

/** Modes offered to every language. */
export const BASE_MP_MODES: GameMode[] = ['classic', 'word-hunt', 'wheel-rush'];

/** Shiritori is only meaningful (and only shown) for Japanese. */
export function isShiritoriAvailable(language: string | null | undefined): boolean {
  return language === 'ja';
}

/** Ordered list of pickable MP modes for the given game language. */
export function availableMpModes(language: string | null | undefined): GameMode[] {
  return isShiritoriAvailable(language) ? [...BASE_MP_MODES, 'shiritori'] : [...BASE_MP_MODES];
}
