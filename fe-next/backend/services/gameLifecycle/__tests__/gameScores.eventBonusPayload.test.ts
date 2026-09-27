/**
 * End-to-end: the live-only event bonus accumulator (golden/lightning/special-word/
 * word-hunt-board + target-finder) must survive the final-score recompute and land in
 * the actual `validatedScores` payload the result page consumes. This bridges the
 * per-link unit tests (handler writes the accumulator; calculateGameScores reads it)
 * by exercising the REAL calculateGameScores through calculateAndBroadcastFinalScores
 * and asserting the broadcast payload.
 */

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
  getGameRoom: vi.fn().mockReturnValue('room:EVT'),
}));

vi.mock('../../../modules/supabaseServer', () => ({
  isSupabaseConfigured: vi.fn().mockReturnValue(false),
}));

import { vi, type Mock } from 'vitest';
import { getGame } from '../../../modules/gameStateManager';
import { broadcastToRoom } from '../../../utils/socketHelpers';
import { calculateAndBroadcastFinalScores } from '../gameScores';

const mockGetGame = getGame as Mock;
const mockBroadcast = broadcastToRoom as Mock;
const mockIo = {} as any;

function finishedGame(overrides: Record<string, unknown> = {}) {
  return {
    gameState: 'finished',
    gameMode: 'classic',
    language: 'en',
    hostUsername: 'alice',
    users: { alice: { isBot: false, isHost: true } },
    playerWords: { alice: ['hello'] },
    playerWordDetails: { alice: [{ word: 'hello', score: 50, validated: true }] },
    playerScores: { alice: 0 },
    playerAchievements: {},
    letterGrid: [['A']],
    gameSessionId: 'sess-1',
    ...overrides,
  };
}

function lastValidatedScore(username: string): number | undefined {
  const call = mockBroadcast.mock.calls.find((c: any[]) => c[2] === 'validatedScores');
  return call?.[3]?.scores?.find((s: any) => s.username === username)?.score;
}

describe('calculateAndBroadcastFinalScores - event bonus reaches the validatedScores payload', () => {
  beforeEach(() => vi.clearAllMocks());

  it('includes the per-player event bonus in the broadcast result score', async () => {
    // Single player → 'hello' found by 100% → common (rarity 1.0) → word score 50.
    // playerEventBonuses simulates a golden-word bonus added live but not stored per-word.
    mockGetGame.mockReturnValue(finishedGame({ playerEventBonuses: { alice: 25 } }));

    await calculateAndBroadcastFinalScores(mockIo, 'EVT');

    expect(lastValidatedScore('alice')).toBe(75);
  });

  it('without an accumulator the payload score is just the recomputed word score (discriminating control)', async () => {
    mockGetGame.mockReturnValue(finishedGame());

    await calculateAndBroadcastFinalScores(mockIo, 'EVT');

    expect(lastValidatedScore('alice')).toBe(50);
  });
});
