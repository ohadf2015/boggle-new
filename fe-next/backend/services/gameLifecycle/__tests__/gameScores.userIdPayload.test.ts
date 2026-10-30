vi.mock('../../../modules/gameStateManager', () => ({
  getGame: vi.fn(),
}));

vi.mock('../../../dictionary', () => ({
  isDictionaryWord: vi.fn().mockReturnValue(true),
}));

vi.mock('../../../modules/communityWordManager', () => ({
  isWordCommunityValid: vi.fn().mockReturnValue(false),
  isWordValidForScoring: vi.fn().mockReturnValue(false),
}));

vi.mock('../../../modules/achievementManager', () => ({
  awardFinalAchievements: vi.fn(),
  ACHIEVEMENT_ICONS: {},
}));

vi.mock('../../../modules/playerTitlesManager', () => ({
  calculatePlayerTitles: vi.fn().mockReturnValue({}),
}));

vi.mock('../../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  getGameRoom: vi.fn().mockReturnValue('room:UID'),
}));

vi.mock('../../../modules/supabaseServer', () => ({
  isSupabaseConfigured: vi.fn().mockReturnValue(false),
}));

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { getGame } from '../../../modules/gameStateManager';
import { broadcastToRoom } from '../../../utils/socketHelpers';
import { calculateAndBroadcastFinalScores } from '../gameScores';

const mockGetGame = getGame as Mock;
const mockBroadcast = broadcastToRoom as Mock;

function payloadScores() {
  const call = mockBroadcast.mock.calls.find((c: any[]) => c[2] === 'validatedScores');
  return call?.[3]?.scores as Array<Record<string, unknown>>;
}

describe('calculateAndBroadcastFinalScores - final score rows carry the signed-in user id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('a signed-in player row has userId; a guest and a bot have none', async () => {
    mockGetGame.mockReturnValue({
      gameState: 'finished',
      gameMode: 'classic',
      language: 'en',
      hostUsername: 'alice',
      users: {
        alice: { isBot: false, isHost: true, authUserId: 'uuid-alice' },
        guest: { isBot: false },
        botty: { isBot: true, authUserId: 'should-not-leak' },
      },
      playerWords: { alice: ['hello'], guest: ['world'], botty: ['cat'] },
      playerWordDetails: {},
      playerScores: { alice: 0, guest: 0, botty: 0 },
      playerAchievements: {},
      letterGrid: [['A']],
      gameSessionId: 'sess-1',
    });

    await calculateAndBroadcastFinalScores({} as any, 'UID');

    const rows = payloadScores();
    expect(rows.find((r) => r.username === 'alice')?.userId).toBe('uuid-alice');
    expect(rows.find((r) => r.username === 'guest')).not.toHaveProperty('userId');
    expect(rows.find((r) => r.username === 'botty')).not.toHaveProperty('userId');
  });

  it('a classroom room never broadcasts user ids (anonymous students have one)', async () => {
    mockGetGame.mockReturnValue({
      gameState: 'finished',
      gameMode: 'classic',
      language: 'en',
      hostUsername: 'teacher',
      isClassroom: true,
      users: { teacher: { isHost: true, authUserId: 'uuid-t' }, kid: { authUserId: 'uuid-anon-kid' } },
      playerWords: { teacher: [], kid: ['hello'] },
      playerWordDetails: {},
      playerScores: { teacher: 0, kid: 0 },
      playerAchievements: {},
      letterGrid: [['A']],
      gameSessionId: 'sess-2',
    });

    await calculateAndBroadcastFinalScores({} as any, 'UID');

    for (const r of payloadScores()) expect(r).not.toHaveProperty('userId');
  });
});
