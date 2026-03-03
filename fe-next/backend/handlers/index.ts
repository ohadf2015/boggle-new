/**
 * Socket Handler Registry
 * Central export for all socket event handlers
 */

import type { Server, Socket } from 'socket.io';

import { registerGameHandlers, MAX_PLAYERS_PER_ROOM } from './gameHandler.js';
import { registerWordHandlers } from './wordHandler.js';
import { registerChatHandlers } from './chatHandler.js';
import { registerBotHandlers } from './botHandler.js';
import { registerTournamentHandlers } from './tournamentHandler.js';
import { registerPresenceHandlers, startConnectionHealthCheck } from './presenceHandler.js';
import { registerFriendsHandlers } from './friendsHandler.js';
import { registerFriendMessagingHandlers } from './friendMessagingHandler.js';
import { registerFriendChallengeHandlers } from './friendChallengeHandler.js';
import { registerHostHandlers } from './hostHandler.js';
import { registerConnectionHandlers } from './connectionHandler.js';
import { registerHintHandlers } from './hintHandler.js';
import {
  registerEngagementHandlers,
  processGameEndEngagement,
  processLongWordEngagement,
  processAchievementEngagement,
} from './engagementHandler.js';
import { registerEarthquakeHandlers, clearGameEarthquakeState } from './earthquakeHandler.js';
import { registerScorecardHandlers } from './scorecardHandler.js';
import { registerVocabularyHandlers } from './vocabularyHandler.js';
import { registerClassroomGameHandlers } from './classroomGameHandler.js';
import { registerAvatarHandlers } from './avatarHandler.js';
import { vocabularyEnrichmentHandler } from './vocabularyEnrichmentHandler.js';
import {
  startGameTimer,
  endGame,
  calculateAndBroadcastFinalScores,
  isSocketMigrating
} from './shared.js';
import { getGame } from '../modules/gameStateManager.js';

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
  registerFriendsHandlers(io, socket);
  registerFriendMessagingHandlers(io, socket);
  registerFriendChallengeHandlers(io, socket);
  registerHostHandlers(io, socket);
  registerConnectionHandlers(io, socket);
  registerHintHandlers(io, socket);
  registerEngagementHandlers(io, socket);
  registerEarthquakeHandlers(io, socket);
  registerScorecardHandlers(io, socket);
  registerVocabularyHandlers(socket, (code: string) => {
    return getGame(code);
  });
  registerClassroomGameHandlers(io, socket);
  registerAvatarHandlers(io, socket);

  // Register vocabulary enrichment handler for flashcard training
  socket.on('enrichVocabulary', (payload) => {
    vocabularyEnrichmentHandler(socket, payload);
  });
}

export {
  registerAllHandlers,
  registerGameHandlers,
  registerWordHandlers,
  registerChatHandlers,
  registerBotHandlers,
  registerTournamentHandlers,
  registerPresenceHandlers,
  registerFriendsHandlers,
  registerFriendMessagingHandlers,
  registerFriendChallengeHandlers,
  registerHostHandlers,
  registerConnectionHandlers,
  registerHintHandlers,
  registerEngagementHandlers,
  registerEarthquakeHandlers,
  registerScorecardHandlers,
  registerVocabularyHandlers,
  registerClassroomGameHandlers,
  registerAvatarHandlers,
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
