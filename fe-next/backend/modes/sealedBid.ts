/**
 * Sealed Bid (beta) — a humans-only auction over shared racks.
 */

import type { GameModeModule } from './types';
import { initSealedBidState } from '../modules/sealedBidManager';
import { armSealedBidFirstRound } from '../handlers/sealedBidHandler';
import { pickRounds as pickSealedBidRacks, ROUNDS_PER_GAME } from '@/lib/sealedBid/sp/rounds';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers';

export const sealedBidMode: GameModeModule = {
  id: 'sealed-bid',

  // Humans only — bots never bid, so they would block every round until its deadline.
  initRound({ game, language, humanUsernames }) {
    const racks = pickSealedBidRacks(ROUNDS_PER_GAME, language).map((r) => r.rack);
    game.sealedBidState = initSealedBidState(humanUsernames, racks);
  },

  // After startGame so the client can mount the view; reconnects poll requestSealedBidState.
  afterStart(io, gameCode, game) {
    const sb = game.sealedBidState;
    if (!sb) return;
    broadcastToRoom(io, getGameRoom(gameCode), 'sealedBidInit', {
      players: sb.players,
      racks: sb.racks,
      index: sb.index,
      rack: sb.racks[sb.index] ?? null,
      phase: sb.phase,
      scores: sb.scores,
      roundDeadline: sb.roundDeadline,
      totalRounds: sb.racks.length,
    });
    armSealedBidFirstRound(io, gameCode);
  },
};
