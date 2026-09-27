/**
 * Round-trip serialization test for game state Redis persistence.
 * Validates that all fields — including Map, Set, and nested objects —
 * survive the full save → getGameState → restoreGameFromRedis cycle.
 */

// Mock logger
vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} }));

// Capture hset calls and return them from hgetall
let storedHash: Record<string, string> = {};

const mockPipeline = {
  hset: vi.fn((key: string, field: string, value: string) => {
    storedHash[field] = value;
    return mockPipeline;
  }),
  expire: vi.fn(() => mockPipeline),
  exec: vi.fn(async () => []),
};

const mockRedisClient = {
  pipeline: vi.fn(() => mockPipeline),
  hgetall: vi.fn(async () => ({ ...storedHash })),
  del: vi.fn(async () => 1),
};

vi.mock('../connection', () => ({
  getRedisClient: () => mockRedisClient,
  isRedisAvailable: () => true,
}));

vi.mock('../circuitBreaker', () => ({
  circuitBreaker: {
    execute: (fn: () => Promise<unknown>) => fn(),
  },
}));

import { vi, type Mock, type MockInstance } from 'vitest';
import { saveGameState, getGameState } from '../gameState';
import { restoreGameFromRedis } from '../../modules/gameState/persistence';
import type { GameState } from '../../modules/gameState/types';

