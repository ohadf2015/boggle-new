/**
 * Game Flow Integration Tests
 *
 * Tests the complete game lifecycle through Socket.IO events:
 * - Create game
 * - Join game
 * - Start game
 * - Submit words
 * - End game
 */

import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { createTestEnvironment, customMatchers } from '../helpers/socketTestHelper';
// Add custom matchers
expect.extend(customMatchers);

// Mock classroom game manager — no Redis in integration tests
vi.mock('../../modules/classroomGameManager', () => ({
  getClassroomGame: vi.fn().mockResolvedValue(null),
  getClassroomGameByCode: vi.fn().mockResolvedValue(null),
  updateClassroomGameState: vi.fn().mockResolvedValue(undefined),
}));

// Mock gameStartCoordinator to prevent infinite timer loops under fake timers
vi.mock('../../utils/gameStartCoordinator', () => ({
  default: {
    initializeSequence: vi.fn().mockReturnValue('mock-message-id'),
    scheduleRetries: vi.fn(),
    setAcknowledgmentTimeout: vi.fn(),
    clearGame: vi.fn(),
    cleanupSequence: vi.fn(),
    handleAcknowledgment: vi.fn(),
    cancelRetries: vi.fn(),
  },
}));

// Mock round events manager to prevent async timer chains under fake timers
vi.mock('../../modules/roundEventsManager', () => ({
  scheduleRoundEvent: vi.fn(),
  cancelRoundEvents: vi.fn(),
}));

// Mock wordValidatorPool to prevent setImmediate-based hangs under fake timers
vi.mock('../../modules/wordValidatorPool', () => ({
  findAllWordsAsync: vi.fn().mockResolvedValue([]),
  getPoolStats: vi.fn().mockReturnValue({ workers: 0 }),
  shutdownPool: vi.fn().mockResolvedValue(undefined),
}));

// Mock dictionary to prevent file I/O under fake timers
// (Vitest dual-specifier issue: beforeAll loads dictionary in one instance,
// but handlers import from another — the handler's instance tries to load from
// disk under fake timers and hangs indefinitely)
vi.mock('../../dictionary', () => ({
  ensureLanguageLoaded: vi.fn().mockResolvedValue(undefined),
  getCachedTrie: vi.fn().mockReturnValue(null),
  isDictionaryWord: vi.fn().mockReturnValue(false),
  isValidWordCached: vi.fn().mockReturnValue(false),
  getRandomLongWordsWithTheme: vi.fn().mockReturnValue({ words: [], theme: null }),
}));

// Use globalThis to reset throttle across all module instances
// (Vitest dual-specifier .ts vs .js creates separate instances)

// Increase timeout for dictionary loading during parallel test execution
// Integration tests may take longer under heavy parallel load
vi.setConfig({ testTimeout: 45000 });

