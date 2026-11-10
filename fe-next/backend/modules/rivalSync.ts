// A chip that mounts after the start emit asks for its rival instead of waiting for the next score.

import type { Server, Socket } from 'socket.io';
import type { GameState } from './gameState/types.js';
import { RIVAL_EVENTS, type RivalUpdatePayload } from '@/shared/types/rivalry';
import { getGame, getGameBySocketId, getUsernameBySocketId } from './gameStateManager.js';
import { rivalPayloadFor, setRivalIo } from './rivalSocket.js';

export function registerRivalSync(io: Server, socket: Socket): void {
  setRivalIo(io);
  socket.on(RIVAL_EVENTS.sync, () => {
    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);
    const game = gameCode ? (getGame(gameCode) as GameState | undefined) : undefined;
    const reply: RivalUpdatePayload = game && gameCode && username
      ? { gameSessionId: game.gameSessionId ?? null, rival: rivalPayloadFor(gameCode, game, username) }
      : { gameSessionId: null, rival: null };
    socket.emit(RIVAL_EVENTS.update, reply);
  });
}
