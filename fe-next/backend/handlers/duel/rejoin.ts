/**
 * The duel SCREEN's join path.
 *
 * Split out of realtime.ts so that file stays under the size cap; the state it
 * reads (`realtimeGames`) still lives there and is imported, so there is one
 * map, not two.
 */

import { type DuelSocket, joinDuelRoomSchema } from './types';
import { realtimeGames } from './realtime';
import logger from '@/backend/utils/logger';

export function registerDuelRejoinHandler(socket: DuelSocket): void {
  // ==========================================
  // duel:join-game - the duel SCREEN announces itself
  // ==========================================
  /**
   * `duel:started` is emitted once, to the `duel:<id>` room, at accept time —
   * while both students are still on the lobby page. Both then navigate to the
   * duel screen, which mounts a NEW socket: in no room, and too late for the
   * only announcement there is. Both sides waited for an opponent who was also
   * waiting, until the server's timer completed the duel 0-0. Nothing errored;
   * the duel was simply unplayable (recurring-pitfalls Class 4, plus Class 3 —
   * the accept path and the join path had to agree about the room and didn't).
   *
   * This is the join path: put the socket in the room and replay the running
   * state to it. The clock is NOT restarted — `startTime` comes from the game
   * state, so a late joiner gets the same countdown as the opponent.
   */
  socket.on('duel:join-game', async (data: unknown) => {
    const parsed = joinDuelRoomSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit('duel:error', { error: 'Invalid duel ID' });
      return;
    }

    const { duelId } = parsed.data;
    const userId = socket.data.userId;
    const gameState = realtimeGames.get(duelId);

    if (!gameState) {
      // Never silent: the screen must be able to tell "not started yet" from
      // "still connecting".
      socket.emit('duel:error', { error: 'Duel is not running' });
      return;
    }

    const isChallenger = gameState.challengerId === userId;
    const isOpponent = gameState.opponentId === userId;
    if (!isChallenger && !isOpponent) {
      socket.emit('duel:error', { error: 'Not a participant in this duel' });
      return;
    }

    socket.join(`duel:${duelId}`);

    socket.emit('duel:started', {
      duelId,
      boardState: gameState.boardState,
      startTime: gameState.startTime,
      timeLimit: gameState.timeLimit,
      players: [gameState.challengerId, gameState.opponentId],
    });

    // Scores already on the board, so a rejoin does not read as 0-0.
    const myScore = isChallenger ? gameState.challengerScore : gameState.opponentScore;
    const theirScore = isChallenger ? gameState.opponentScore : gameState.challengerScore;

    socket.emit('duel:word-accepted', {
      duelId,
      word: '',
      points: 0,
      totalScore: myScore,
      comboStreak: 0,
      comboBonus: 0,
    });

    socket.emit('duel:opponent-progress', {
      duelId,
      wordsFound: (isChallenger ? gameState.opponentWords : gameState.challengerWords).length,
      totalScore: theirScore,
      comboStreak: 0,
    });

    logger.info('DUEL', `Socket joined running duel ${duelId} (${userId})`);
  });
}
