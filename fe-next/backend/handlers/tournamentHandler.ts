/**
 * Tournament Handler
 * Handles tournament management events
 */

import type { Server, Socket } from 'socket.io';
import type { Game, GameUser, LetterGrid, Language, TournamentStanding, GridPosition, Avatar } from '@/shared/types';

import {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
  getGameUsers,
  updateGame,
  setTournamentIdForGame
} from '../modules/gameStateManager.js';

import { broadcastToRoom, getGameRoom, safeEmit } from '../utils/socketHelpers.js';
import { emitError, ErrorCodes } from '../utils/errorHandler.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { makePositionsMap } from '../modules/wordValidator.js';
import { generateRandomTable } from '../utils/gameUtils.js';
import { generateRichBoard } from '../utils/boardSelection.js';
import { DIFFICULTIES, DEFAULT_DIFFICULTY } from '../utils/consts.js';
import gameStartCoordinator from '../utils/gameStartCoordinator.js';
import {
  createTournament as createTournamentFn,
  getTournamentStandings,
  getTournament,
  startTournamentRound,
  deleteTournament
} from '../modules/tournamentManager.js';
import logger from '../utils/logger.js';
import { startGameTimer } from './shared';

// Types for payloads
interface CreateTournamentPayload {
  name: string;
  totalRounds: number;
}

interface Tournament {
  id: string;
  name: string;
  totalRounds: number;
  currentRound: number;
  status: 'created' | 'in-progress' | 'completed' | 'cancelled';
}

interface TournamentPlayer {
  socketId: string;
  username: string;
  avatar: Avatar;
}

/**
 * Register tournament-related socket event handlers
 * @param io - Socket.IO server instance
 * @param socket - Socket.IO socket instance
 */
