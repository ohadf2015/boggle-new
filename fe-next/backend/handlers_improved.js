/**
 * IMPROVED HANDLERS - Production-ready game start implementation
 * Copy these functions to replace the existing ones in handlers.js
 */

const gameStartCoordinator = require('./utils/gameStartCoordinator');
const { broadcast, safeSend } = require('./utils/websocketHelpers');

// ============================================================================
// IMPROVED handleStartGame with robust acknowledgment system
// ============================================================================
const handleStartGame_IMPROVED = async (host, letterGrid, timerSeconds, language, hostPlaying = true) => {
  const gameCode = gameWs.get(host);

  if (!gameCode || !games[gameCode]) {
    console.error(`[START_GAME] Invalid game - gameCode: ${gameCode}`);
    return;
  }

  const game = games[gameCode];

  // Validate game state
  if (game.gameState === 'playing') {
    console.warn(`[START_GAME] Game ${gameCode} is already playing`);
    safeSend(host, { action: 'error', message: 'Game is already in progress' }, 'host');
    return;
  }

  console.log(`[START_GAME] Starting game ${gameCode}, host playing: ${hostPlaying}`);

  // Update game state
  game.gameState = 'playing';
  game.startTime = Date.now();
  game.endTime = Date.now() + (timerSeconds * 1000);
  game.letterGrid = letterGrid;
  game.firstWordFound = false;
  game.timerSeconds = timerSeconds;
  game.hostPlaying = hostPlaying;
  if (language) {
    game.language = language;
  }

  // Reset all player data
  Object.keys(game.users).forEach(username => {
    game.playerScores[username] = 0;
    game.playerWords[username] = [];
    game.playerAchievements[username] = [];
    game.playerWordDetails[username] = [];
  });

  // Get list of active players (exclude disconnected ones)
  const activePlayers = Object.keys(game.users).filter(username => {
    const ws = game.users[username];
    return ws && ws.readyState === 1;
  });

  if (activePlayers.length === 0) {
    console.error(`[START_GAME] No active players in game ${gameCode}`);
    game.gameState = 'waiting';
    safeSend(host, { action: 'error', message: 'No active players to start game' }, 'host');
    return;
  }

  // Initialize acknowledgment tracking
  const messageId = gameStartCoordinator.initializeSequence(gameCode, activePlayers, timerSeconds);

  // Prepare start message
  const startMessage = {
    action: "startGame",
    letterGrid,
    timerSeconds,
    language: game.language,
    messageId
  };

  console.log(`[START_GAME] Broadcasting to ${activePlayers.length} active players`);

  // Broadcast to all players
  const broadcastResult = broadcast(game.users, startMessage, `GAME_START-${gameCode}`);

  // Schedule intelligent retries for failed players
  if (broadcastResult.failedIdentifiers.length > 0) {
    console.log(`[START_GAME] Initial broadcast failed for: ${broadcastResult.failedIdentifiers.join(', ')}`);

    // Define retry send function
    const retrySend = (username) => {
      const ws = game.users[username];
      if (ws && ws.readyState === 1) {
        try {
          ws.send(JSON.stringify(startMessage));
          return true;
        } catch (error) {
          console.error(`[START_GAME] Retry failed for ${username}:`, error.message);
          return false;
        }
      }
      return false;
    };

    // Schedule retries with exponential backoff
    gameStartCoordinator.scheduleRetries(gameCode, broadcastResult.failedIdentifiers, retrySend);
  }

  // Update leaderboard
  broadcastLeaderboard(gameCode);

  // Set acknowledgment timeout (3 seconds for regular games, 5 seconds for 4+ players)
  const timeoutDuration = activePlayers.length >= 4 ? 5000 : 3000;

  gameStartCoordinator.setAcknowledgmentTimeout(gameCode, timeoutDuration, (stats) => {
    // Timeout callback - start timer anyway
    if (games[gameCode] && games[gameCode].gameState === 'playing') {
      console.log(`[START_GAME] Starting timer after timeout. Stats:`, stats);

      // Log performance metrics
      logGameStartMetrics(gameCode, stats);

      // Start the server timer
      startServerTimer(gameCode, timerSeconds);

      // Notify host about partial start if some players are missing
      if (stats.missing.length > 0) {
        safeSend(host, {
          action: 'gameStartPartial',
          readyPlayers: stats.acknowledged,
          missingPlayers: stats.missing,
          totalPlayers: stats.expected
        }, 'host');
      }
    }
  });

  // Save game state to Redis
  saveGameState(gameCode, games[gameCode]).catch(err =>
    console.error('[REDIS] Error saving game state:', err)
  );
};