describe('Game Flow Integration', () => {
  let env;

  // Preload dictionary BEFORE enabling fake timers to avoid I/O conflicts
  beforeAll(async () => {
    const { ensureLanguageLoaded } = await import('../../dictionary');
    await ensureLanguageLoaded('en');
  });

  beforeEach(() => {
    env = createTestEnvironment();
    globalThis.__resetBroadcastThrottle?.();
    vi.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    globalThis.__clearAllGameTimers?.();
    env.cleanup();
    vi.useRealTimers();
    globalThis.__resetBroadcastThrottle?.();
  });

  describe('Game Creation', () => {
    test('host can create a game', async () => {
      const hostSocket = env.createSocket();
      const gameData = env.createGameData();

      await hostSocket.receiveEvent('createGame', gameData);

      // Check that joined event was emitted
      expect(hostSocket.getEmittedEvents()).toContainEvent('joined');

      const joinedEvent = hostSocket.getEmittedEventsByName('joined')[0];
      expect(joinedEvent.data.success).toBe(true);
      expect(joinedEvent.data.gameCode).toBe(gameData.gameCode);
      expect(joinedEvent.data.isHost).toBe(true);
    });

    test('cannot create game with existing code', async () => {
      const socket1 = env.createSocket();
      const socket2 = env.createSocket();
      const gameData = env.createGameData();

      await socket1.receiveEvent('createGame', gameData);
      await socket2.receiveEvent('createGame', { ...gameData });

      // Second socket should receive error
      expect(socket2.getEmittedEvents()).toContainEvent('error');
    });

    test('game creation broadcasts active rooms to lobby (not host)', async () => {
      const hostSocket = env.createSocket();
      const lobbySocket = env.createSocket(); // separate lobby observer
      const gameData = env.createGameData();

      await hostSocket.receiveEvent('createGame', gameData);

      // Host left lobby on join — should NOT receive activeRooms
      expect(hostSocket.getEmittedEvents()).not.toContainEvent('activeRooms');
      // Lobby observers still receive the broadcast
      expect(lobbySocket.getEmittedEvents()).toContainEvent('activeRooms');
    });
  });

  describe('Joining Games', () => {
    test('player can join an existing game', async () => {
      const hostSocket = env.createSocket();
      const playerSocket = env.createSocket();
      const gameData = env.createGameData();

      // Host creates game
      await hostSocket.receiveEvent('createGame', gameData);

      // Player joins
      const joinData = env.createJoinData(gameData.gameCode, { username: 'TestPlayer' });
      await playerSocket.receiveEvent('join', joinData);

      // Check player received joined event
      expect(playerSocket.getEmittedEvents()).toContainEvent('joined');

      const joinedEvent = playerSocket.getEmittedEventsByName('joined')[0];
      expect(joinedEvent.data.success).toBe(true);
      expect(joinedEvent.data.isHost).toBe(false);
      expect(joinedEvent.data.username).toBe('TestPlayer');
    });

    test('cannot join non-existent game', async () => {
      const playerSocket = env.createSocket();
      const joinData = env.createJoinData('FAKE');

      await playerSocket.receiveEvent('join', joinData);

      expect(playerSocket.getEmittedEvents()).toContainEvent('error');
    });

    test('player joining updates user list for all players', async () => {
      const hostSocket = env.createSocket();
      const playerSocket = env.createSocket();
      const gameData = env.createGameData();

      await hostSocket.receiveEvent('createGame', gameData);
      hostSocket.clearTracking();

      await playerSocket.receiveEvent('join', env.createJoinData(gameData.gameCode));

      // Host should receive updateUsers
      expect(hostSocket.getEmittedEvents()).toContainEvent('updateUsers');
    });
  });

  describe('Game Start', () => {
    test('non-host cannot start the game', async () => {
      const hostSocket = env.createSocket();
      const playerSocket = env.createSocket();
      const gameData = env.createGameData();

      await hostSocket.receiveEvent('createGame', gameData);
      await playerSocket.receiveEvent('join', env.createJoinData(gameData.gameCode));

      playerSocket.clearTracking();

      // Try to start as non-host
      await playerSocket.receiveEvent('startGame', {
        letterGrid: [['A', 'B'], ['C', 'D']],
        timerSeconds: 60,
      });

      // Should receive error
      expect(playerSocket.getEmittedEvents()).toContainEvent('error');
    });
  });

  describe('Room Management', () => {
    test('player can leave room', async () => {
      const hostSocket = env.createSocket();
      const playerSocket = env.createSocket();
      const gameData = env.createGameData();

      await hostSocket.receiveEvent('createGame', gameData);
      await playerSocket.receiveEvent('join',
        env.createJoinData(gameData.gameCode, { username: 'LeavingPlayer' })
      );

      playerSocket.clearTracking();
      hostSocket.clearTracking();

      await playerSocket.receiveEvent('leaveRoom', {
        gameCode: gameData.gameCode,
        username: 'LeavingPlayer',
      });

      // Player should receive leftRoom confirmation
      expect(playerSocket.getEmittedEvents()).toContainEvent('leftRoom');

      // Host should receive updateUsers
      expect(hostSocket.getEmittedEvents()).toContainEvent('updateUsers');
    });

    test('host can close room', async () => {
      const hostSocket = env.createSocket();
      const playerSocket = env.createSocket();
      const gameData = env.createGameData();

      await hostSocket.receiveEvent('createGame', gameData);
      await playerSocket.receiveEvent('join', env.createJoinData(gameData.gameCode));

      hostSocket.clearTracking();
      playerSocket.clearTracking();

      await hostSocket.receiveEvent('closeRoom', {});

      // All should receive roomClosed
      expect(hostSocket.getEmittedEvents()).toContainEvent('roomClosed');
      expect(playerSocket.getEmittedEvents()).toContainEvent('roomClosed');
    });
  });

  describe('Active Rooms', () => {
    test('can request active rooms list', async () => {
      const socket = env.createSocket();

      await socket.receiveEvent('getActiveRooms', {});

      expect(socket.getEmittedEvents()).toContainEvent('activeRooms');

      const event = socket.getEmittedEventsByName('activeRooms')[0];
      expect(event.data).toHaveProperty('rooms');
      expect(Array.isArray(event.data.rooms)).toBe(true);
    });
  });
});

