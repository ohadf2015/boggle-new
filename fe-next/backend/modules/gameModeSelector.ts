/**
 * Game Mode Selector
 * Selects the next game mode with weighted random distribution
 * and no-repeat logic for multiplayer mode rotation.
 */

import type { GameMode } from '@/shared/types/game';

export const ALL_GAME_MODES: GameMode[] = ['classic', 'blast', 'word-hunt', 'wheel-rush'];

export const GAME_MODE_WEIGHTS: Record<GameMode, number> = {
  'classic': 0.35,
  'blast': 0.25,
  'word-hunt': 0.25,
  'wheel-rush': 0.15,
  // Word Tower is admin-gated + has its own versus flow — never auto-rotated.
  'word-tower': 0,
  // Shiritori is JA-only + turn-based; not part of the generic mode rotation.
  'shiritori': 0,
};

/**
 * Select the next game mode using weighted random selection.
 * Avoids repeating the last played mode (unless it's the only option).
 */
export function selectNextGameMode(
  history: GameMode[],
  enabledModes: GameMode[]
): GameMode {
  if (enabledModes.length === 0) return 'classic';
  if (enabledModes.length === 1) return enabledModes[0];

  const lastMode = history.length > 0 ? history[history.length - 1] : null;

  // Filter out the last played mode to avoid repetition
  let candidates = enabledModes.filter(mode => mode !== lastMode);
  if (candidates.length === 0) {
    // All enabled modes were filtered — fall back to all enabled
    candidates = enabledModes;
  }

  // Build weighted selection from candidates
  const weights = candidates.map(mode => GAME_MODE_WEIGHTS[mode] ?? 0.3);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  let random = Math.random() * totalWeight;
  for (let i = 0; i < candidates.length; i++) {
    random -= weights[i];
    if (random <= 0) return candidates[i];
  }

  // Fallback (shouldn't reach here due to floating point)
  return candidates[candidates.length - 1];
}
