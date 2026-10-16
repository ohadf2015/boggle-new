import type { Socket } from 'socket.io';
import { getGame, getGameBySocketId, getUsernameBySocketId } from '../modules/gameStateManager.js';
import { getOrInitPlayerBoard } from '../modules/blastModeManager.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { safeEmit } from '../utils/socketHelpers.js';
import { BLAST_RESYNC_CLEARED_BY, BLAST_RESYNC_REQUEST } from '@/shared/utils/blastServerSync';

/**
 * A Blast word the server rejects (teacher pause, not on the server's board,
 * duplicate, cooldown) gets no board update, so the client's optimistic pop
 * would stay diverged. The client asks for its board instead; this answers
 * with the player's own authoritative board.
 */
export function registerBlastBoardResyncHandler(socket: Socket): void {
  socket.on(BLAST_RESYNC_REQUEST, () => {
    if (!checkRateLimit(socket.id)) return;
    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);
    if (!gameCode || !username) return;
    const game = getGame(gameCode);
    if (!game || game.gameMode !== 'blast' || !game.blastModeState) return;
    const board = getOrInitPlayerBoard(game.blastModeState, username);
    if (!board.grid || !board.tileStates) return;
    safeEmit(socket, 'blastBoardUpdate', {
      grid: board.grid,
      tileStates: board.tileStates,
      clearedBy: BLAST_RESYNC_CLEARED_BY,
      word: '',
      clearedCount: 0,
      totalMoves: board.totalMoves ?? 0,
    });
  });
}
