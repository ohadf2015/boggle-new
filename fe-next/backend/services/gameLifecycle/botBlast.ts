/**
 * Blast bot rules.
 *
 * What is specific to Blast: each bot plays its OWN independent board (per-player
 * boards — a bot's clears never reach a human's board), that board mutates after
 * every word, so the bot re-solves it every turn; a word is priced with the tile
 * + letter bonuses of the tiles on its path; playing it cascades the bot's board
 * (and regenerates it when exhausted); and a soft anti-grief cap limits clears
 * per minute. Scheduling, gating and crediting are the shared bot engine.
 */

import type { Server } from 'socket.io';
import type { Language, BlastModeState } from '@/shared/types/game';
import type { Bot } from '../../modules/botBehavior';
import { getGame } from '../../modules/gameStateManager';
import {
  getTilesOnPath,
  recordBlastMove,
  getWordPath,
  getOrInitPlayerBoard,
  cascadeBlastWord,
} from '../../modules/blastModeManager';
import { regenerateBlastBoardIfExhausted } from '../../modules/blastBoardRegen';
import { findAllWords, getCachedTrie } from '../../modules/boggleSolver';
import { BOT_CONFIG } from '../../modules/botConfig';
import { makePositionsMap } from '../../modules/wordValidator';
import { getBotClearWindow } from '../../modules/botRoundState';
import { scoreAcceptedWord } from '../../modules/wordScore';
import { ensureLanguageLoaded } from '../../dictionary';
import logger from '../../utils/logger';
import {
  activateBot,
  playBotWord,
  runWordBot,
  type BotPlayRules,
  type BotRoundContext,
} from './botEngine';

/** Anti-grief: max board-clearing words per bot per minute (soft — the turn is skipped). */
const MAX_CLEARS_PER_MINUTE: Record<string, number> = { easy: 15, medium: 25, hard: 40 };

function canBotClear(gameCode: string, bot: Bot): boolean {
  const cap = MAX_CLEARS_PER_MINUTE[bot.difficulty] ?? MAX_CLEARS_PER_MINUTE.medium;
  return getBotClearWindow(gameCode, bot.username).count < cap;
}

/** Every word currently on this bot's own board (lowercase, as the solver returns). */
function solveBotBoard(state: BlastModeState, bot: Bot, language: Language): string[] {
  const board = getOrInitPlayerBoard(state, bot.username);
  const trie = getCachedTrie(language);
  if (!board.grid || !trie) return [];
  return findAllWords(board.grid, language, { minLength: 3, maxLength: 8, maxWords: 5000, trie });
}

function blastRules(state: BlastModeState): BotPlayRules {
  return {
    quote(ctx: BotRoundContext, bot: Bot, word: string) {
      const board = getOrInitPlayerBoard(state, bot.username);
      if (!board.grid || !board.tileStates) return null;
      // The board may have cascaded since the word was picked — play only what is on it NOW.
      if (!solveBotBoard(state, bot, ctx.language).includes(word.toLowerCase())) return null;

      const positions = makePositionsMap(board.grid, ctx.language);
      const tilesOnPath = getTilesOnPath(word, positions, board.overlay, board.overlayMap);
      const scored = scoreAcceptedWord({ word, comboLevel: bot.comboLevel || 0, blastTiles: tilesOnPath });
      return {
        wordScore: scored.total,
        commit: () => {
          const gemCount = tilesOnPath.filter((t) => t === 'gem').length;
          recordBlastMove(state, bot.username, bot.comboLevel || 0, word, tilesOnPath.length, gemCount, scored.blastTileBonus);
          // Mutate the bot's OWN board. No broadcast: no client renders a bot's board.
          const { clearedCount } = cascadeBlastWord(board, getWordPath(word, positions), word, state.wave ?? 1, ctx.language);
          const game = getGame(ctx.gameCode);
          if (game) {
            regenerateBlastBoardIfExhausted({
              io: ctx.io, gameCode: ctx.gameCode, game, username: bot.username, board, newTileStates: board.tileStates,
            });
          }
          if (clearedCount > 0) getBotClearWindow(ctx.gameCode, bot.username).count += 1;
        },
      };
    },
  };
}

/**
 * Play one word for a blast bot on its own board (validated against the board
 * as it is now). `_currentGrid` is kept for call-site compatibility — the bot's
 * own board is always the source of truth.
 */
export function submitBlastWord(
  io: Server,
  gameCode: string,
  bot: Bot,
  state: BlastModeState,
  word: string,
  _currentGrid: string[][] | null,
  language: Language,
): number | false {
  const ctx: BotRoundContext = { io, gameCode, language, gameEndTime: Number.POSITIVE_INFINITY };
  try {
    return playBotWord(ctx, bot, blastRules(state), word);
  } catch (err) {
    logger.error('BOT_BLAST', `Bot "${bot.username}" submission failed: ${(err as Error).message}`);
    return false;
  }
}

/** Start blast bots: each re-solves its own board every turn. */
export async function startBotsForBlast(
  io: Server,
  gameCode: string,
  bots: Bot[],
  blastState: BlastModeState,
  language: Language,
  timerSeconds: number,
): Promise<void> {
  if (!bots || bots.length === 0) return;
  if (!blastState?.grid || !Array.isArray(blastState.grid) || blastState.grid.length === 0) {
    logger.error('BOT_BLAST', `Cannot start bots for ${gameCode}: invalid blast grid`);
    return;
  }
  // Recovery paths relaunch bots without the start handler's dictionary load.
  await ensureLanguageLoaded(language);
  if (!getCachedTrie(language)) {
    logger.warn('BOT_BLAST', `No trie for ${language}, skipping blast bots`);
    return;
  }

  const ctx: BotRoundContext = { io, gameCode, language, gameEndTime: Date.now() + timerSeconds * 1000 };
  const rules = blastRules(blastState);
  logger.info('BOT_BLAST', `Starting ${bots.length} bots for blast game ${gameCode} (${language})`);
  for (const bot of bots) {
    const timing = BOT_CONFIG.TIMING[bot.difficulty] || BOT_CONFIG.TIMING.medium;
    const between = () => timing.minDelay + Math.random() * (timing.maxDelay - timing.minDelay);
    activateBot(bot);
    runWordBot(ctx, bot, rules, {
      firstDelay: () => timing.startDelay + Math.random() * 1500,
      nextDelay: between,
      pick: () => {
        if (!canBotClear(gameCode, bot)) return null; // anti-grief: sit this turn out
        const words = solveBotBoard(blastState, bot, language).filter((w) => !bot.wordsFound.includes(w));
        return words.length > 0 ? words[Math.floor(Math.random() * words.length)] : null;
      },
    });
  }
}