function registerTournamentHandlers(io: Server, socket: Socket): void {

  // Handle create tournament
  socket.on('createTournament', (data: CreateTournamentPayload) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const { name, totalRounds } = data;
    const gameCode = getGameBySocketId(socket.id);

    if (!gameCode) {
      emitError(socket, ErrorCodes.PLAYER_NOT_IN_GAME);
      return;
    }

    const game = getGame(gameCode);
    if (!game) {
      emitError(socket, ErrorCodes.GAME_NOT_FOUND);
      return;
    }

    // Verify sender is host
    if (game.hostSocketId !== socket.id) {
      emitError(socket, ErrorCodes.PLAYER_NOT_HOST, { message: 'Only the host can create a tournament' });
      return;
    }

    // Get host info
    const hostPlayerId = game.hostPlayerId || socket.id;
    const hostUsername = game.hostUsername || 'Host';

    // Create tournament settings
    const settings = {
      name: name || 'Tournament',
      totalRounds: totalRounds || 3
    };

    // Create tournament
    const tournament = createTournamentFn(hostPlayerId, hostUsername, settings);
    setTournamentIdForGame(gameCode, tournament.id);

    // Broadcast tournament created
    broadcastToRoom(io, getGameRoom(gameCode), 'tournamentCreated', {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        totalRounds: tournament.totalRounds,
        currentRound: 0,
        status: 'created'
      },
      standings: getTournamentStandings(tournament.id) || []
    });

    logger.info('TOURNAMENT', `Tournament "${tournament.name}" created for game ${gameCode}`);
  });

  // Handle start tournament round
  socket.on('startTournamentRound', () => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const gameCode = getGameBySocketId(socket.id);

    if (!gameCode) {
      emitError(socket, ErrorCodes.PLAYER_NOT_IN_GAME);
      return;
    }

    const game = getGame(gameCode);
    if (!game) {
      emitError(socket, ErrorCodes.GAME_NOT_FOUND);
      return;
    }

    // Verify sender is host
    if (game.hostSocketId !== socket.id) {
      emitError(socket, ErrorCodes.PLAYER_NOT_HOST, { message: 'Only the host can start a tournament round' });
      return;
    }

    const tournamentId = game.tournamentId;
    if (!tournamentId) {
      emitError(socket, ErrorCodes.TOURNAMENT_INVALID_STATE, { message: 'No tournament active' });
      return;
    }

    const tournament = getTournament(tournamentId);
    if (!tournament) {
      emitError(socket, ErrorCodes.TOURNAMENT_NOT_FOUND);
      return;
    }

    // Start new round
    startTournamentRound(tournamentId, gameCode);

    // Generate new board for the round
    const tDim = DIFFICULTIES[DEFAULT_DIFFICULTY];
    const tLang = game.language || 'en';
    const letterGrid: LetterGrid = generateRichBoard(
      () => generateRandomTable(tDim.rows, tDim.cols, tLang),
      tLang,
      tDim.rows,
      tDim.cols
    ) as LetterGrid;
    const timerSeconds = game.timerSeconds || 180;

    // Update game state
    updateGame(gameCode, {
      letterGrid,
      timerSeconds,
      remainingTime: timerSeconds,
      gameDuration: timerSeconds,
      gameState: 'in-progress',
      gameStartedAt: Date.now()
    });

    // Precompute positions
    const positions = makePositionsMap(letterGrid);
    const current = getGame(gameCode);
    if (current) {
      current.letterPositions = positions;
    }

    // Initialize player data for new round
    const users = getGameUsers(gameCode);
    const playerUsernames = users.map(u => u.username);
    const gameForInit = getGame(gameCode);
    if (gameForInit) {
      if (!gameForInit.playerWordDetails) gameForInit.playerWordDetails = {};
      if (!gameForInit.playerAchievements) gameForInit.playerAchievements = {};
      if (!gameForInit.playerScores) gameForInit.playerScores = {};
      if (!gameForInit.playerWords) gameForInit.playerWords = {};

      playerUsernames.forEach((username: string) => {
        gameForInit.playerWordDetails![username] = [];
        gameForInit.playerWords[username] = [];
        gameForInit.playerScores[username] = 0;
        gameForInit.playerAchievements![username] = [];
      });
      gameForInit.firstWordFound = false;
      gameForInit.startTime = Date.now();
    }

    // Initialize game start coordination
    const humanUsernames = users.filter(u => !u.isBot).map(u => u.username);
    const messageId = gameStartCoordinator.initializeSequence(gameCode, humanUsernames, timerSeconds);

    // Broadcast round start
    broadcastToRoom(io, getGameRoom(gameCode), 'tournamentRoundStarting', {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        totalRounds: tournament.totalRounds,
        currentRound: tournament.currentRound
      },
      standings: getTournamentStandings(tournamentId) || []
    });

    // Broadcast game start
    broadcastToRoom(io, getGameRoom(gameCode), 'startGame', {
      letterGrid,
      timerSeconds,
      language: game.language,
      minWordLength: game.minWordLength || 2,
      messageId,
      boardTheme: (game as unknown as { boardTheme?: { nameKey: string; emoji: string; isHoliday: boolean } | null }).boardTheme || null // Preserve theme from first round if any
    });

    // Set acknowledgment timeout
    gameStartCoordinator.setAcknowledgmentTimeout(gameCode, 2000, () => {
      startGameTimer(io, gameCode, timerSeconds);
    });

    logger.info('TOURNAMENT', `Round ${tournament.currentRound} started for tournament ${tournamentId}`);
  });

  // Handle get tournament standings
  socket.on('getTournamentStandings', () => {
    // Light weight: read-only but allocates standings + tournament objects each call
    if (!checkRateLimit(socket.id)) return;
    const gameCode = getGameBySocketId(socket.id);

    if (!gameCode) {
      socket.emit('tournamentStandings', { standings: [] });
      return;
    }

    const game = getGame(gameCode);
    if (!game || !game.tournamentId) {
      socket.emit('tournamentStandings', { standings: [] });
      return;
    }

    const standings = getTournamentStandings(game.tournamentId) || [];
    const tournament = getTournament(game.tournamentId) ?? null;

    socket.emit('tournamentStandings', {
      tournament: tournament ? {
        id: tournament.id,
        name: tournament.name,
        totalRounds: tournament.totalRounds,
        currentRound: tournament.currentRound,
        status: tournament.status
      } : null,
      standings
    });
  });

  // Handle cancel tournament
  socket.on('cancelTournament', () => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const gameCode = getGameBySocketId(socket.id);

    if (!gameCode) {
      emitError(socket, ErrorCodes.PLAYER_NOT_IN_GAME);
      return;
    }

    const game = getGame(gameCode);
    if (!game) {
      emitError(socket, ErrorCodes.GAME_NOT_FOUND);
      return;
    }

    // Verify sender is host
    if (game.hostSocketId !== socket.id) {
      emitError(socket, ErrorCodes.PLAYER_NOT_HOST, { message: 'Only the host can cancel a tournament' });
      return;
    }

    const tournamentId = game.tournamentId;
    if (!tournamentId) {
      emitError(socket, ErrorCodes.TOURNAMENT_INVALID_STATE, { message: 'No tournament active' });
      return;
    }

    // Cancel tournament
    deleteTournament(tournamentId);
    setTournamentIdForGame(gameCode, null);

    // Broadcast cancellation
    broadcastToRoom(io, getGameRoom(gameCode), 'tournamentCancelled', {
      message: 'Tournament has been cancelled by the host'
    });

    logger.info('TOURNAMENT', `Tournament ${tournamentId} cancelled for game ${gameCode}`);
  });
}

export { registerTournamentHandlers };
