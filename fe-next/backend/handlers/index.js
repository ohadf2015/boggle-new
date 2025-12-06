/**
 * Socket Handler Registry
 * Central export for all socket event handlers
 */

const { registerGameHandlers } = require('./gameHandler');
const { MAX_PLAYERS_PER_ROOM } = require('../utils/consts');
const { registerWordHandlers } = require('./wordHandler');
const { registerChatHandlers } = require('./chatHandler');
const { registerBotHandlers } = require('./botHandler');
const { registerTournamentHandlers } = require('./tournamentHandler');
const { registerPresenceHandlers, startConnectionHealthCheck } = require('./presenceHandler');
const { registerHostHandlers } = require('./hostHandler');
const { registerConnectionHandlers } = require('./connectionHandler');
const {
  startGameTimer,
  endGame,
  calculateAndBroadcastFinalScores,
  isSocketMigrating
} = require('./shared');

/**
 * Register all socket event handlers for a connection
 * @param {Server} io - Socket.IO server instance
 * @param {Socket} socket - Socket.IO socket instance
 */
function registerAllHandlers(io, socket) {
  registerGameHandlers(io, socket);
  registerWordHandlers(io, socket);
  registerChatHandlers(io, socket);
  registerBotHandlers(io, socket);
  registerTournamentHandlers(io, socket);
  registerPresenceHandlers(io, socket);
  registerHostHandlers(io, socket);
  registerConnectionHandlers(io, socket);
}

module.exports = {
  // Main registration function
  registerAllHandlers,

  // Individual handler registrations (for selective use)
  registerGameHandlers,
  registerWordHandlers,
  registerChatHandlers,
  registerBotHandlers,
  registerTournamentHandlers,
  registerPresenceHandlers,
  registerHostHandlers,
  registerConnectionHandlers,

  // Shared utilities
  startGameTimer,
  endGame,
  calculateAndBroadcastFinalScores,
  isSocketMigrating,
  startConnectionHealthCheck,

  // Configuration
  MAX_PLAYERS_PER_ROOM
};
