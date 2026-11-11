import type { Server } from 'socket.io';
import type { GameState } from './gameState/types.js';
import { startRivalRound } from './rivalSocket.js';

/** The one per-round reset for the word race and rival duels, run before any mode branch; the board path re-arms both. */
export function resetRoundSocial(io: Server, gameCode: string, game: GameState): void {
  game.lessonClaims = null;
  startRivalRound(io, gameCode, game, null, {});
}
