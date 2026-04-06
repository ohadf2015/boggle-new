/**
 * Game Handlers Split Integration Tests
 *
 * Tests the refactored game handlers (lifecycle, player join, room management)
 * to ensure the split maintains backward compatibility.
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
vi.mock('../../dictionary', () => ({
  ensureLanguageLoaded: vi.fn().mockResolvedValue(undefined),
  getCachedTrie: vi.fn().mockReturnValue(null),
  isDictionaryWord: vi.fn().mockReturnValue(false),
  isValidWordCached: vi.fn().mockReturnValue(false),
  getRandomLongWordsWithTheme: vi.fn().mockReturnValue({ words: [], theme: null }),
}));

// Increase timeout for dictionary loading during parallel test execution
// Integration tests may take longer under heavy parallel load
vi.setConfig({ testTimeout: 45000 });

describe('Game Lifecycle Handler', () => {
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

  describe('createGame', () => {
    test('creates game with valid data and emits joined event', async () => {
      const socket = env.createSocket();
      const gameData = env.createGameData({
        gameCode: 'TEST01', // Must be 6+ chars (schema requirement)
        hostUsername: 'TestHost',
        language: 'en',
      });

      await socket.receiveEvent('createGame', gameData);

      expect(socket.getEmittedEvents()).toContainEvent('joined');

      const joinedEvent = socket.getEmittedEventsByName('joined')[0];
      expect(joinedEvent.data).toMatchObject({
        success: true,
        gameCode: 'TEST01',
        isHost: true,
        username: 'TestHost',
        language: 'en',
      });
    });

    test('rejects duplicate game code', async () => {
      const socket1 = env.createSocket();
      const socket2 = env.createSocket();
      const gameData = env.createGameData({ gameCode: 'DUPE' });

      await socket1.receiveEvent('createGame', gameData);
      await socket2.receiveEvent('createGame', { ...gameData });

      expect(socket2.getEmittedEvents()).toContainEvent('error');
    });

    test('host leaves lobby after game creation (no activeRooms to self)', async () => {
      const socket = env.createSocket();
      const lobbySocket = env.createSocket(); // separate lobby observer
      const gameData = env.createGameData();

      await socket.receiveEvent('createGame', gameData);

      // Host left lobby on join — should NOT receive activeRooms
      expect(socket.getEmittedEvents()).not.toContainEvent('activeRooms');
      // Lobby observers still receive the broadcast
      expect(lobbySocket.getEmittedEvents()).toContainEvent('activeRooms');
    });

    test('broadcasts updateUsers to room after creation', async () => {
      const socket = env.createSocket();
      const gameData = env.createGameData();

      await socket.receiveEvent('createGame', gameData);

      expect(socket.getEmittedEvents()).toContainEvent('updateUsers');

      const updateEvent = socket.getEmittedEventsByName('updateUsers')[0];
      expect(updateEvent.data.users).toHaveLength(1); // Just the host
    });
  });

  describe('startGame', () => {
    test('non-host cannot start game', async () => {
      const hostSocket = env.createSocket();
      const playerSocket = env.createSocket();
      const gameData = env.createGameData();

      await hostSocket.receiveEvent('createGame', gameData);
      await playerSocket.receiveEvent('join', env.createJoinData(gameData.gameCode));
      playerSocket.clearTracking();

      await playerSocket.receiveEvent('startGame', {
        letterGrid: [['A', 'B'], ['C', 'D']],
        timerSeconds: 60,
      });

      expect(playerSocket.getEmittedEvents()).toContainEvent('error');
    });
  });

  describe('resetGame', () => {
    test('non-host cannot reset game', async () => {
      const hostSocket = env.createSocket();
      const playerSocket = env.createSocket();
      const gameData = env.createGameData();

      await hostSocket.receiveEvent('createGame', gameData);
      await playerSocket.receiveEvent('join', env.createJoinData(gameData.gameCode));
      playerSocket.clearTracking();

      await playerSocket.receiveEvent('resetGame', {});

      expect(playerSocket.getEmittedEvents()).toContainEvent('error');
    });
  });

  describe('getWordsForBoard', () => {
    test('returns words for specified language and board size', async () => {
      const socket = env.createSocket();

      await socket.receiveEvent('getWordsForBoard', {
        language: 'en',
        boardSize: { rows: 5, cols: 5 },
      });

      expect(socket.getEmittedEvents()).toContainEvent('wordsForBoard');

      const event = socket.getEmittedEventsByName('wordsForBoard')[0];
      expect(event.data).toHaveProperty('words');
      expect(Array.isArray(event.data.words)).toBe(true);
    });
  });
});

describe('Player Join Handler', () => {
  let env;

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

  describe('join', () => {
    test('player joins existing game successfully', async () => {
      const hostSocket = env.createSocket();
      const playerSocket = env.createSocket();
      const gameData = env.createGameData();

      await hostSocket.receiveEvent('createGame', gameData);
      await playerSocket.receiveEvent('join', env.createJoinData(gameData.gameCode, {
        username: 'JoiningPlayer',
      }));

      expect(playerSocket.getEmittedEvents()).toContainEvent('joined');

      const joinedEvent = playerSocket.getEmittedEventsByName('joined')[0];
      expect(joinedEvent.data).toMatchObject({
        success: true,
        isHost: false,
        username: 'JoiningPlayer',
      });
    });

    test('reconnection restores player state', async () => {
      const hostSocket = env.createSocket();
      const playerSocket1 = env.createSocket();
      const gameData = env.createGameData();

      await hostSocket.receiveEvent('createGame', gameData);
      await playerSocket1.receiveEvent('join', env.createJoinData(gameData.gameCode, {
        username: 'ReconnectingPlayer',
      }));

      // Simulate reconnection with new socket
      const playerSocket2 = env.createSocket();
      await playerSocket2.receiveEvent('join', env.createJoinData(gameData.gameCode, {
        username: 'ReconnectingPlayer',
      }));

      expect(playerSocket2.getEmittedEvents()).toContainEvent('joined');

      const joinedEvent = playerSocket2.getEmittedEventsByName('joined')[0];
      expect(joinedEvent.data.reconnected).toBe(true);
    });

    test('broadcasts playerReconnected on reconnection', async () => {
      const hostSocket = env.createSocket();
      const playerSocket1 = env.createSocket();
      const gameData = env.createGameData();

      await hostSocket.receiveEvent('createGame', gameData);
      await playerSocket1.receiveEvent('join', env.createJoinData(gameData.gameCode, {
        username: 'ReconnectingPlayer',
      }));

      hostSocket.clearTracking();

      // Reconnect
      const playerSocket2 = env.createSocket();
      await playerSocket2.receiveEvent('join', env.createJoinData(gameData.gameCode, {
        username: 'ReconnectingPlayer',
      }));

      expect(hostSocket.getEmittedEvents()).toContainEvent('playerReconnected');
    });
  });

  describe('leaveRoom', () => {
    test('player can leave room voluntarily', async () => {
      const hostSocket = env.createSocket();
      const playerSocket = env.createSocket();
      const gameData = env.createGameData();

      await hostSocket.receiveEvent('createGame', gameData);
      await playerSocket.receiveEvent('join', env.createJoinData(gameData.gameCode, {
        username: 'LeavingPlayer',
      }));

      playerSocket.clearTracking();
      hostSocket.clearTracking();

      await playerSocket.receiveEvent('leaveRoom', {
        gameCode: gameData.gameCode,
        username: 'LeavingPlayer',
      });

      expect(playerSocket.getEmittedEvents()).toContainEvent('leftRoom');
      expect(hostSocket.getEmittedEvents()).toContainEvent('updateUsers');
    });

    test('broadcasts activeRooms after player leaves', async () => {
      const hostSocket = env.createSocket();
      const playerSocket = env.createSocket();
      const gameData = env.createGameData();

      await hostSocket.receiveEvent('createGame', gameData);
      await playerSocket.receiveEvent('join', env.createJoinData(gameData.gameCode, {
        username: 'LeavingPlayer',
      }));

      playerSocket.clearTracking();

      await playerSocket.receiveEvent('leaveRoom', {
        gameCode: gameData.gameCode,
        username: 'LeavingPlayer',
      });

      // Flush throttled broadcast
      vi.advanceTimersByTime(500);

      expect(playerSocket.getEmittedEvents()).toContainEvent('activeRooms');
    });
  });
});

describe('Room Management Handler', () => {
  let env;

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

  describe('closeRoom', () => {
    test('host can close room', async () => {
      const hostSocket = env.createSocket();
      const playerSocket = env.createSocket();
      const gameData = env.createGameData();

      await hostSocket.receiveEvent('createGame', gameData);
      await playerSocket.receiveEvent('join', env.createJoinData(gameData.gameCode));

      hostSocket.clearTracking();
      playerSocket.clearTracking();

      await hostSocket.receiveEvent('closeRoom', {});

      // Both should receive roomClosed
      expect(hostSocket.getEmittedEvents()).toContainEvent('roomClosed');
      expect(playerSocket.getEmittedEvents()).toContainEvent('roomClosed');
    });

    test('non-host cannot close room', async () => {
      const hostSocket = env.createSocket();
      const playerSocket = env.createSocket();
      const gameData = env.createGameData();

      await hostSocket.receiveEvent('createGame', gameData);
      await playerSocket.receiveEvent('join', env.createJoinData(gameData.gameCode));

      playerSocket.clearTracking();

      await playerSocket.receiveEvent('closeRoom', {});

      // Non-host request should be ignored (no roomClosed event)
      expect(playerSocket.getEmittedEvents()).not.toContainEvent('roomClosed');
    });

    test('closeRoom broadcasts updated activeRooms to lobby (not host)', async () => {
      const hostSocket = env.createSocket();
      const lobbySocket = env.createSocket(); // separate lobby observer
      const gameData = env.createGameData();

      await hostSocket.receiveEvent('createGame', gameData);
      hostSocket.clearTracking();
      lobbySocket.clearTracking();

      await hostSocket.receiveEvent('closeRoom', {});

      // Flush throttled broadcast
      vi.advanceTimersByTime(500);

      // Host left lobby on game join — doesn't receive activeRooms
      expect(hostSocket.getEmittedEvents()).not.toContainEvent('activeRooms');
      // Lobby observers still receive the broadcast
      expect(lobbySocket.getEmittedEvents()).toContainEvent('activeRooms');
    });
  });

  describe('getActiveRooms', () => {
    test('returns list of active rooms', async () => {
      const socket1 = env.createSocket();
      const socket2 = env.createSocket();

      // Create two games (game codes must be 6+ chars)
      await socket1.receiveEvent('createGame', env.createGameData({ gameCode: 'ROOM01' }));
      await socket2.receiveEvent('createGame', env.createGameData({ gameCode: 'ROOM02' }));

      const querySocket = env.createSocket();
      await querySocket.receiveEvent('getActiveRooms', {});

      expect(querySocket.getEmittedEvents()).toContainEvent('activeRooms');

      const event = querySocket.getEmittedEventsByName('activeRooms')[0];
      expect(event.data.rooms.length).toBeGreaterThanOrEqual(2);
    });

    test('returns empty array when no rooms exist', async () => {
      const socket = env.createSocket();

      await socket.receiveEvent('getActiveRooms', {});

      const event = socket.getEmittedEventsByName('activeRooms')[0];
      expect(event.data.rooms).toEqual([]);
    });
  });

  describe('broadcastShufflingGrid', () => {
    test('host can broadcast grid shuffling animation', async () => {
      const hostSocket = env.createSocket();
      const playerSocket = env.createSocket();
      const gameData = env.createGameData();

      await hostSocket.receiveEvent('createGame', gameData);
      await playerSocket.receiveEvent('join', env.createJoinData(gameData.gameCode));

      hostSocket.clearTracking();
      playerSocket.clearTracking();

      await hostSocket.receiveEvent('broadcastShufflingGrid', {
        grid: [['X', 'Y'], ['Z', 'W']],
        isShuffling: true,
      });

      // Both should receive gridShuffling
      expect(hostSocket.getEmittedEvents()).toContainEvent('gridShuffling');
      expect(playerSocket.getEmittedEvents()).toContainEvent('gridShuffling');
    });

    test('non-host cannot broadcast grid shuffling', async () => {
      const hostSocket = env.createSocket();
      const playerSocket = env.createSocket();
      const gameData = env.createGameData();

      await hostSocket.receiveEvent('createGame', gameData);
      await playerSocket.receiveEvent('join', env.createJoinData(gameData.gameCode));

      hostSocket.clearTracking();
      playerSocket.clearTracking();

      await playerSocket.receiveEvent('broadcastShufflingGrid', {
        grid: [['X', 'Y'], ['Z', 'W']],
        isShuffling: true,
      });

      // Non-host broadcast should be ignored
      expect(hostSocket.getEmittedEvents()).not.toContainEvent('gridShuffling');
    });
  });
});

// Tests that call startGame use real timers to avoid Vitest dual-specifier issues
// where gameStartCoordinator mocks don't apply to handler imports, causing
// the real coordinator to create timer chains that hang under fake timers.
describe('Game Start & Lifecycle (real timers)', () => {
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

  test('host can start game with valid grid', async () => {
    const hostSocket = env.createSocket();
    const playerSocket = env.createSocket();
    const gameData = env.createGameData();

    await hostSocket.receiveEvent('createGame', gameData);
    await playerSocket.receiveEvent('join', env.createJoinData(gameData.gameCode, { username: 'Player1' }));
    hostSocket.clearTracking();

    await hostSocket.receiveEvent('startGame', {
      letterGrid: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']],
      timerSeconds: 120,
      language: 'en',
      minWordLength: 3,
    });

    expect(hostSocket.getEmittedEvents()).toContainEvent('startGame');

    const startEvent = hostSocket.getEmittedEventsByName('startGame')[0];
    expect(startEvent.data).toMatchObject({
      timerSeconds: 120,
      language: 'en',
      minWordLength: 3,
    });
  });

  test('enforces timer bounds (30-600 seconds)', async () => {
    const hostSocket = env.createSocket();
    const playerSocket = env.createSocket();
    const gameData = env.createGameData();

    await hostSocket.receiveEvent('createGame', gameData);
    await playerSocket.receiveEvent('join', env.createJoinData(gameData.gameCode, { username: 'Player1' }));
    hostSocket.clearTracking();

    await hostSocket.receiveEvent('startGame', {
      letterGrid: [['A', 'B'], ['C', 'D']],
      timerSeconds: 10, // Below min of 30
      language: 'en',
    });

    const startEvent = hostSocket.getEmittedEventsByName('startGame')[0];
    expect(startEvent.data.timerSeconds).toBe(30); // Should be clamped to minimum
  });

  test('host can end game in progress', async () => {
    const hostSocket = env.createSocket();
    const playerSocket = env.createSocket();
    const gameData = env.createGameData();

    await hostSocket.receiveEvent('createGame', gameData);
    await playerSocket.receiveEvent('join', env.createJoinData(gameData.gameCode, { username: 'Player1' }));
    await hostSocket.receiveEvent('startGame', {
      letterGrid: [['A', 'B'], ['C', 'D']],
      timerSeconds: 60,
      language: 'en',
    });
    hostSocket.clearTracking();

    await hostSocket.receiveEvent('endGame', {});

    expect(hostSocket.getEmittedEvents()).toContainEvent('endGame');
  });

  test('non-host cannot end game', async () => {
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
    playerSocket.clearTracking();

    await playerSocket.receiveEvent('endGame', {});

    expect(playerSocket.getEmittedEvents()).toContainEvent('error');
  });

  test('host can reset game after ending', async () => {
    const hostSocket = env.createSocket();
    const playerSocket = env.createSocket();
    const gameData = env.createGameData();

    await hostSocket.receiveEvent('createGame', gameData);
    await playerSocket.receiveEvent('join', env.createJoinData(gameData.gameCode, { username: 'Player1' }));
    await hostSocket.receiveEvent('startGame', {
      letterGrid: [['A', 'B'], ['C', 'D']],
      timerSeconds: 60,
      language: 'en',
    });
    hostSocket.clearTracking();

    await hostSocket.receiveEvent('resetGame', {});

    expect(hostSocket.getEmittedEvents()).toContainEvent('resetGame');
  });

  test('late join sends current game state', async () => {
    const hostSocket = env.createSocket();
    const player1Socket = env.createSocket();
    const gameData = env.createGameData();

    await hostSocket.receiveEvent('createGame', gameData);
    await player1Socket.receiveEvent('join', env.createJoinData(gameData.gameCode, { username: 'Player1' }));
    await hostSocket.receiveEvent('startGame', {
      letterGrid: [['A', 'B'], ['C', 'D']],
      timerSeconds: 120,
      language: 'en',
    });

    const lateSocket = env.createSocket();
    lateSocket.clearTracking();
    await lateSocket.receiveEvent('join', env.createJoinData(gameData.gameCode, {
      username: 'LateJoiner',
    }));

    expect(lateSocket.getEmittedEvents()).toContainEvent('startGame');

    const startEvent = lateSocket.getEmittedEventsByName('startGame')[0];
    expect(startEvent.data.lateJoin).toBe(true);
  });
});

describe('Handler Integration (real timers)', () => {
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

  test('full game lifecycle with multiple players', async () => {
    const hostSocket = env.createSocket();
    const player1Socket = env.createSocket();
    const player2Socket = env.createSocket();
    // Game code must be 6+ chars (schema requirement)
    const gameData = env.createGameData({ gameCode: 'FULLGM' });

    // 1. Host creates game
    await hostSocket.receiveEvent('createGame', gameData);
    expect(hostSocket.wasEventEmitted('joined')).toBe(true);

    // 2. Players join
    await player1Socket.receiveEvent('join', env.createJoinData('FULLGM', { username: 'Player1' }));
    await player2Socket.receiveEvent('join', env.createJoinData('FULLGM', { username: 'Player2' }));

    expect(player1Socket.wasEventEmitted('joined')).toBe(true);
    expect(player2Socket.wasEventEmitted('joined')).toBe(true);

    // 3. Host starts game
    hostSocket.clearTracking();
    player1Socket.clearTracking();
    player2Socket.clearTracking();

    await hostSocket.receiveEvent('startGame', {
      letterGrid: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']],
      timerSeconds: 60,
      language: 'en',
    });

    expect(hostSocket.wasEventEmitted('startGame')).toBe(true);
    expect(player1Socket.wasEventEmitted('startGame')).toBe(true);
    expect(player2Socket.wasEventEmitted('startGame')).toBe(true);

    // 4. Player leaves
    player2Socket.clearTracking();
    await player2Socket.receiveEvent('leaveRoom', { gameCode: 'FULLGM', username: 'Player2' });
    expect(player2Socket.wasEventEmitted('leftRoom')).toBe(true);

    // 5. Host ends game
    hostSocket.clearTracking();
    await hostSocket.receiveEvent('endGame', {});
    expect(hostSocket.wasEventEmitted('endGame')).toBe(true);

    // 6. Host resets for new round
    hostSocket.clearTracking();
    await hostSocket.receiveEvent('resetGame', {});
    expect(hostSocket.wasEventEmitted('resetGame')).toBe(true);

    // 7. Host closes room
    hostSocket.clearTracking();
    player1Socket.clearTracking();
    await hostSocket.receiveEvent('closeRoom', {});
    expect(hostSocket.wasEventEmitted('roomClosed')).toBe(true);
    expect(player1Socket.wasEventEmitted('roomClosed')).toBe(true);
  });
});