// ============================================================================
// IMPROVED handleStartGameAck with proper validation
// ============================================================================
const handleStartGameAck_IMPROVED = (ws, messageId) => {
  const gameCode = gameWs.get(ws);
  const username = wsUsername.get(ws);

  if (!gameCode || !games[gameCode]) {
    console.error(`[START_GAME_ACK] Invalid context - gameCode: ${gameCode}, username: ${username}`);
    return;
  }

  if (!username) {
    console.error(`[START_GAME_ACK] No username for WebSocket`);
    return;
  }

  // Validate messageId format (security)
  if (!messageId || typeof messageId !== 'string' || messageId.length > 100) {
    console.warn(`[START_GAME_ACK] Invalid messageId format from ${username}`);
    return;
  }

  // Record the acknowledgment
  const result = gameStartCoordinator.recordAcknowledgment(gameCode, username, messageId);

  if (!result.valid) {
    console.warn(`[START_GAME_ACK] Invalid acknowledgment from ${username}: ${result.reason}`);
    return;
  }

  if (result.late) {
    console.log(`[START_GAME_ACK] Late acknowledgment from ${username} (timer already started)`);
    return;
  }

  if (result.duplicate) {
    console.log(`[START_GAME_ACK] Duplicate acknowledgment from ${username}`);
    return;
  }

  // Check if all players are ready
  if (result.allReady) {
    console.log(`[START_GAME_ACK] All players ready! Starting timer immediately.`);

    // Log performance metrics
    const stats = gameStartCoordinator.getSequenceStats(gameCode);
    if (stats) {
      logGameStartMetrics(gameCode, stats);
    }

    // Start the timer
    startServerTimer(gameCode, games[gameCode].timerSeconds);

    // Notify host that all players are ready
    const hostWs = games[gameCode].host;
    if (hostWs && hostWs.readyState === 1) {
      safeSend(hostWs, {
        action: 'allPlayersReady',
        waitTime: result.waitTime,
        playerCount: result.expectedCount
      }, 'host');
    }
  } else {
    // Log progress
    console.log(`[START_GAME_ACK] Progress: ${result.acknowledgedCount}/${result.expectedCount} players ready`);
  }
};

// ============================================================================
// IMPROVED handleDisconnect with acknowledgment cleanup
// ============================================================================
const handleDisconnect_IMPROVED = (ws, wss) => {
  const gameCode = gameWs.get(ws);
  const username = wsUsername.get(ws);

  if (gameCode || username) {
    console.log(`[DISCONNECT] ws disconnected - gameCode: ${gameCode}, username: ${username}`);
  }

  if (gameCode && games[gameCode]) {
    const game = games[gameCode];
    const isHost = game.host === ws;

    // Handle disconnection during game start sequence
    if (gameStartCoordinator.hasActiveSequence(gameCode)) {
      const result = gameStartCoordinator.handlePlayerDisconnect(gameCode, username);

      if (result && result.startTimer) {
        console.log(`[DISCONNECT] Starting timer after player disconnect - all remaining players ready`);
        startServerTimer(gameCode, game.timerSeconds);
      }
    }

    // Continue with existing disconnect logic...
    // [Rest of the existing handleDisconnect code]
  }

  // Clean up mappings
  gameWs.delete(ws);
  wsUsername.delete(ws);
};

