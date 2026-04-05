/**
 * Test: Word Hunt handler registration in registerAllHandlers
 *
 * TDD RED phase — verifies registerWordHuntHandlers is called
 */

// Mock all handler modules to isolate registration test
vi.mock('../gameHandler', () => ({ registerGameHandlers: vi.fn(), MAX_PLAYERS_PER_ROOM: 8 }));
vi.mock('../wordHandler', () => ({ registerWordHandlers: vi.fn() }));
vi.mock('../chatHandler', () => ({ registerChatHandlers: vi.fn() }));
vi.mock('../botHandler', () => ({ registerBotHandlers: vi.fn() }));
vi.mock('../tournamentHandler', () => ({ registerTournamentHandlers: vi.fn() }));
vi.mock('../presenceHandler', () => ({ registerPresenceHandlers: vi.fn(), startConnectionHealthCheck: vi.fn() }));
vi.mock('../friendsHandler', () => ({ registerFriendsHandlers: vi.fn() }));
vi.mock('../friendMessagingHandler', () => ({ registerFriendMessagingHandlers: vi.fn() }));
vi.mock('../friendChallengeHandler', () => ({ registerFriendChallengeHandlers: vi.fn() }));
vi.mock('../hostHandler', () => ({ registerHostHandlers: vi.fn() }));
vi.mock('../connectionHandler', () => ({ registerConnectionHandlers: vi.fn() }));
vi.mock('../hintHandler', () => ({ registerHintHandlers: vi.fn() }));
vi.mock('../engagementHandler', () => ({
  registerEngagementHandlers: vi.fn(),
  processGameEndEngagement: vi.fn(),
  processLongWordEngagement: vi.fn(),
  processAchievementEngagement: vi.fn(),
}));
vi.mock('../earthquakeHandler', () => ({ registerEarthquakeHandlers: vi.fn(), clearGameEarthquakeState: vi.fn() }));
vi.mock('../scorecardHandler', () => ({ registerScorecardHandlers: vi.fn() }));
vi.mock('../vocabularyHandler', () => ({ registerVocabularyHandlers: vi.fn() }));
vi.mock('../classroomGameHandler', () => ({ registerClassroomGameHandlers: vi.fn() }));
vi.mock('../avatarHandler', () => ({ registerAvatarHandlers: vi.fn() }));
vi.mock('../wordHuntHandler', () => ({ registerWordHuntHandlers: vi.fn() }));
vi.mock('../shared', () => ({
  startGameTimer: vi.fn(),
  endGame: vi.fn(),
  calculateAndBroadcastFinalScores: vi.fn(),
  isSocketMigrating: vi.fn(),
}));
vi.mock('../../modules/gameStateManager', () => ({ getGame: vi.fn() }));

import { vi, type Mock, type MockInstance } from 'vitest';
import { registerAllHandlers } from '../index';
import { registerWordHuntHandlers } from '../wordHuntHandler';

describe('registerAllHandlers includes Word Hunt', () => {
  it('should call registerWordHuntHandlers with io and socket', () => {
    const mockIo = {} as any;
    const mockSocket = { on: vi.fn() } as any;

    registerAllHandlers(mockIo, mockSocket);

    expect(registerWordHuntHandlers).toHaveBeenCalledWith(mockIo, mockSocket);
  });
});
