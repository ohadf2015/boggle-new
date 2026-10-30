import { calculateComboChainWindow } from '@/shared/utils/comboUtils';

/** Highest combo level that still adds score; the streak itself keeps counting (combo achievements need 25/30). */
export const SERVER_COMBO_SCORING_CAP = 15;

/** A blizzard halves how fast a streak decays, so the chain window doubles while tiles are frozen. */
export const BLIZZARD_COMBO_DECAY_MULTIPLIER = 0.5;

const lastComboWordAt = new WeakMap<object, Record<string, number>>();

interface ComboGame {
  gameMode?: string | null;
  playerCombos?: Record<string, number>;
  activeRoundEvent?: string | null;
}

/**
 * Advance a player's server combo for an accepted word. Classic mirrors the
 * client HUD: the streak lapses after the same chain window, and the level
 * that scores is capped. Other modes keep their existing combo rules.
 */
export function advanceServerCombo(game: ComboGame, username: string, now: number = Date.now()): { scoringLevel: number } {
  if (!game.playerCombos) game.playerCombos = {};
  const stored = game.playerCombos[username] || 0;
  const isClassic = !game.gameMode || game.gameMode === 'classic';
  if (!isClassic) {
    game.playerCombos[username] = stored + 1;
    return { scoringLevel: stored };
  }

  let times = lastComboWordAt.get(game);
  if (!times) {
    times = {};
    lastComboWordAt.set(game, times);
  }
  const last = times[username];
  const decay = game.activeRoundEvent === 'blizzard' ? BLIZZARD_COMBO_DECAY_MULTIPLIER : 1;
  const lapsed = last !== undefined && now - last >= calculateComboChainWindow(stored) / decay;
  const level = lapsed ? 0 : stored;
  times[username] = now;
  game.playerCombos[username] = level + 1;
  return { scoringLevel: Math.min(level, SERVER_COMBO_SCORING_CAP) };
}
