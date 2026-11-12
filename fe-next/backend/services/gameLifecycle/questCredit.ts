/**
 * Weekly-quest and daily-mission crediting at multiplayer game end, plus the
 * follow-up level-up announcement when their XP takes a player past the level
 * the game XP already announced.
 */

import type { Server } from 'socket.io';
import type { WordDetail } from '@/shared/types';
import type { GameState } from '../../modules/gameState/types';
import type { UserAuthInfo } from '../../modules/supabase/client';
import type { PushLocale } from '../../utils/pushTranslations';
import { notifyLevelUp } from '../../modules/pushNotificationTriggers';
import { updateQuestProgress } from '../../modules/weeklyQuestManager';
import { completeDailyQuestsForResult } from '../../modules/dailyMissionsManager';
import { levelUpOf, mergeLevelUps, type LevelUp } from '../../modules/xpGrant';
import { emptyQuestResult } from '@/shared/dailyQuestPool';
import type { GameStats } from '@/shared/weeklyQuestTemplates';
import { getSocketById, safeEmit } from '../../utils/socketHelpers';
import logger from '../../utils/logger';
import type { PlayerResult, UserData } from './types';

interface GameXpInfo {
  oldLevel?: number;
  newLevel?: number;
  leveledUp?: boolean;
}

export interface QuestCreditContext {
  io: Server;
  game: GameState;
  scoresArray: PlayerResult[];
  humanScores: PlayerResult[];
  userAuthMap: Record<string, UserAuthInfo>;
  gameMode: string;
  xpResults?: Record<string, GameXpInfo>;
  localeMap: Map<string, PushLocale>;
}

/** Weekly quests are awaited (the caller already waits on them); daily missions run in the background. */
export async function creditQuestsForPlayers(ctx: QuestCreditContext): Promise<void> {
  const weeklyLevelUps = await updateWeeklyQuestProgressForPlayers(ctx);
  creditDailyQuestsForPlayers(ctx, weeklyLevelUps);
}

async function updateWeeklyQuestProgressForPlayers(ctx: QuestCreditContext): Promise<Map<string, LevelUp | null>> {
  const { scoresArray, game, userAuthMap, io } = ctx;
  const levelUps = new Map<string, LevelUp | null>();
  const winner = [...scoresArray].sort((a, b) => b.totalScore - a.totalScore)[0]?.username;

  const ops = scoresArray.map(async (player) => {
    const authInfo = userAuthMap[player.username];
    if (!authInfo?.authUserId) return;

    const playerMaxCombo = (player.wordDetails ?? []).reduce((max, w) => Math.max(max, w.comboLevel ?? 0), 0);
    const wordsCount = player.wordDetails?.length ?? 0;
    const stats: GameStats = {
      gamesPlayed: 1,
      wordsFound: wordsCount,
      wordsInSession: wordsCount,
      longWordsFound: player.wordDetails?.filter((w) => (w.word?.length ?? 0) >= 6).length ?? 0,
      maxCombo: playerMaxCombo,
      maxScore: player.totalScore ?? 0,
      multiplayerWins: winner === player.username ? 1 : 0,
    };

    try {
      const questResult = await updateQuestProgress(authInfo.authUserId, stats);
      levelUps.set(player.username, levelUpOf(questResult?.xpGrant));
      if (questResult?.completed && io) {
        const userData = game.users?.[player.username];
        if (userData?.socketId) {
          io.to(userData.socketId).emit('weeklyQuestCompleted', {
            questType: questResult.questType,
            xpReward: questResult.xpReward,
            description: questResult.description,
          });
        }
      }
    } catch (err) {
      logger.error('WEEKLY_QUEST', `Failed to update quest for ${player.username}: ${err}`);
    }
  });

  await Promise.all(ops);
  return levelUps;
}

/**
 * A game with >=2 humans is a genuine multiplayer session (the honest signal for
 * PvP quests — no single-vs-bots false credit). Same-language is guaranteed by matchmaking.
 */
function creditDailyQuestsForPlayers(ctx: QuestCreditContext, weeklyLevelUps: Map<string, LevelUp | null>): void {
  const { humanScores, game, gameMode } = ctx;
  const topHumanScore = Math.max(0, ...humanScores.map((p) => p.totalScore || 0));
  const humanCount = humanScores.length;

  for (const p of humanScores) {
    const authUserId = (game.users?.[p.username] as UserData | undefined)?.authUserId;
    if (!authUserId) continue;
    const playerScore = p.totalScore || 0;
    const details = p.wordDetails ?? [];
    const result = emptyQuestResult({
      mode: gameMode,
      isMultiplayer: humanCount >= 2,
      score: playerScore,
      longestWordLength: details.reduce((m: number, w: WordDetail) => Math.max(m, w.word?.length || 0), 0),
      maxCombo: details.reduce((m: number, w: WordDetail) => Math.max(m, w.comboLevel ?? 0), 0),
      wordsFound: details.length,
      humanOpponentCount: humanCount - 1,
      isTopHuman: humanCount >= 1 && playerScore === topHumanScore,
      beatHumanOpponent: humanScores.some((o) => o.username !== p.username && (o.totalScore || 0) < playerScore),
    });
    void completeDailyQuestsForResult(authUserId, result)
      .then((grant) => grant?.levelUp ?? null, () => null)
      .then((daily) => announceQuestLevelUp(ctx, p.username, authUserId, mergeLevelUps(weeklyLevelUps.get(p.username), daily)));
  }
}

function announceQuestLevelUp(ctx: QuestCreditContext, username: string, authUserId: string, quest: LevelUp | null): void {
  if (!quest) return;
  const gameXp = ctx.xpResults?.[username];
  const gameLevelUp =
    gameXp?.leveledUp && gameXp.oldLevel != null && gameXp.newLevel != null
      ? { oldLevel: gameXp.oldLevel, newLevel: gameXp.newLevel }
      : null;
  const announcedThrough = gameLevelUp?.newLevel ?? 0;
  const merged = mergeLevelUps(gameLevelUp, quest)!;
  if (merged.newLevel <= announcedThrough) return;

  const socketId = (ctx.game.users?.[username] as UserData | undefined)?.socketId;
  const socket = socketId ? getSocketById(ctx.io, socketId) : null;
  if (socket) {
    safeEmit(socket, 'levelUp', {
      oldLevel: merged.oldLevel,
      newLevel: merged.newLevel,
      levelsGained: merged.newLevel - merged.oldLevel,
      newTitles: [],
    });
  }
  logger.info('XP', `Quest XP levelUp for ${username}: ${merged.oldLevel} -> ${merged.newLevel}`);
  void notifyLevelUp(authUserId, merged.newLevel, ctx.localeMap.get(authUserId) ?? 'en');
}
