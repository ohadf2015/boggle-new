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

const { createTestEnvironment, customMatchers } = require('../helpers/socketTestHelper');

// Add custom matchers
expect.extend(customMatchers);

describe('Game Flow Integration', () => {
  let env;

  beforeEach(() => {
    env = createTestEnvironment();
    // Clear rate limiter state between tests
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    env.cleanup();
    jest.useRealTimers();
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

    test('game creation broadcasts active rooms', async () => {
      const hostSocket = env.createSocket();
      const gameData = env.createGameData();

      await hostSocket.receiveEvent('createGame', gameData);

      // Check that activeRooms was broadcast
      expect(hostSocket.getEmittedEvents()).toContainEvent('activeRooms');
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

  describe('Game Reset', () => {
    test('host can reset game after it ends', async () => {
      const hostSocket = env.createSocket();
      const gameData = env.createGameData();

      await hostSocket.receiveEvent('createGame', gameData);
      await hostSocket.receiveEvent('startGame', {
        letterGrid: [['A', 'B'], ['C', 'D']],
        timerSeconds: 60,
      });

      hostSocket.clearTracking();

      await hostSocket.receiveEvent('resetGame', {});

      expect(hostSocket.getEmittedEvents()).toContainEvent('gameReset');
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
