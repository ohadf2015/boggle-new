import type { Socket } from 'socket.io';
import { getGame } from '../modules/gameStateManager.js';
import logger from '../utils/logger.js';

interface ResumePayload {
  gameCode: string;
  username: string;
  lastServerSeq: number;
}

const RESUMABLE_STATES = new Set(['in-progress', 'validating']);

export function handleResume(socket: Socket, payload: ResumePayload): void {
  const { gameCode, username, lastServerSeq } = payload;
  const game = getGame(gameCode);

  if (!game) {
    socket.emit('resume:reject', { reason: 'expired' });
    return;
  }

  if (!RESUMABLE_STATES.has(game.gameState)) {
    socket.emit('resume:reject', { reason: 'game_over' });
    return;
  }

  if (!game.users[username]) {
    socket.emit('resume:reject', { reason: 'kicked' });
    return;
  }

  const serverSeq = (game as any).serverSeq ?? 0;
  logger.debug('SOCKET', `resume:ack ${gameCode} ${username} seq=${serverSeq} lastSeq=${lastServerSeq}`);

  socket.emit('resume:ack', {
    serverSeq,
    timeRemaining: game.remainingTime ?? game.timerSeconds,
    state: {
      letterGrid: game.letterGrid,
      playerScores: game.playerScores,
      playerWords: game.playerWords,
      language: game.language,
      gameMode: game.gameMode,
      gameSessionId: game.gameSessionId,
      remainingTime: game.remainingTime ?? game.timerSeconds,
    },
  });
}