// Game Start and Reset tests use real timers to avoid Vitest dual-specifier issues
// where gameStartCoordinator mocks don't apply to handler imports, causing
// the real coordinator to create timer chains that hang under fake timers.
describe('Game Start & Reset (real timers)', () => {
  let env;

  beforeAll(async () => {
    const { ensureLanguageLoaded } = await import('../../dictionary');
    await ensureLanguageLoaded('en');
  });

  beforeEach(() => {
    env = createTestEnvironment();
    globalThis.__resetBroadcastThrottle?.();
  });

  afterEach(() => {
    globalThis.__clearAllGameTimers?.();
    env.cleanup();
    globalThis.__resetBroadcastThrottle?.();
  });

  test('host can start the game', async () => {
    const hostSocket = env.createSocket();
    const playerSocket = env.createSocket();
    const gameData = env.createGameData();

    await hostSocket.receiveEvent('createGame', gameData);
    await playerSocket.receiveEvent('join', env.createJoinData(gameData.gameCode));

    hostSocket.clearTracking();
    playerSocket.clearTracking();

    // Start the game
    await hostSocket.receiveEvent('startGame', {
      letterGrid: [['A', 'B'], ['C', 'D']],
      timerSeconds: 60,
      language: 'en',
      minWordLength: 2,
    });

    // Both should receive startGame event
    expect(hostSocket.getEmittedEvents()).toContainEvent('startGame');
    expect(playerSocket.getEmittedEvents()).toContainEvent('startGame');
  });

  test('host can reset game after it ends', async () => {
    const hostSocket = env.createSocket();
    const playerSocket = env.createSocket();
    const gameData = env.createGameData();

    await hostSocket.receiveEvent('createGame', gameData);
    await playerSocket.receiveEvent('join', env.createJoinData(gameData.gameCode));
    await hostSocket.receiveEvent('startGame', {
      letterGrid: [['A', 'B'], ['C', 'D']],
      timerSeconds: 60,
      language: 'en',
    });

    hostSocket.clearTracking();

    await hostSocket.receiveEvent('resetGame', {});

    // Handler broadcasts 'resetGame' event, not 'gameReset'
    expect(hostSocket.getEmittedEvents()).toContainEvent('resetGame');
  });
});

