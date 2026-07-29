/**
 * Tournament End Service
 *
 * Handles tournament round completion and final tournament completion.
 */

import type { Server } from 'socket.io';
import type { GameState } from '../../modules/gameState/types';
import { getTournamentIdFromGame } from '../../modules/gameStateManager';
import { broadcastToRoom, getGameRoom } from '../../utils/socketHelpers';
import {
  completeTournamentRound,
  getTournamentStandings,
  getTournament,
} from '../../modules/tournamentManager';

/**
 * Handle tournament completion after game ends
 * Records round results and broadcasts tournament status
 */
export function handleTournamentCompletion(
  io: Server,
  gameCode: string,
  game: GameState
): void {
  const tournamentId = getTournamentIdFromGame(gameCode);
  if (!tournamentId) return;

  // Build round results from game data
  const roundResults: Record<string, { score: number; words: string[] }> = {};
  Object.keys(game.users).forEach((username) => {
    const userData = game.users[username];
    if (userData && userData.socketId) {
      roundResults[userData.socketId] = {
        score: game.playerScores?.[username] || 0,
        words: (game.playerWords && game.playerWords[username]) || [],
      };
    }
  });

  // Complete the round and get updated standings
  completeTournamentRound(tournamentId, roundResults);
  const standings = getTournamentStandings(tournamentId);
  const tournament = getTournament(tournamentId);

  if (!tournament) return;

  // Check if tournament is complete
  if (tournament.currentRound >= tournament.totalRounds) {
    // Tournament finished
    broadcastToRoom(io, getGameRoom(gameCode), 'tournamentComplete', {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        totalRounds: tournament.totalRounds,
        currentRound: tournament.currentRound,
        status: 'completed',
      },
      standings,
    });
  } else {
    // Round complete, more rounds to go
    broadcastToRoom(io, getGameRoom(gameCode), 'tournamentRoundCompleted', {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        totalRounds: tournament.totalRounds,
        currentRound: tournament.currentRound,
      },
      standings,
    });
  }
}
