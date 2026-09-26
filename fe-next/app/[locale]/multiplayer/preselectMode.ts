import type { GameMode, GameModeSelection } from '@/shared/types/game';

export const VALID_MODES: GameMode[] = ['classic', 'blast', 'word-hunt', 'wheel-rush'];

/**
 * Apply a `?mode=` deep-link to the game-mode store. Writes BOTH fields:
 * `gameMode` (resolved gameplay mode) AND `hostSelectedGameMode` (host intent —
 * the field the host `startGame` emit reads). Writing only `gameMode` left the
 * intent at 'random', so deep-linked modes (Word Hunt / Wheel Rush cards) were
 * silently rolled away by the backend. The else-branch deliberately does NOT
 * reset `hostSelectedGameMode` — it persists host intent across rounds.
 */
export function applyMpPreselectMode(
  rawMode: GameMode | null,
  actions: {
    setGameMode: (m: GameModeSelection) => void;
    setHostSelectedGameMode: (m: GameModeSelection) => void;
  },
): void {
  if (rawMode && VALID_MODES.includes(rawMode)) {
    actions.setGameMode(rawMode);
    actions.setHostSelectedGameMode(rawMode);
  } else {
    actions.setGameMode('random');
  }
}
