/**
 * Test: Word Hunt handler registration in registerAllHandlers
 *
 * TDD RED phase — verifies registerWordHuntHandlers is called
 */

// Mock all handler modules to isolate registration test
jest.mock('../gameHandler', () => ({ registerGameHandlers: jest.fn(), MAX_PLAYERS_PER_ROOM: 8 }));
jest.mock('../wordHandler', () => ({ registerWordHandlers: jest.fn() }));
jest.mock('../chatHandler', () => ({ registerChatHandlers: jest.fn() }));
jest.mock('../botHandler', () => ({ registerBotHandlers: jest.fn() }));
jest.mock('../tournamentHandler', () => ({ registerTournamentHandlers: jest.fn() }));
jest.mock('../presenceHandler', () => ({ registerPresenceHandlers: jest.fn(), startConnectionHealthCheck: jest.fn() }));
jest.mock('../friendsHandler', () => ({ registerFriendsHandlers: jest.fn() }));
jest.mock('../friendMessagingHandler', () => ({ registerFriendMessagingHandlers: jest.fn() }));
jest.mock('../friendChallengeHandler', () => ({ registerFriendChallengeHandlers: jest.fn() }));
jest.mock('../hostHandler', () => ({ registerHostHandlers: jest.fn() }));
jest.mock('../connectionHandler', () => ({ registerConnectionHandlers: jest.fn() }));
jest.mock('../hintHandler', () => ({ registerHintHandlers: jest.fn() }));
jest.mock('../engagementHandler', () => ({
  registerEngagementHandlers: jest.fn(),
  processGameEndEngagement: jest.fn(),
  processLongWordEngagement: jest.fn(),
  processAchievementEngagement: jest.fn(),
}));
jest.mock('../earthquakeHandler', () => ({ registerEarthquakeHandlers: jest.fn(), clearGameEarthquakeState: jest.fn() }));
jest.mock('../scorecardHandler', () => ({ registerScorecardHandlers: jest.fn() }));
jest.mock('../vocabularyHandler', () => ({ registerVocabularyHandlers: jest.fn() }));
jest.mock('../classroomGameHandler', () => ({ registerClassroomGameHandlers: jest.fn() }));
jest.mock('../avatarHandler', () => ({ registerAvatarHandlers: jest.fn() }));
jest.mock('../vocabularyEnrichmentHandler', () => ({ vocabularyEnrichmentHandler: jest.fn() }));
jest.mock('../wordHuntHandler', () => ({ registerWordHuntHandlers: jest.fn() }));
jest.mock('../shared', () => ({
  startGameTimer: jest.fn(),
  endGame: jest.fn(),
  calculateAndBroadcastFinalScores: jest.fn(),
  isSocketMigrating: jest.fn(),
}));
jest.mock('../../modules/gameStateManager', () => ({ getGame: jest.fn() }));

import { registerAllHandlers } from '../index';
import { registerWordHuntHandlers } from '../wordHuntHandler';

describe('registerAllHandlers includes Word Hunt', () => {
  it('should call registerWordHuntHandlers with io and socket', () => {
    const mockIo = {} as any;
    const mockSocket = { on: jest.fn() } as any;

    registerAllHandlers(mockIo, mockSocket);

    expect(registerWordHuntHandlers).toHaveBeenCalledWith(mockIo, mockSocket);
  });
});
