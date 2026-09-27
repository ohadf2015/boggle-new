/**
 * Bot round start — the single entry point that launches a room's bots for
 * the current round, whatever the mode.
 *
 * The registry below maps a mode to the rules that genuinely differ (see
 * botEngine.ts for everything shared). Any mode without an entry — including
 * the beta grid modes — plays board words on the room grid, as before.
 */

import type { Server } from 'socket.io';
import type { LetterGrid, Language, GameMode } from '@/shared/types';
import type { GameState } from '../../modules/gameState/types';
import type { Bot } from '../../modules/botBehavior';
import { getGame } from '../../modules/gameStateManager';
import * as botManager from '../../modules/botManager';
import logger from '../../utils/logger';
import { markBotScoringStart } from './botScoreGate';
import type { BotRoundContext } from './botEngine';
import { startBoardWordBots } from './botClassic';
import { startBotsForBlast } from './botBlast';
import { startBotsForWheelRush } from './botWheelRush';
import { startBotsForWordHunt, wordHuntBoardRules } from './botWordHunt';

// Public surface kept at this path (handlers, gameEnd and tests import it here).
export {
  shouldBotScore,
  getBestHumanScore,
  markBotScoringStart,
  clearBotScoringStart,
  clearBotVariance,
  type BotScoreTuning,
} from './botScoreGate';
export { emitBotLeaderboard } from './botEngine';

type ModeBotStarter = (ctx: BotRoundContext, bots: Bot[], game: GameState, timerSeconds: number) => Promise<void> | null;

/** Per-mode bot starters. Returning null (mode state missing) falls back to board words. */
const MODE_BOT_STARTERS: Partial<Record<GameMode, ModeBotStarter>> = {
  blast: (ctx, bots, game, t) => game.blastModeState
    ? startBotsForBlast(ctx.io, ctx.gameCode, bots, game.blastModeState, ctx.language, t)
    : null,
  'wheel-rush': (ctx, bots, game, t) => game.wheelRushState
    ? startBotsForWheelRush(ctx.io, ctx.gameCode, bots, game.wheelRushState, ctx.language, t)
    : null,
  'word-hunt': (ctx, bots, game, t) => {
    const hunt = game.wordHuntState;
    if (!hunt) return null;
    return Promise.all([
      startBoardWordBots(ctx, bots, game.letterGrid, t, wordHuntBoardRules(hunt)),
      startBotsForWordHunt(ctx.io, ctx.gameCode, bots, hunt, ctx.language, t),
    ]).then(() => undefined);
  },
};

/**
 * Launch the room's bots for this round (fire-and-forget; bot setup is async).
 * Safe to call again mid-round (orphan-timer / restart recovery): each bot's
 * previous run is stopped, and words it already banked are not replayed.
 */
export function startBotsForGame(
  io: Server,
  gameCode: string,
  letterGrid: LetterGrid | null,
  language: Language,
  timerSeconds: number,
): void {
  // The registry must match the room roster: bots are in-memory only and are
  // lost on a restart, while their identity survives on game.users.
  restoreBotsForGame(gameCode);
  const bots: Bot[] = botManager.getGameBots(gameCode);
  const game = getGame(gameCode);
  if (bots.length === 0 || !game) return;

  markBotScoringStart(gameCode);
  const ctx: BotRoundContext = { io, gameCode, language, gameEndTime: Date.now() + timerSeconds * 1000 };
  const starter = game.gameMode ? MODE_BOT_STARTERS[game.gameMode as GameMode] : undefined;
  const run = starter?.(ctx, bots, game as GameState, timerSeconds)
    ?? startBoardWordBots(ctx, bots, letterGrid, timerSeconds);
  void run.catch((err: Error) => logger.error('BOT', `bot start failed for ${gameCode} (${game.gameMode}): ${err.message}`));
}

/**
 * Re-register bot AI instances from the room roster (game.users). Bots live
 * only in botManager's memory and are lost on a server restart; their identity
 * (username/id/avatar/difficulty) survives on the user entry. Returns the
 * number restored; no-op for bots already registered.
 */
export function restoreBotsForGame(gameCode: string): number {
  const game = getGame(gameCode);
  if (!game) return 0;
  let restored = 0;
  for (const [username, user] of Object.entries(game.users || {})) {
    const u = user as { isBot?: boolean; playerId?: string | null; avatar?: unknown; botDifficulty?: string };
    if (u?.isBot && botManager.restoreBotFromUser(gameCode, username, u, game.language || 'en')) {
      restored++;
    }
  }
  return restored;
}
