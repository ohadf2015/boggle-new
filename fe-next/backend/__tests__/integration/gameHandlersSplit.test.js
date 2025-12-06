/**
 * Game Handlers Split Integration Tests
 *
 * Tests the refactored game handlers (lifecycle, player join, room management)
 * to ensure the split maintains backward compatibility.
 */

const { createTestEnvironment, customMatchers } = require('../helpers/socketTestHelper');

// Add custom matchers
expect.extend(customMatchers);

describe('Game Lifecycle Handler', () => {
  let env;

  beforeEach(() => {
    env = createTestEnvironment();
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    env.cleanup();
    jest.useRealTimers();
  });

  describe('createGame', () => {
    test('creates game with valid data and emits joined event', async () => {
      const socket = env.createSocket();
      const gameData = env.createGameData({
        gameCode: '1234',
        hostUsername: 'TestHost',
        language: 'en',
      });

      await socket.receiveEvent('createGame', gameData);

      expect(socket.getEmittedEvents()).toContainEvent('joined');

      const joinedEvent = socket.getEmittedEventsByName('joined')[0];
      expect(joinedEvent.data).toMatchObject({
        success: true,
        gameCode: '1234',
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

    test('broadcasts activeRooms after creation', async () => {
      const socket = env.createSocket();
      const gameData = env.createGameData();

      await socket.receiveEvent('createGame', gameData);

      expect(socket.getEmittedEvents()).toContainEvent('activeRooms');
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
    test('host can start game with valid grid', async () => {
      const hostSocket = env.createSocket();
      const gameData = env.createGameData();

      await hostSocket.receiveEvent('createGame', gameData);
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
      const socket = env.createSocket();
      const gameData = env.createGameData();

      await socket.receiveEvent('createGame', gameData);
      socket.clearTracking();

      // Try to set timer below minimum
      await socket.receiveEvent('startGame', {
        letterGrid: [['A', 'B'], ['C', 'D']],
        timerSeconds: 10, // Below min of 30
        language: 'en',
      });

      const startEvent = socket.getEmittedEventsByName('startGame')[0];
      expect(startEvent.data.timerSeconds).toBe(30); // Should be clamped to minimum
    });

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

  describe('endGame', () => {
    test('host can end game in progress', async () => {
      const socket = env.createSocket();
      const gameData = env.createGameData();

      await socket.receiveEvent('createGame', gameData);
      await socket.receiveEvent('startGame', {
        letterGrid: [['A', 'B'], ['C', 'D']],
        timerSeconds: 60,
      });
      socket.clearTracking();

      await socket.receiveEvent('endGame', {});

      expect(socket.getEmittedEvents()).toContainEvent('gameEnded');
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
      });
      playerSocket.clearTracking();

      await playerSocket.receiveEvent('endGame', {});

      expect(playerSocket.getEmittedEvents()).toContainEvent('error');
    });
  });

  describe('resetGame', () => {
    test('host can reset game after ending', async () => {
      const socket = env.createSocket();
      const gameData = env.createGameData();

      await socket.receiveEvent('createGame', gameData);
      await socket.receiveEvent('startGame', {
        letterGrid: [['A', 'B'], ['C', 'D']],
        timerSeconds: 60,
      });
      socket.clearTracking();

      await socket.receiveEvent('resetGame', {});

      expect(socket.getEmittedEvents()).toContainEvent('gameReset');
    });

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
  });

  afterEach(() => {
    env.cleanup();
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

    test('late join sends current game state', async () => {
      const hostSocket = env.createSocket();
      const playerSocket = env.createSocket();
      const gameData = env.createGameData();

      await hostSocket.receiveEvent('createGame', gameData);
      await hostSocket.receiveEvent('startGame', {
        letterGrid: [['A', 'B'], ['C', 'D']],
        timerSeconds: 120,
        language: 'en',
      });

      playerSocket.clearTracking();
      await playerSocket.receiveEvent('join', env.createJoinData(gameData.gameCode, {
        username: 'LateJoiner',
      }));

      // Late joiner should receive startGame with current state
      expect(playerSocket.getEmittedEvents()).toContainEvent('startGame');

      const startEvent = playerSocket.getEmittedEventsByName('startGame')[0];
      expect(startEvent.data.lateJoin).toBe(true);
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

      expect(playerSocket.getEmittedEvents()).toContainEvent('activeRooms');
    });
  });
});

describe('Room Management Handler', () => {
  let env;

  beforeEach(() => {
    env = createTestEnvironment();
  });

  afterEach(() => {
    env.cleanup();
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

    test('closeRoom broadcasts updated activeRooms', async () => {
      const hostSocket = env.createSocket();
      const gameData = env.createGameData();

      await hostSocket.receiveEvent('createGame', gameData);
      hostSocket.clearTracking();

      await hostSocket.receiveEvent('closeRoom', {});

      expect(hostSocket.getEmittedEvents()).toContainEvent('activeRooms');
    });
  });

  describe('getActiveRooms', () => {
    test('returns list of active rooms', async () => {
      const socket1 = env.createSocket();
      const socket2 = env.createSocket();

      // Create two games
      await socket1.receiveEvent('createGame', env.createGameData({ gameCode: 'ROOM1' }));
      await socket2.receiveEvent('createGame', env.createGameData({ gameCode: 'ROOM2' }));

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

describe('Handler Integration', () => {
  let env;

  beforeEach(() => {
    env = createTestEnvironment();
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    env.cleanup();
    jest.useRealTimers();
  });

  test('full game lifecycle with multiple players', async () => {
    const hostSocket = env.createSocket();
    const player1Socket = env.createSocket();
    const player2Socket = env.createSocket();
    const gameData = env.createGameData({ gameCode: 'FULL' });

    // 1. Host creates game
    await hostSocket.receiveEvent('createGame', gameData);
    expect(hostSocket.wasEventEmitted('joined')).toBe(true);

    // 2. Players join
    await player1Socket.receiveEvent('join', env.createJoinData('FULL', { username: 'Player1' }));
    await player2Socket.receiveEvent('join', env.createJoinData('FULL', { username: 'Player2' }));

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
    await player2Socket.receiveEvent('leaveRoom', { gameCode: 'FULL', username: 'Player2' });
    expect(player2Socket.wasEventEmitted('leftRoom')).toBe(true);

    // 5. Host ends game
    hostSocket.clearTracking();
    await hostSocket.receiveEvent('endGame', {});
    expect(hostSocket.wasEventEmitted('gameEnded')).toBe(true);

    // 6. Host resets for new round
    hostSocket.clearTracking();
    await hostSocket.receiveEvent('resetGame', {});
    expect(hostSocket.wasEventEmitted('gameReset')).toBe(true);

    // 7. Host closes room
    hostSocket.clearTracking();
    player1Socket.clearTracking();
    await hostSocket.receiveEvent('closeRoom', {});
    expect(hostSocket.wasEventEmitted('roomClosed')).toBe(true);
    expect(player1Socket.wasEventEmitted('roomClosed')).toBe(true);
  });
});
