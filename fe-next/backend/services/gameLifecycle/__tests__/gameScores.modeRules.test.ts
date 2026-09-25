/**
 * Results payload per mode comes from the mode registry (backend/modes): the
 * duplicate-rule flag the client shows matches the rule the scoring engine
 * actually applied, each mode contributes its own summary block, and Word Hunt
 * ranks the target finder first.
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

function payload(): Record<string, any> {
  return mockBroadcast.mock.calls.find((c: any[]) => c[2] === 'validatedScores')?.[3];
}

describe('calculateAndBroadcastFinalScores - mode rules and summaries', () => {
  beforeEach(() => vi.clearAllMocks());

  it('wheel-rush reports duplicateRuleDisabled — the rule the scoring engine applies there', async () => {
    mockGetGame.mockReturnValue(finishedGame({ gameMode: 'wheel-rush', wheelRushState: { playerStats: {} } }));
    await calculateAndBroadcastFinalScores(mockIo, 'EVT');
    expect(payload().duplicateRuleDisabled).toBe(true);
    expect(payload().wheelRushSummary).toEqual({ playerStats: {} });
  });

  it('classic in a small room keeps the duplicate rule and carries no mode summaries', async () => {
    mockGetGame.mockReturnValue(finishedGame());
    await calculateAndBroadcastFinalScores(mockIo, 'EVT');
    const p = payload();
    expect(p.duplicateRuleDisabled).toBe(false);
    expect(p.blastSummary).toBeUndefined();
    expect(p.wordHuntSummary).toBeUndefined();
    expect(p.wheelRushSummary).toBeUndefined();
  });

  it('word-hunt with NO target finder keeps every player (ranking override is a no-op)', async () => {
    mockGetGame.mockReturnValue(finishedGame({
      gameMode: 'word-hunt',
      wordHuntState: { targetWord: 'BRAVE', targetFoundBy: null, playerLives: {}, eliminatedPlayers: [] },
    }));
    await calculateAndBroadcastFinalScores(mockIo, 'EVT');
    expect(payload().scores.map((s: { username: string }) => s.username)).toEqual(['alice']);
  });

  it('blast contributes its summary block', async () => {
    mockGetGame.mockReturnValue(finishedGame({ gameMode: 'blast', blastModeState: { playerMoves: { alice: 3 }, playerStats: {} } }));
    await calculateAndBroadcastFinalScores(mockIo, 'EVT');
    expect(payload().blastSummary).toEqual({ playerMoves: { alice: 3 }, playerStats: {} });
  });

  it('word-hunt ranks the target finder first even with a lower score, and summarizes the hunt', async () => {
    mockGetGame.mockReturnValue(finishedGame({
      gameMode: 'word-hunt',
      users: { alice: { isBot: false, isHost: true }, bob: { isBot: false } },
      playerWords: { alice: ['hello'], bob: ['hi'] },
      playerWordDetails: {
        alice: [{ word: 'hello', score: 50, validated: true }],
        bob: [{ word: 'hi', score: 1, validated: true }],
      },
      playerScores: { alice: 0, bob: 0 },
      wordHuntState: { targetWord: 'BRAVE', targetFoundBy: 'bob', playerLives: {}, eliminatedPlayers: [] },
    }));
    await calculateAndBroadcastFinalScores(mockIo, 'EVT');
    const p = payload();
    expect(p.scores[0].username).toBe('bob');
    expect(p.wordHuntSummary).toEqual(expect.objectContaining({ targetWord: 'BRAVE', targetFoundBy: 'bob', foundTarget: true }));
    expect(p.duplicateRuleDisabled).toBe(true);
  });
});