describe('Room Auto-Close', () => {
  let env;

  beforeEach(() => {
    env = createTestEnvironment();
    vi.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    globalThis.__clearAllGameTimers?.();
    env.cleanup();
    vi.useRealTimers();
  });

  test('room auto-closes when last player (host) leaves in waiting state', async () => {
    const { gameExists } = globalThis.__gameStateManager;
    const hostSocket = env.createSocket();
    const gameData = env.createGameData();

    // Create game as host
    await hostSocket.receiveEvent('createGame', gameData);
    expect(gameExists(gameData.gameCode)).toBe(true);

    hostSocket.clearTracking();

    // Host leaves the room (use hostUsername, not username)
    await hostSocket.receiveEvent('leaveRoom', {
      gameCode: gameData.gameCode,
      username: gameData.hostUsername,
    });

    // Room should be auto-closed
    expect(gameExists(gameData.gameCode)).toBe(false);
    expect(hostSocket.getEmittedEvents()).toContainEvent('leftRoom');
  });

  test('room auto-closes when last player leaves after others left', async () => {
    const { gameExists } = globalThis.__gameStateManager;
    const hostSocket = env.createSocket();
    const playerSocket = env.createSocket();
    const gameData = env.createGameData();

    // Create game as host
    await hostSocket.receiveEvent('createGame', gameData);

    // Player joins
    await playerSocket.receiveEvent('join',
      env.createJoinData(gameData.gameCode, { username: 'Player1' })
    );

    expect(gameExists(gameData.gameCode)).toBe(true);

    // Player leaves
    await playerSocket.receiveEvent('leaveRoom', {
      gameCode: gameData.gameCode,
      username: 'Player1',
    });

    // Room should still exist (host is still there)
    expect(gameExists(gameData.gameCode)).toBe(true);

    hostSocket.clearTracking();

    // Host leaves - should auto-close since they're the last player
    await hostSocket.receiveEvent('leaveRoom', {
      gameCode: gameData.gameCode,
      username: gameData.hostUsername,
    });

    // Room should be auto-closed
    expect(gameExists(gameData.gameCode)).toBe(false);
  });

  test('room auto-closes when host (only player) disconnects', async () => {
    const { gameExists } = globalThis.__gameStateManager;
    const hostSocket = env.createSocket();
    const gameData = env.createGameData();

    // Create game as host
    await hostSocket.receiveEvent('createGame', gameData);
    expect(gameExists(gameData.gameCode)).toBe(true);

    hostSocket.clearTracking();

    // Host disconnects (simulates browser close, network issue, etc.)
    await hostSocket.disconnect();

    // Grace period is active, room still exists
    expect(gameExists(gameData.gameCode)).toBe(true);

    // Advance past the grace period (300s = 300000ms)
    await vi.advanceTimersByTimeAsync(301000);

    // Room should be auto-closed after grace period expires
    expect(gameExists(gameData.gameCode)).toBe(false);
  });

  test('room auto-closes when last non-host player disconnects', async () => {
    const { gameExists, getGame } = globalThis.__gameStateManager;
    const hostSocket = env.createSocket();
    const playerSocket = env.createSocket();
    const gameData = env.createGameData();

    // Create game as host
    await hostSocket.receiveEvent('createGame', gameData);

    // Player joins
    await playerSocket.receiveEvent('join',
      env.createJoinData(gameData.gameCode, { username: 'Player1' })
    );

    expect(gameExists(gameData.gameCode)).toBe(true);

    // Host leaves explicitly (should transfer host to Player1)
    await hostSocket.receiveEvent('leaveRoom', {
      gameCode: gameData.gameCode,
      username: gameData.hostUsername,
    });

    // Room should still exist (Player1 is now host)
    expect(gameExists(gameData.gameCode)).toBe(true);
    const game = getGame(gameData.gameCode);
    expect(game?.hostUsername).toBe('Player1');

    playerSocket.clearTracking();

    // Player1 (now host) disconnects
    await playerSocket.disconnect();

    // Grace period is active, room still exists
    expect(gameExists(gameData.gameCode)).toBe(true);

    // Advance past the grace period (300s = 300000ms)
    await vi.advanceTimersByTimeAsync(301000);

    // Room should be auto-closed after grace period expires
    expect(gameExists(gameData.gameCode)).toBe(false);
  });
});

describe('Multi-Player Scenarios', () => {
  let env;

  beforeEach(() => {
    env = createTestEnvironment();
  });

  afterEach(() => {
    env.cleanup();
  });

  test('multiple players can join the same game', async () => {
    const hostSocket = env.createSocket();
    const gameData = env.createGameData();

    await hostSocket.receiveEvent('createGame', gameData);

    // Create and join 5 players
    const playerSockets = [];
    for (let i = 0; i < 5; i++) {
      const playerSocket = env.createSocket();
      playerSockets.push(playerSocket);

      await playerSocket.receiveEvent('join',
        env.createJoinData(gameData.gameCode, { username: `Player${i}` })
      );
    }

    // All players should have joined successfully
    for (const socket of playerSockets) {
      expect(socket.getEmittedEvents()).toContainEvent('joined');
    }

    // Check user count in last updateUsers
    const lastUpdate = hostSocket.getEmittedEventsByName('updateUsers').pop();
    expect(lastUpdate.data.users.length).toBe(6); // 1 host + 5 players
  });
});
