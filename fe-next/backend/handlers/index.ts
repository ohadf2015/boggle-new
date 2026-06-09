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
import { registerUserReportHandlers } from './userReportHandler.js';
import { registerHostHandlers } from './hostHandler.js';
import { registerConnectionHandlers } from './connectionHandler.js';
import { registerHintHandlers } from './hintHandler.js';
import { registerEngagementHandlers } from './engagementHandler.js';
import { registerEarthquakeHandlers } from './earthquakeHandler.js';
import { registerScorecardHandlers } from './scorecardHandler.js';
import { registerVocabularyHandlers } from './vocabularyHandler.js';
import { registerClassroomGameHandlers } from './classroomGameHandler.js';
import { registerAvatarHandlers } from './avatarHandler.js';
import { registerWordHuntHandlers } from './wordHuntHandler.js';
import { registerWheelRushHandlers } from './wheelRushHandler.js';
import { registerShiritoriHandlers } from './shiritoriHandler.js';
import { registerSealedBidHandlers } from './sealedBidHandler.js';
import { registerCrosswordHandlers } from './crosswordHandler.js';
import { registerWordTowerHandlers } from './wordTowerHandler.js';
import { registerWordPackHandler } from './wordPackHandler.js';
import { registerKickHandler } from './kickHandler.js';
import { registerReactionHandlers } from './reactionHandler.js';
import { registerLobbyEmoteHandlers } from './lobbyEmoteHandler.js';
import { registerLobbyAdGateHandlers } from './lobbyAdGateHandler.js';
import { registerGiftHandlers } from './giftHandler.js';
import { registerPartyHandlers } from './partyHandler.js';
import { registerBoostHandlers } from './boostHandler.js';
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
  registerUserReportHandlers(io, socket);
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
  registerWordHuntHandlers(io, socket);
  registerWheelRushHandlers(io, socket);
  registerShiritoriHandlers(io, socket);
  registerSealedBidHandlers(io, socket);
  registerCrosswordHandlers(io, socket);
  registerWordTowerHandlers(io, socket);
  registerWordPackHandler(io, socket);
  registerKickHandler(io, socket);
  registerReactionHandlers(io, socket);
  registerLobbyEmoteHandlers(io, socket);
  registerLobbyAdGateHandlers(io, socket);
  registerGiftHandlers(io, socket);
  registerPartyHandlers(io, socket);
  registerBoostHandlers(io, socket);
}

export {
  registerAllHandlers,
  startConnectionHealthCheck,
  MAX_PLAYERS_PER_ROOM
};