describe('Game state round-trip serialization', () => {
  beforeEach(() => {
    storedHash = {};
    vi.clearAllMocks();
  });

  it('preserves all fields through save → get → restore cycle', async () => {
    // --- Arrange: a GameState with every non-trivial field populated ---
    const gameInput = {
      roomName: 'TestRoom',
      users: {
        alice: {
          socketId: 'sock-alice',
          avatar: { emoji: '🦊', color: '#ff0000' },
          isHost: true,
          authUserId: 'auth-123',
          guestTokenHash: null,
          isBot: false,
        },
        bob: {
          socketId: 'sock-bob',
          avatar: null,
          isHost: false,
          authUserId: null,
          guestTokenHash: 'hash-456',
          isBot: true,
          botDifficulty: 'hard',
        },
      },
      spectators: {
        carol: {
          socketId: 'sock-carol',
          avatar: null,
          authUserId: 'auth-789',
          guestTokenHash: null,
          joinedAt: 1700000000000,
        },
      },
      playerScores: { alice: 250, bob: 180 },
      playerWords: { alice: ['cat', 'dog', 'zebra'], bob: ['fish'] },
      playerAchievements: { alice: [{ id: 'first-word', achievedAt: 1700000001000 }] },
      playerWordDetails: { alice: [{ word: 'cat', score: 3 }] },
      playerCombos: { alice: 4, bob: 1 },
      firstWordFound: { alice: true, bob: false },
      gameState: 'in-progress',
      startTime: '2025-01-01T00:00:00Z',
      endTime: '',
      letterGrid: [['A', 'B', 'C', 'D'], ['E', 'F', 'G', 'H'], ['I', 'J', 'K', 'L'], ['M', 'N', 'O', 'P']],
      timerSeconds: 180,
      remainingTime: 95,
      language: 'he',
      tournamentId: 'tourney-1',
      gameMode: 'blast',
      blastModeState: { wave: 3, tilesRemaining: 12 },
      wordHuntState: null,
      isRanked: true,
      allowLateJoin: false,
      chatHistory: [{ username: 'alice', message: 'hello', timestamp: 1700000002000 }],
      aiApprovedWords: [{ word: 'qat', submitter: 'alice', score: 3, confidence: 0.95 }],
      peerValidationVotes: { alice: 'valid', bob: 'invalid' },
      cachedResultsPayload: { scores: { alice: 250 } },
      // Non-serializable types:
      letterPositions: new Map([
        ['A', [[0, 0]]],
        ['B', [[0, 1]]],
        ['E', [[1, 0]]],
      ]),
      selectedVocabulary: new Set(['cat', 'dog', 'fish', 'zebra']),
      lessonVocabulary: new Set(['vocabulary', 'lesson']),
      kickedPlayers: new Set(['dave']),
      createdAt: 1700000000000,
      lastActivity: 1700000003000,
      gameDuration: 180,
      minWordLength: 3,
      difficulty: 'HARD',
      gameStartedAt: 1700000000500,
      hostUsername: 'alice',
      hostPlayerId: 'auth-123',
    };

    // --- Act: save to "Redis" (captured in storedHash) ---
    await saveGameState('ROUND_TRIP', gameInput as any);

    // Verify something was written
    expect(Object.keys(storedHash).length).toBeGreaterThan(20);

    // --- Act: read back from "Redis" ---
    const redisState = await getGameState('ROUND_TRIP');
    expect(redisState).not.toBeNull();

    // --- Assert: key scalar fields ---
    expect(redisState!.roomName).toBe('TestRoom');
    expect(redisState!.gameState).toBe('in-progress');
    expect(redisState!.language).toBe('he');
    expect(redisState!.timerSeconds).toBe(180);
    expect(redisState!.remainingTime).toBe(95);
    expect(redisState!.isRanked).toBe(true);
    expect(redisState!.allowLateJoin).toBe(false);
    expect(redisState!.tournamentId).toBe('tourney-1');
    expect(redisState!.gameMode).toBe('blast');
    expect(redisState!.difficulty).toBe('HARD');
    expect(redisState!.minWordLength).toBe(3);
    expect(redisState!.gameDuration).toBe(180);
    expect(redisState!.gameStartedAt).toBe(1700000000500);
    expect(redisState!.hostUsername).toBe('alice');
    expect(redisState!.hostPlayerId).toBe('auth-123');
    expect(redisState!.createdAt).toBe(1700000000000);
    expect(redisState!.lastActivity).toBe(1700000003000);

    // --- Assert: nested objects ---
    expect(redisState!.playerScores).toEqual({ alice: 250, bob: 180 });
    expect(redisState!.playerWords.alice).toEqual(['cat', 'dog', 'zebra']);
    expect(redisState!.playerCombos).toEqual({ alice: 4, bob: 1 });
    expect(redisState!.blastModeState).toEqual({ wave: 3, tilesRemaining: 12 });
    expect(redisState!.wordHuntState).toBeNull();
    expect(redisState!.chatHistory).toHaveLength(1);
    expect(redisState!.aiApprovedWords).toHaveLength(1);
    expect(redisState!.peerValidationVotes).toEqual({ alice: 'valid', bob: 'invalid' });
    expect(redisState!.cachedResultsPayload).toEqual({ scores: { alice: 250 } });

    // --- Assert: usersV2 preserved (socketId stripped) ---
    expect(redisState!.usersV2).toBeDefined();
    const aliceUser = (redisState!.usersV2 as Record<string, any>).alice;
    expect(aliceUser.isHost).toBe(true);
    expect(aliceUser.authUserId).toBe('auth-123');
    expect(aliceUser.socketId).toBeUndefined(); // stripped

    // --- Assert: Map/Set serialized as arrays ---
    expect(redisState!.letterPositions).toEqual([
      ['A', [[0, 0]]],
      ['B', [[0, 1]]],
      ['E', [[1, 0]]],
    ]);
    expect(redisState!.selectedVocabulary).toEqual(expect.arrayContaining(['cat', 'dog', 'fish', 'zebra']));
    expect(redisState!.lessonVocabulary).toEqual(expect.arrayContaining(['vocabulary', 'lesson']));
    expect(redisState!.kickedPlayers).toEqual(['dave']);

    // --- Act: restore into in-memory GameState (reconstructs Map/Set) ---
    const games: Record<string, GameState> = {};

    const restored = await restoreGameFromRedis('ROUND_TRIP', games);
    expect(restored).not.toBeNull();

    // --- Assert: Map reconstructed ---
    expect(restored.letterPositions).toBeInstanceOf(Map);
    expect(restored.letterPositions.get('A')).toEqual([[0, 0]]);
    expect(restored.letterPositions.get('E')).toEqual([[1, 0]]);

    // --- Assert: Sets reconstructed ---
    expect(restored.selectedVocabulary).toBeInstanceOf(Set);
    expect(restored.selectedVocabulary.has('cat')).toBe(true);
    expect(restored.selectedVocabulary.has('zebra')).toBe(true);

    expect(restored.lessonVocabulary).toBeInstanceOf(Set);
    expect(restored.lessonVocabulary.has('vocabulary')).toBe(true);

    expect(restored.kickedPlayers).toBeInstanceOf(Set);
    expect(restored.kickedPlayers.has('dave')).toBe(true);

    // --- Assert: playerWordsSet reconstructed for O(1) lookup ---
    expect(restored.playerWordsSet).toBeDefined();
    expect(restored.playerWordsSet.alice).toBeInstanceOf(Set);
    expect(restored.playerWordsSet.alice.has('cat')).toBe(true);
    expect(restored.playerWordsSet.alice.has('fish')).toBe(false);

    // --- Assert: users restored with nulled socketIds ---
    expect(restored.users.alice).toBeDefined();
    expect(restored.users.alice.socketId).toBeNull();
    expect(restored.users.alice.isHost).toBe(true);

    // --- Assert: metadata ---
    expect(restored.restoredFromRedis).toBe(true);
    expect(restored.hostSocketId).toBeNull(); // stale after crash
    expect(restored.hostUsername).toBe('alice');
    expect(restored.gameMode).toBe('blast');
    expect(restored.isRanked).toBe(true);
    expect(restored.allowLateJoin).toBe(false);
  });

  it('handles empty/minimal game state without errors', async () => {
    const minimal = {
      roomName: 'Empty',
      users: {},
      playerScores: {},
      playerWords: {},
      gameState: 'waiting',
      letterGrid: [],
      timerSeconds: 60,
      language: 'en',
    };

    await saveGameState('MINIMAL', minimal as any);
    const result = await getGameState('MINIMAL');

    expect(result).not.toBeNull();
    expect(result!.roomName).toBe('Empty');
    expect(result!.playerScores).toEqual({});
    expect(result!.letterGrid).toEqual([]);
    expect(result!.isRanked).toBe(false);
    expect(result!.allowLateJoin).toBe(true); // default
  });
});
