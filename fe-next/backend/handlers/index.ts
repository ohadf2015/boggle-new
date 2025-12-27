/**
 * Socket Handler Registry
 * Central export for all socket event handlers
 */

import type { Server, Socket } from 'socket.io';

const { registerGameHandlers } = require('./gameHandler');
const { MAX_PLAYERS_PER_ROOM } = require('../utils/consts');
const { registerWordHandlers } = require('./wordHandler');
const { registerChatHandlers } = require('./chatHandler');
const { registerBotHandlers } = require('./botHandler');
const { registerTournamentHandlers } = require('./tournamentHandler');
const { registerPresenceHandlers, startConnectionHealthCheck } = require('./presenceHandler');
const { registerHostHandlers } = require('./hostHandler');
const { registerConnectionHandlers } = require('./connectionHandler');
const { registerHintHandlers } = require('./hintHandler');
const {
  registerEngagementHandlers,
  processGameEndEngagement,
  processLongWordEngagement,
  processAchievementEngagement,
} = require('./engagementHandler');
const { registerEarthquakeHandlers, clearGameEarthquakeState } = require('./earthquakeHandler');
const { registerScorecardHandlers } = require('./scorecardHandler');
const {
  startGameTimer,
  endGame,
  calculateAndBroadcastFinalScores,
  isSocketMigrating
} = require('./shared');

/**
 * Register all socket event handlers for a connection
 * @param io - Socket.IO server instance
 * @param socket - Socket.IO socket instance
 */
function registerAllHandlers(io: Server, socket: Socket): void {
  registerGameHandlers(io, socket);
  registerWordHandlers(io, socket);
  registerChatHandlers(io, socket);
  registerBotHandlers(io, socket);
  registerTournamentHandlers(io, socket);
  registerPresenceHandlers(io, socket);
  registerHostHandlers(io, socket);
  registerConnectionHandlers(io, socket);
  registerHintHandlers(io, socket);
  registerEngagementHandlers(io, socket);
  registerEarthquakeHandlers(io, socket);
  registerScorecardHandlers(io, socket);
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
  registerHintHandlers,
  registerEngagementHandlers,
  registerEarthquakeHandlers,
  registerScorecardHandlers,

  // Engagement utilities (for use in other handlers)
  processGameEndEngagement,
  processLongWordEngagement,
  processAchievementEngagement,

  // Shared utilities
  startGameTimer,
  endGame,
  calculateAndBroadcastFinalScores,
  isSocketMigrating,
  startConnectionHealthCheck,
  clearGameEarthquakeState,

  // Configuration
  MAX_PLAYERS_PER_ROOM
};

export {
  registerAllHandlers,
  registerGameHandlers,
  registerWordHandlers,
  registerChatHandlers,
  registerBotHandlers,
  registerTournamentHandlers,
  registerPresenceHandlers,
  registerHostHandlers,
  registerConnectionHandlers,
  registerHintHandlers,
  registerEngagementHandlers,
  registerEarthquakeHandlers,
  registerScorecardHandlers,
  processGameEndEngagement,
  processLongWordEngagement,
  processAchievementEngagement,
  startGameTimer,
  endGame,
  calculateAndBroadcastFinalScores,
  isSocketMigrating,
  startConnectionHealthCheck,
  clearGameEarthquakeState,
  MAX_PLAYERS_PER_ROOM
};
