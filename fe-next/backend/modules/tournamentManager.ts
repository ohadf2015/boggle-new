/**
 * Tournament Manager
 * Manages tournament state, player tracking, and round progression
 */

 
const { saveTournamentState, deleteTournamentState } = require('../redisClient');
 
import logger from '../utils/logger';

// Interfaces
export interface TournamentSettings {
  name?: string;
  totalRounds?: number;
  timerSeconds?: number;
  difficulty?: string;
  language?: string;
}

export interface TournamentPlayer {
  playerId: string;
  username: string;
  avatar: string;
  totalScore: number;
  roundScores: number[];
  joinedAt: number;
  joinedMidTournament?: boolean;
}

export interface RoundResult {
  score?: number;
  words?: string[];
  achievements?: string[];
}

export interface TournamentRound {
  roundNumber: number;
  gameCode: string | null;
  startedAt: number;
  completedAt: number | null;
  results: Record<string, RoundResult>;
}

export interface TournamentStanding {
  playerId: string;
  username: string;
  avatar: string;
  totalScore: number;
  roundScores: number[];
  placement?: number;
}

export interface Tournament {
  id: string;
  hostPlayerId: string;
  hostUsername: string;
  name: string;
  totalRounds: number;
  currentRound: number;
  status: 'lobby' | 'in-progress' | 'completed';
  settings: {
    timerSeconds: number;
    difficulty: string;
    language: string;
  };
  players: Record<string, TournamentPlayer>;
  rounds: TournamentRound[];
  finalStandings: TournamentStanding[] | null;
  createdAt: number;
  updatedAt: number;
}

// Tournament state management
const tournaments: Record<string, Tournament> = {};

/**
 * Generate a unique tournament ID
 */
