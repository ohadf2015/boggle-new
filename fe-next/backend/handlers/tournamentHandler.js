/**
 * Tournament Handler
 * Handles tournament management events
 */

const {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
  getGameUsers,
  updateGame,
  setTournamentId
} = require('../modules/gameStateManager');

const { broadcastToRoom, getGameRoom, safeEmit } = require('../utils/socketHelpers');
const { emitError, ErrorMessages } = require('../utils/errorHandler');
const { checkRateLimit } = require('../utils/rateLimiter');
const { makePositionsMap } = require('../modules/wordValidator');
const { generateRandomTable } = require('../utils/gameUtils');
const gameStartCoordinator = require('../utils/gameStartCoordinator');
const tournamentManager = require('../modules/tournamentManager');
const logger = require('../utils/logger');
const { startGameTimer } = require('./shared');

/**
 * Register tournament-related socket event handlers
 * @param {Server} io - Socket.IO server instance
 * @param {Socket} socket - Socket.IO socket instance
 */
function registerTournamentHandlers(io, socket) {

  // Handle create tournament
  socket.on('createTournament', (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const { name, totalRounds } = data;
    const gameCode = getGameBySocketId(socket.id);

    if (!gameCode) {
      emitError(socket, ErrorMessages.NOT_IN_GAME);
      return;
    }

    const game = getGame(gameCode);
    if (!game) {
      emitError(socket, ErrorMessages.GAME_NOT_FOUND);
      return;
    }

    // Verify sender is host
    if (game.hostSocketId !== socket.id) {
      emitError(socket, 'Only the host can create a tournament');
      return;
    }

    // Get players with their avatars
    const users = getGameUsers(gameCode);
    const players = users.map(u => ({
      socketId: u.socketId,
      username: u.username,
      avatar: u.avatar
    }));

    // Create tournament
    const tournament = tournamentManager.createTournament(name || 'Tournament', totalRounds || 3, players);
    setTournamentId(gameCode, tournament.id);

    // Broadcast tournament created
    broadcastToRoom(io, getGameRoom(gameCode), 'tournamentCreated', {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        totalRounds: tournament.totalRounds,
        currentRound: 0,
        status: 'created'
      },
      standings: tournamentManager.getTournamentStandings(tournament.id)
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
      emitError(socket, ErrorMessages.NOT_IN_GAME);
      return;
    }

    const game = getGame(gameCode);
    if (!game) {
      emitError(socket, ErrorMessages.GAME_NOT_FOUND);
      return;
    }

    // Verify sender is host
    if (game.hostSocketId !== socket.id) {
      emitError(socket, 'Only the host can start a tournament round');
      return;
    }

    const tournamentId = game.tournamentId;
    if (!tournamentId) {
      emitError(socket, 'No tournament active');
      return;
    }

    const tournament = tournamentManager.getTournament(tournamentId);
    if (!tournament) {
      emitError(socket, 'Tournament not found');
      return;
    }

    // Start new round
    tournamentManager.startTournamentRound(tournamentId);

    // Generate new board for the round
    const letterGrid = generateRandomTable(game.language || 'en');
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

      playerUsernames.forEach(username => {
        gameForInit.playerWordDetails[username] = [];
        gameForInit.playerWords[username] = [];
        gameForInit.playerScores[username] = 0;
        gameForInit.playerAchievements[username] = [];
      });
      gameForInit.firstWordFound = false;
      gameForInit.startTime = Date.now();
    }

    // Initialize game start coordination
    const messageId = gameStartCoordinator.initializeSequence(gameCode, playerUsernames, timerSeconds);

    // Broadcast round start
    broadcastToRoom(io, getGameRoom(gameCode), 'tournamentRoundStarting', {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        totalRounds: tournament.totalRounds,
        currentRound: tournament.currentRound
      },
      standings: tournamentManager.getTournamentStandings(tournamentId)
    });

    // Broadcast game start
    broadcastToRoom(io, getGameRoom(gameCode), 'startGame', {
      letterGrid,
      timerSeconds,
      language: game.language,
      minWordLength: game.minWordLength || 2,
      messageId
    });

    // Set acknowledgment timeout
    gameStartCoordinator.setAcknowledgmentTimeout(gameCode, 2000, () => {
      startGameTimer(io, gameCode, timerSeconds);
    });

    logger.info('TOURNAMENT', `Round ${tournament.currentRound} started for tournament ${tournamentId}`);
  });

  // Handle get tournament standings
  socket.on('getTournamentStandings', () => {
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

    const standings = tournamentManager.getTournamentStandings(game.tournamentId);
    const tournament = tournamentManager.getTournament(game.tournamentId);

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
      emitError(socket, ErrorMessages.NOT_IN_GAME);
      return;
    }

    const game = getGame(gameCode);
    if (!game) {
      emitError(socket, ErrorMessages.GAME_NOT_FOUND);
      return;
    }

    // Verify sender is host
    if (game.hostSocketId !== socket.id) {
      emitError(socket, 'Only the host can cancel a tournament');
      return;
    }

    const tournamentId = game.tournamentId;
    if (!tournamentId) {
      emitError(socket, 'No tournament active');
      return;
    }

    // Cancel tournament
    tournamentManager.cancelTournament(tournamentId);
    setTournamentId(gameCode, null);

    // Broadcast cancellation
    broadcastToRoom(io, getGameRoom(gameCode), 'tournamentCancelled', {
      message: 'Tournament has been cancelled by the host'
    });

    logger.info('TOURNAMENT', `Tournament ${tournamentId} cancelled for game ${gameCode}`);
  });
}

module.exports = { registerTournamentHandlers };