// ============================================================================
// IMPROVED handleResetGame with acknowledgment cleanup
// ============================================================================
const handleResetGame_IMPROVED = async (host) => {
  const gameCode = gameWs.get(host);

  if (!gameCode || !games[gameCode]) {
    console.error(`[RESET_GAME] Invalid game - gameCode: ${gameCode}`);
    return;
  }

  console.log(`[RESET_GAME] Resetting game ${gameCode} for new round`);

  // Cancel any active game start sequence
  gameStartCoordinator.cancelSequence(gameCode);

  // Clean up all timers and timeouts
  if (games[gameCode].timerInterval) {
    clearInterval(games[gameCode].timerInterval);
    games[gameCode].timerInterval = null;
  }

  if (games[gameCode].validationTimeout) {
    clearTimeout(games[gameCode].validationTimeout);
    games[gameCode].validationTimeout = null;
  }

  if (games[gameCode].validationWarningTimeouts) {
    games[gameCode].validationWarningTimeouts.forEach(timeout => clearTimeout(timeout));
    games[gameCode].validationWarningTimeouts = null;
  }

  // Reset game state
  games[gameCode].gameState = 'waiting';
  games[gameCode].startTime = null;
  games[gameCode].endTime = null;
  games[gameCode].letterGrid = null;
  games[gameCode].firstWordFound = false;

  // Clear player data
  Object.keys(games[gameCode].users).forEach(username => {
    games[gameCode].playerScores[username] = 0;
    games[gameCode].playerWords[username] = [];
    games[gameCode].playerWordDetails[username] = [];
    games[gameCode].playerAchievements[username] = [];
  });

  // Continue with rest of reset logic...
  // [Rest of existing handleResetGame code]
};

// ============================================================================
// IMPROVED cleanupGameTimers with acknowledgment cleanup
// ============================================================================
const cleanupGameTimers_IMPROVED = (gameCode) => {
  if (!games[gameCode]) {
    return;
  }

  const game = games[gameCode];

  console.log(`[CLEANUP] Cleaning up game ${gameCode} timers and references`);

  // Cancel any active game start sequence
  gameStartCoordinator.cancelSequence(gameCode);

  // Clear game timer interval
  if (game.timerInterval) {
    clearInterval(game.timerInterval);
    game.timerInterval = null;
  }

  // Clear validation timeout
  if (game.validationTimeout) {
    clearTimeout(game.validationTimeout);
    game.validationTimeout = null;
  }

  // Clear warning timeouts
  if (game.validationWarningTimeouts) {
    game.validationWarningTimeouts.forEach(timeout => clearTimeout(timeout));
    game.validationWarningTimeouts = null;
  }

  // Clear host disconnect timeout
  if (game.hostDisconnectTimeout) {
    clearTimeout(game.hostDisconnectTimeout);
    game.hostDisconnectTimeout = null;
  }

  // Clear player reconnect timeouts
  if (game.playerReconnectTimeouts) {
    Object.values(game.playerReconnectTimeouts).forEach(timeout => clearTimeout(timeout));
    game.playerReconnectTimeouts = null;
  }

  // Clear empty room timeout
  if (game.emptyRoomTimeout) {
    clearTimeout(game.emptyRoomTimeout);
    game.emptyRoomTimeout = null;
  }
};

// ============================================================================
// Helper function to log game start metrics
// ============================================================================
const logGameStartMetrics = (gameCode, stats) => {
  const metrics = {
    gameCode,
    timestamp: new Date().toISOString(),
    acknowledgedPlayers: stats.acknowledged || stats.acknowledgedCount,
    expectedPlayers: stats.expected || stats.expectedCount,
    missingPlayers: stats.missing ? stats.missing.length : 0,
    waitTimeMs: stats.waitTime,
    success: stats.acknowledgedCount === stats.expectedCount
  };

  console.log('[METRICS] Game start:', JSON.stringify(metrics));

  // You can send these metrics to your monitoring system
  // Example: sendToDatadog(metrics) or sendToCloudWatch(metrics)
};

// ============================================================================
// Export improved functions
// ============================================================================
module.exports = {
  handleStartGame_IMPROVED,
  handleStartGameAck_IMPROVED,
  handleDisconnect_IMPROVED,
  handleResetGame_IMPROVED,
  cleanupGameTimers_IMPROVED
};