/**
 * PRODUCT DECISION: the LIVE score is the truth — results must never show a
 * different per-word number than what the player saw live. `playerWordDetails
 * [...].score` is the exact number `wordAccepted.score` emitted live (both
 * read the same `scored.total`, see wordValidationHandler.ts), so it stands
 * in for "what the human's client received" here.
 *
 * Known drift (now fixed): in a human+bots room, calculateAndBroadcastFinalScores
 * built wordCountMap from humans only but passed the ALL-users count (including
 * bots) as the rarity percentage's denominator, so a solo human's word (100%
 * of the humans who could find it) could get tagged "uncommon" purely because
 * bots inflated the denominator — a rarity bonus live scoring never applies
 * (live's rarity multiplier is always 1).
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
  getGameRoom: vi.fn().mockReturnValue('room:RARITY'),
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

function lastValidatedPayload(): any {
  const call = mockBroadcast.mock.calls.find((c: any[]) => c[2] === 'validatedScores');
  return call?.[3];
}

function wordScoreFor(username: string, word: string): number | undefined {
  const scores = lastValidatedPayload()?.scores as any[] | undefined;
  return scores?.find((s) => s.username === username)?.allWords?.find((w: any) => w.word === word)?.score;
}

describe('calculateAndBroadcastFinalScores — rarity never diverges from the live score in a human+bots room', () => {
  beforeEach(() => vi.clearAllMocks());

  it('classic: a solo human playing alongside bots gets the SAME per-word score as live (no rarity bonus)', async () => {
    mockGetGame.mockReturnValue({
      gameState: 'finished',
      gameMode: 'classic',
      language: 'en',
      hostUsername: 'alice',
      users: {
        alice: { isBot: false, isHost: true },
        bot1: { isBot: true },
        bot2: { isBot: true },
        bot3: { isBot: true },
      },
      playerWords: { alice: ['zephyr'], bot1: [], bot2: [], bot3: [] },
      // 10 is the LIVE per-word score (== what wordAccepted.score sent the client).
      playerWordDetails: { alice: [{ word: 'zephyr', score: 10, validated: true }] },
      playerScores: { alice: 0, bot1: 0, bot2: 0, bot3: 0 },
      playerAchievements: {},
      letterGrid: [['A']],
      gameSessionId: 'sess-rarity-1',
    });

    await calculateAndBroadcastFinalScores(mockIo, 'RARITY');

    expect(wordScoreFor('alice', 'zephyr')).toBe(10);
  });

  it('classic: a word every human found is never bumped by rarity just because bots are in the room', async () => {
    // 2 humans + 5 bots = 7 total (stays at/under the >7 big-room threshold that
    // would otherwise disable rarity for an unrelated reason and mask this bug).
    const users: Record<string, unknown> = {
      alice: { isBot: false, isHost: true },
      bob: { isBot: false },
    };
    for (let i = 1; i <= 5; i++) users[`bot${i}`] = { isBot: true };

    mockGetGame.mockReturnValue({
      gameState: 'finished',
      gameMode: 'classic',
      language: 'en',
      hostUsername: 'alice',
      users,
      playerWords: { alice: ['zephyr'], bob: ['zephyr'] },
      playerWordDetails: {
        alice: [{ word: 'zephyr', score: 10, validated: true }],
        bob: [{ word: 'zephyr', score: 10, validated: true }],
      },
      playerScores: { alice: 0, bob: 0 },
      playerAchievements: {},
      letterGrid: [['A']],
      gameSessionId: 'sess-rarity-2',
    });

    await calculateAndBroadcastFinalScores(mockIo, 'RARITY');

    expect(wordScoreFor('alice', 'zephyr')).toBe(10);
    expect(wordScoreFor('bob', 'zephyr')).toBe(10);
  });

  it('word-hunt: a solo human playing alongside bots gets the SAME per-word board-word score as live (rarity already off; regression guard)', async () => {
    mockGetGame.mockReturnValue({
      gameState: 'finished',
      gameMode: 'word-hunt',
      language: 'en',
      hostUsername: 'alice',
      users: {
        alice: { isBot: false, isHost: true },
        bot1: { isBot: true },
        bot2: { isBot: true },
        bot3: { isBot: true },
      },
      playerWords: { alice: ['cat'], bot1: [], bot2: [], bot3: [] },
      // Board word live score, excluding the word-hunt board bonus (that's a
      // separate per-player event-bonus, not part of the per-word number).
      playerWordDetails: { alice: [{ word: 'cat', score: 3, validated: true }] },
      playerScores: { alice: 0, bot1: 0, bot2: 0, bot3: 0 },
      playerAchievements: {},
      letterGrid: [['A']],
      gameSessionId: 'sess-rarity-3',
    });

    await calculateAndBroadcastFinalScores(mockIo, 'RARITY');

    expect(wordScoreFor('alice', 'cat')).toBe(3);
  });
});
