/**
 * Tests for gameState/persistence.ts — Redis game state persistence
 * Focuses on restoreAllGamesFromRedis which enables zero-downtime deploys.
 */

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const mockSaveGameState = jest.fn();
const mockGetGameState = jest.fn();
const mockDeleteGameState = jest.fn();
const mockGetAllGameCodes = jest.fn();

jest.mock('../../redisClient', () => ({
  saveGameState: (...args: unknown[]) => mockSaveGameState(...args),
  getGameState: (...args: unknown[]) => mockGetGameState(...args),
  deleteGameState: (...args: unknown[]) => mockDeleteGameState(...args),
  getAllGameCodes: (...args: unknown[]) => mockGetAllGameCodes(...args),
}));

import {
  restoreAllGamesFromRedis,
  getAllGameCodesFromRedis,
} from '../gameState/persistence';
import type { GameState } from '../gameState/types';

describe('restoreAllGamesFromRedis', () => {
  let games: Record<string, GameState>;

  beforeEach(() => {
    games = {};
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('restores games found in Redis into the games object', async () => {
    mockGetAllGameCodes.mockResolvedValue(['GAME1', 'GAME2']);
    mockGetGameState
      .mockResolvedValueOnce({
        roomName: 'Room 1',
        users: ['alice', 'bob'],
        playerScores: { alice: 100, bob: 80 },
        playerWords: { alice: ['cat'], bob: ['dog'] },
        playerAchievements: {},
        playerWordDetails: {},
        firstWordFound: {},
        gameState: 'in_progress',
        startTime: '',
        endTime: '',
        letterGrid: [['A', 'B'], ['C', 'D']],
        timerSeconds: 180,
        remainingTime: 45,
        language: 'en',
        tournamentId: null,
        gameMode: 'blast',
        blastModeState: { wave: 3 },
        wordHuntState: null,
      })
      .mockResolvedValueOnce({
        roomName: 'Room 2',
        users: ['charlie'],
        playerScores: { charlie: 50 },
        playerWords: { charlie: [] },
        playerAchievements: {},
        playerWordDetails: {},
        firstWordFound: {},
        gameState: 'waiting',
        startTime: '',
        endTime: '',
        letterGrid: [],
        timerSeconds: 120,
        remainingTime: null,
        language: 'he',
        tournamentId: null,
        gameMode: 'classic',
        blastModeState: null,
        wordHuntState: null,
      });

    const count = await restoreAllGamesFromRedis(games);

    expect(count).toBe(2);
    expect(games['GAME1']).toBeDefined();
    expect(games['GAME1'].roomName).toBe('Room 1');
    expect(games['GAME1'].gameState).toBe('in_progress');
    expect(games['GAME1'].remainingTime).toBe(45);
    expect(games['GAME1'].gameMode).toBe('blast');
    expect(games['GAME1'].restoredFromRedis).toBe(true);
    expect(games['GAME2']).toBeDefined();
    expect(games['GAME2'].language).toBe('he');
  });

  it('returns 0 when no games in Redis', async () => {
    mockGetAllGameCodes.mockResolvedValue([]);

    const count = await restoreAllGamesFromRedis(games);

    expect(count).toBe(0);
    expect(Object.keys(games)).toHaveLength(0);
  });

  it('cleans up restored games with no reconnected players after timeout', async () => {
    mockGetAllGameCodes.mockResolvedValue(['ORPHAN']);
    mockGetGameState.mockResolvedValueOnce({
      roomName: 'Orphan Room',
      users: [],
      playerScores: {},
      playerWords: {},
      playerAchievements: {},
      playerWordDetails: {},
      firstWordFound: {},
      gameState: 'in_progress',
      startTime: '',
      endTime: '',
      letterGrid: [['X']],
      timerSeconds: 60,
      remainingTime: 30,
      language: 'en',
      tournamentId: null,
      gameMode: 'classic',
      blastModeState: null,
      wordHuntState: null,
    });

    await restoreAllGamesFromRedis(games);
    expect(games['ORPHAN']).toBeDefined();

    // Simulate 2 minutes passing with no players reconnecting
    jest.advanceTimersByTime(2 * 60 * 1000);

    expect(games['ORPHAN']).toBeUndefined();
  });

  it('keeps restored games where players have reconnected', async () => {
    mockGetAllGameCodes.mockResolvedValue(['ACTIVE']);
    mockGetGameState.mockResolvedValueOnce({
      roomName: 'Active Room',
      users: [],
      playerScores: {},
      playerWords: {},
      playerAchievements: {},
      playerWordDetails: {},
      firstWordFound: {},
      gameState: 'in_progress',
      startTime: '',
      endTime: '',
      letterGrid: [['A']],
      timerSeconds: 60,
      remainingTime: 30,
      language: 'en',
      tournamentId: null,
      gameMode: 'classic',
      blastModeState: null,
      wordHuntState: null,
    });

    await restoreAllGamesFromRedis(games);

    // Simulate a player reconnecting before timeout
    games['ACTIVE'].users = {
      alice: {
        socketId: 'sock1', avatar: null, isHost: true,
        authUserId: null, guestTokenHash: null,
      },
    } as any;

    jest.advanceTimersByTime(2 * 60 * 1000);

    // Game should still exist because a player reconnected
    expect(games['ACTIVE']).toBeDefined();
  });

  it('handles partial failures gracefully', async () => {
    mockGetAllGameCodes.mockResolvedValue(['GOOD', 'BAD']);
    mockGetGameState
      .mockResolvedValueOnce({
        roomName: 'Good Room',
        users: [],
        playerScores: {},
        playerWords: {},
        playerAchievements: {},
        playerWordDetails: {},
        firstWordFound: {},
        gameState: 'waiting',
        startTime: '',
        endTime: '',
        letterGrid: [],
        timerSeconds: 60,
        remainingTime: null,
        language: 'en',
        tournamentId: null,
        gameMode: 'classic',
        blastModeState: null,
        wordHuntState: null,
      })
      .mockRejectedValueOnce(new Error('Redis read failed'));

    const count = await restoreAllGamesFromRedis(games);

    expect(count).toBe(1);
    expect(games['GOOD']).toBeDefined();
    expect(games['BAD']).toBeUndefined();
  });
});

describe('getAllGameCodesFromRedis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retrieves game codes via getAllGameCodes', async () => {
    mockGetAllGameCodes.mockResolvedValue(['A', 'B', 'C']);

    const codes = await getAllGameCodesFromRedis();

    expect(codes).toEqual(['A', 'B', 'C']);
  });
});