export function generateTournamentId(): string {
  return `tour_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Create a new tournament
 */
export function createTournament(
  hostPlayerId: string,
  hostUsername: string,
  settings: TournamentSettings
): Tournament {
  const tournamentId = generateTournamentId();

  tournaments[tournamentId] = {
    id: tournamentId,
    hostPlayerId,
    hostUsername,
    name: settings.name || 'Tournament',
    totalRounds: settings.totalRounds || 3,
    currentRound: 0,
    status: 'lobby', // 'lobby', 'in-progress', 'completed'

    // Tournament settings
    settings: {
      timerSeconds: settings.timerSeconds || 180,
      difficulty: settings.difficulty || 'medium',
      language: settings.language || 'en',
    },

    // Player data - keyed by playerId for consistency
    players: {}, // { [playerId]: { username, avatar, totalScore, roundScores: [], joinedAt } }

    // Round tracking
    rounds: [], // [{ roundNumber, gameCode, startedAt, completedAt, results: {} }]

    // Final results
    finalStandings: null,

    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  logger.info('TOURNAMENT', `Created tournament ${tournamentId} by ${hostUsername}`);

  // Save to Redis for persistence
  saveTournamentState(tournamentId, tournaments[tournamentId]).catch((err: Error) => {
    logger.error('TOURNAMENT', `Failed to save tournament to Redis: ${err}`);
  });

  return tournaments[tournamentId];
}

/**
 * Add player to tournament
 */
export function addPlayerToTournament(
  tournamentId: string,
  playerId: string,
  username: string,
  avatar: string
): TournamentPlayer {
  const tournament = tournaments[tournamentId];
  if (!tournament) {
    throw new Error('Tournament not found');
  }

  if (tournament.status !== 'lobby') {
    throw new Error('Cannot join tournament in progress');
  }

  // Check if player already in tournament
  if (tournament.players[playerId]) {
    logger.debug('TOURNAMENT', `Player ${username} already in tournament ${tournamentId}`);
    return tournament.players[playerId];
  }

  tournament.players[playerId] = {
    playerId,
    username,
    avatar,
    totalScore: 0,
    roundScores: [],
    joinedAt: Date.now(),
  };

  tournament.updatedAt = Date.now();
  logger.debug('TOURNAMENT', `Added player ${username} to tournament ${tournamentId}`);

  // Save to Redis for persistence
  saveTournamentState(tournamentId, tournament).catch((err: Error) => {
    logger.error('TOURNAMENT', `Failed to save tournament to Redis: ${err}`);
  });

  return tournament.players[playerId];
}

/**
 * Remove player from tournament (during lobby or in-progress)
 */
export function removePlayerFromTournament(
  tournamentId: string,
  playerId: string,
  allowDuringGame: boolean = false
): boolean {
  const tournament = tournaments[tournamentId];
  if (!tournament) {
    return false;
  }

  // Only allow removal in lobby, unless allowDuringGame is true (for disconnects)
  if (tournament.status !== 'lobby' && !allowDuringGame) {
    return false;
  }

  if (tournament.players[playerId]) {
    const username = tournament.players[playerId].username;
    delete tournament.players[playerId];
    tournament.updatedAt = Date.now();
    logger.debug('TOURNAMENT', `Removed player ${username} (${playerId}) from tournament ${tournamentId}`);

    // Save to Redis for persistence
    saveTournamentState(tournamentId, tournament).catch((err: Error) => {
      logger.error('TOURNAMENT', `Failed to save tournament to Redis: ${err}`);
    });

    return true;
  }

  return false;
}

/**
 * Allow new player to join mid-tournament
 */
export function addPlayerMidTournament(
  tournamentId: string,
  playerId: string,
  username: string,
  avatar: string
): TournamentPlayer {
  const tournament = tournaments[tournamentId];
  if (!tournament) {
    throw new Error('Tournament not found');
  }

  // Can join if tournament is in-progress (but not completed)
  if (tournament.status === 'completed') {
    throw new Error('Cannot join completed tournament');
  }

  // Check if player already in tournament
  if (tournament.players[playerId]) {
    logger.debug('TOURNAMENT', `Player ${username} already in tournament ${tournamentId}`);
    return tournament.players[playerId];
  }

  // Add player with zero scores for missed rounds
  const missedRounds = tournament.currentRound;
  tournament.players[playerId] = {
    playerId,
    username,
    avatar,
    totalScore: 0,
    roundScores: Array(missedRounds).fill(0), // Zero scores for missed rounds
    joinedAt: Date.now(),
    joinedMidTournament: missedRounds > 0,
  };

  tournament.updatedAt = Date.now();
  logger.debug('TOURNAMENT', `Added player ${username} mid-tournament to ${tournamentId} (missed ${missedRounds} rounds)`);

  // Save to Redis for persistence
  saveTournamentState(tournamentId, tournament).catch((err: Error) => {
    logger.error('TOURNAMENT', `Failed to save tournament to Redis: ${err}`);
  });

  return tournament.players[playerId];
}

/**
 * Start a new round in the tournament
 */
export function startTournamentRound(tournamentId: string, gameCode: string): TournamentRound {
  const tournament = tournaments[tournamentId];
  if (!tournament) {
    throw new Error('Tournament not found');
  }

  const roundNumber = tournament.currentRound + 1;

  if (roundNumber > tournament.totalRounds) {
    throw new Error('All rounds completed');
  }

  tournament.currentRound = roundNumber;
  tournament.status = 'in-progress';

  const roundData: TournamentRound = {
    roundNumber,
    gameCode,
    startedAt: Date.now(),
    completedAt: null,
    results: {}, // { [playerId]: { score, words, achievements } }
  };

  tournament.rounds.push(roundData);
  tournament.updatedAt = Date.now();

  logger.info('TOURNAMENT', `Started round ${roundNumber}/${tournament.totalRounds} for tournament ${tournamentId}`);

  // Save to Redis for persistence
  saveTournamentState(tournamentId, tournament).catch((err: Error) => {
    logger.error('TOURNAMENT', `Failed to save tournament to Redis: ${err}`);
  });

  return roundData;
}

/**
 * Complete current round and update scores
 */
export function completeTournamentRound(
  tournamentId: string,
  roundResults: Record<string, RoundResult>
): TournamentRound {
  const tournament = tournaments[tournamentId];
  if (!tournament) {
    throw new Error('Tournament not found');
  }

  const currentRoundIndex = tournament.rounds.length - 1;
  if (currentRoundIndex < 0) {
    throw new Error('No active round');
  }

  const round = tournament.rounds[currentRoundIndex];
  round.completedAt = Date.now();
  round.results = roundResults;

  // Update player scores
  Object.keys(roundResults).forEach(playerId => {
    if (tournament.players[playerId]) {
      const playerRoundData = roundResults[playerId];
      const score = playerRoundData.score || 0;

      tournament.players[playerId].roundScores.push(score);
      tournament.players[playerId].totalScore += score;
    }
  });

  tournament.updatedAt = Date.now();

  logger.info('TOURNAMENT', `Completed round ${round.roundNumber}/${tournament.totalRounds} for tournament ${tournamentId}`);

  // Save to Redis for persistence
  saveTournamentState(tournamentId, tournament).catch((err: Error) => {
    logger.error('TOURNAMENT', `Failed to save tournament to Redis: ${err}`);
  });

  // Check if tournament is complete
  if (tournament.currentRound >= tournament.totalRounds) {
    completeTournament(tournamentId);
  }

  return round;
}

/**
 * Complete tournament and generate final standings
 */
export function completeTournament(tournamentId: string): TournamentStanding[] {
  const tournament = tournaments[tournamentId];
  if (!tournament) {
    throw new Error('Tournament not found');
  }

  tournament.status = 'completed';

  // Generate final standings
  const standings: TournamentStanding[] = Object.values(tournament.players)
    .map(player => ({
      playerId: player.playerId,
      username: player.username,
      avatar: player.avatar,
      totalScore: player.totalScore,
      roundScores: player.roundScores,
    }))
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((player, index) => ({
      ...player,
      placement: index + 1,
    }));

  tournament.finalStandings = standings;
  tournament.updatedAt = Date.now();

  logger.info('TOURNAMENT', `Tournament ${tournamentId} completed. Winner: ${standings[0]?.username}`);

  // Save to Redis for persistence
  saveTournamentState(tournamentId, tournament).catch((err: Error) => {
    logger.error('TOURNAMENT', `Failed to save tournament to Redis: ${err}`);
  });

  return standings;
}

/**
 * Get tournament by ID
 */
export function getTournament(tournamentId: string): Tournament | undefined {
  return tournaments[tournamentId];
}

/**
 * Get tournament standings (current state)
 */
export function getTournamentStandings(tournamentId: string): TournamentStanding[] | null {
  const tournament = tournaments[tournamentId];
  if (!tournament) {
    return null;
  }

  const standings = Object.values(tournament.players)
    .map(player => ({
      playerId: player.playerId,
      username: player.username,
      avatar: player.avatar,
      totalScore: player.totalScore,
      roundScores: player.roundScores,
    }))
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((player, index) => ({
      ...player,
      placement: index + 1,
    }));

  return standings;
}

/**
 * Delete tournament
 */
export function deleteTournament(tournamentId: string): boolean {
  if (tournaments[tournamentId]) {
    logger.debug('TOURNAMENT', `Deleting tournament ${tournamentId}`);
    delete tournaments[tournamentId];

    // Delete from Redis
    deleteTournamentState(tournamentId).catch((err: Error) => {
      logger.error('TOURNAMENT', `Failed to delete tournament from Redis: ${err}`);
    });

    return true;
  }
  return false;
}

/**
 * Get all active tournaments
 */
export function getActiveTournaments(): Tournament[] {
  return Object.values(tournaments).filter(t => t.status !== 'completed');
}

/**
 * Link game code to tournament for tracking
 */
export function linkGameToTournament(gameCode: string, tournamentId: string): boolean {
  const tournament = tournaments[tournamentId];
  if (!tournament) {
    return false;
  }

  // Store reference in the current round
  const currentRound = tournament.rounds[tournament.rounds.length - 1];
  if (currentRound && !currentRound.gameCode) {
    currentRound.gameCode = gameCode;
    return true;
  }

  return false;
}

/**
 * Restore tournaments from Redis on server start
 */
export async function restoreTournamentsFromRedis(): Promise<void> {
   
  const { getAllTournamentIds, getTournamentState } = require('../redisClient');

  try {
    const tournamentIds = await getAllTournamentIds();
    logger.info('TOURNAMENT', `Restoring ${tournamentIds.length} tournaments from Redis...`);

    for (const tournamentId of tournamentIds) {
      try {
        const tournamentData = await getTournamentState(tournamentId);
        if (tournamentData) {
          tournaments[tournamentId] = tournamentData;
          logger.debug('TOURNAMENT', `Restored tournament ${tournamentId} (status: ${tournamentData.status})`);
        }
      } catch (err) {
        logger.error('TOURNAMENT', `Failed to restore tournament ${tournamentId}: ${err}`);
      }
    }

    logger.info('TOURNAMENT', `Successfully restored ${Object.keys(tournaments).length} tournaments`);
  } catch (err) {
    logger.error('TOURNAMENT', `Failed to restore tournaments from Redis: ${err}`);
  }
}

// Export tournaments object for direct access
export { tournaments };

