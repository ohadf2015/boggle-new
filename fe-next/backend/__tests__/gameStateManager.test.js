/**
 * Game State Manager Tests
 * Tests for centralized game state management
 */

const {
  createGame,
  getGame,
  updateGame,
  deleteGame,
  gameExists,
  addUserToGame,
  removeUserFromGame,
  getGameBySocketId,
  getUsernameBySocketId,
  getSocketIdByUsername,
  getGameUsers,
  updatePlayerScore,
  addPlayerWord,
  playerHasWord,
  getLeaderboard,
  resetGameForNewRound,
  isHost,
  updateHostSocketId,
  cleanupStaleGames,
  cleanupEmptyRooms,
  getActiveRooms,
  getAllGames,
  updateUserPresence,
  updateUserHeartbeat,
  markUserActivity,
  getPresenceConfig,
} = require('../modules/gameStateManager');

describe('Game State Manager', () => {

  // Clean up after each test
  afterEach(() => {
    // Clean up all games created during tests
    const { games } = require('../modules/gameStateManager');
    Object.keys(games).forEach(code => deleteGame(code));
  });

  describe('Game CRUD Operations', () => {

    test('creates a new game', () => {
      const game = createGame('TEST', {
        hostSocketId: 'socket-1',
        hostUsername: 'TestHost',
        hostPlayerId: 'player-1',
        roomName: 'Test Room',
        language: 'en',
      });

      expect(game).not.toBeNull();
      expect(game.gameCode).toBe('TEST');
      expect(game.hostSocketId).toBe('socket-1');
      expect(game.hostUsername).toBe('TestHost');
      expect(game.language).toBe('en');
      expect(game.gameState).toBe('waiting');
    });

    test('retrieves existing game', () => {
      createGame('GET1', {
        hostSocketId: 'socket-2',
        hostUsername: 'Host2',
      });

      const game = getGame('GET1');
      expect(game).not.toBeNull();
      expect(game.gameCode).toBe('GET1');
    });

    test('returns null for non-existent game', () => {
      const game = getGame('NONE');
      expect(game).toBeNull();
    });

    test('updates game properties', () => {
      createGame('UPD1', {
        hostSocketId: 'socket-3',
        hostUsername: 'Host3',
      });

      updateGame('UPD1', { gameState: 'in-progress' });
      const game = getGame('UPD1');
      expect(game.gameState).toBe('in-progress');
    });

    test('deletes game and cleans up mappings', () => {
      createGame('DEL1', {
        hostSocketId: 'socket-4',
        hostUsername: 'Host4',
      });

      addUserToGame('DEL1', 'Player1', 'socket-5');

      expect(gameExists('DEL1')).toBe(true);

      deleteGame('DEL1');

      expect(gameExists('DEL1')).toBe(false);
      expect(getGame('DEL1')).toBeNull();
      expect(getGameBySocketId('socket-5')).toBeNull();
    });

    test('gameExists returns correct boolean', () => {
      expect(gameExists('NONE')).toBe(false);

      createGame('EXST', {
        hostSocketId: 'socket-6',
        hostUsername: 'Host6',
      });

      expect(gameExists('EXST')).toBe(true);
    });

  });

  describe('User Management', () => {

    test('adds user to game', () => {
      createGame('USR1', {
        hostSocketId: 'host-socket',
        hostUsername: 'Host',
      });

      const result = addUserToGame('USR1', 'Player1', 'player-socket-1', {
        avatar: { emoji: '🎮', color: '#FF0000' },
        isHost: false,
      });

      expect(result).toBe(true);

      const game = getGame('USR1');
      expect(game.users['Player1']).toBeDefined();
      expect(game.users['Player1'].socketId).toBe('player-socket-1');
    });

    test('removes user from game', () => {
      createGame('USR2', {
        hostSocketId: 'host-socket-2',
        hostUsername: 'Host2',
      });

      addUserToGame('USR2', 'Player2', 'player-socket-2');

      removeUserFromGame('USR2', 'Player2');

      const game = getGame('USR2');
      expect(game.users['Player2']).toBeUndefined();
    });

    test('gets game by socket ID', () => {
      createGame('USR3', {
        hostSocketId: 'host-socket-3',
        hostUsername: 'Host3',
      });

      addUserToGame('USR3', 'Player3', 'player-socket-3');

      expect(getGameBySocketId('player-socket-3')).toBe('USR3');
      expect(getGameBySocketId('unknown-socket')).toBeNull();
    });

    test('gets username by socket ID', () => {
      createGame('USR4', {
        hostSocketId: 'host-socket-4',
        hostUsername: 'Host4',
      });

      addUserToGame('USR4', 'TestPlayer', 'test-player-socket');

      expect(getUsernameBySocketId('test-player-socket')).toBe('TestPlayer');
      expect(getUsernameBySocketId('unknown')).toBeNull();
    });

    test('gets socket ID by username', () => {
      createGame('USR5', {
        hostSocketId: 'host-socket-5',
        hostUsername: 'Host5',
      });

      addUserToGame('USR5', 'LookupPlayer', 'lookup-socket');

      expect(getSocketIdByUsername('USR5', 'LookupPlayer')).toBe('lookup-socket');
      expect(getSocketIdByUsername('USR5', 'Unknown')).toBeNull();
    });

    test('getGameUsers returns all users with scores', () => {
      createGame('USR6', {
        hostSocketId: 'host-socket-6',
        hostUsername: 'Host6',
      });

      addUserToGame('USR6', 'Host6', 'host-socket-6', { isHost: true });
      addUserToGame('USR6', 'Player6', 'player-socket-6');

      updatePlayerScore('USR6', 'Host6', 100);
      updatePlayerScore('USR6', 'Player6', 50);

      const users = getGameUsers('USR6');
      expect(users.length).toBe(2);
      expect(users.find(u => u.username === 'Host6').score).toBe(100);
      expect(users.find(u => u.username === 'Host6').isHost).toBe(true);
    });

  });

  describe('Score and Word Management', () => {

    test('updates player score with delta', () => {
      createGame('SCR1', {
        hostSocketId: 'score-host',
        hostUsername: 'ScoreHost',
      });

      addUserToGame('SCR1', 'Scorer', 'scorer-socket');

      updatePlayerScore('SCR1', 'Scorer', 10, true); // Add 10
      updatePlayerScore('SCR1', 'Scorer', 5, true);  // Add 5

      const game = getGame('SCR1');
      expect(game.playerScores['Scorer']).toBe(15);
    });

    test('updates player score with absolute value', () => {
      createGame('SCR2', {
        hostSocketId: 'score-host-2',
        hostUsername: 'ScoreHost2',
      });

      addUserToGame('SCR2', 'Scorer2', 'scorer-socket-2');

      updatePlayerScore('SCR2', 'Scorer2', 100, false); // Set to 100

      const game = getGame('SCR2');
      expect(game.playerScores['Scorer2']).toBe(100);
    });

    test('adds word to player list', () => {
      createGame('WRD1', {
        hostSocketId: 'word-host',
        hostUsername: 'WordHost',
      });

      addUserToGame('WRD1', 'WordPlayer', 'word-socket');

      addPlayerWord('WRD1', 'WordPlayer', 'HELLO', { score: 5 });
      addPlayerWord('WRD1', 'WordPlayer', 'World', { score: 5 });

      const game = getGame('WRD1');
      expect(game.playerWords['WordPlayer']).toContain('hello');
      expect(game.playerWords['WordPlayer']).toContain('world');
    });

    test('prevents duplicate words', () => {
      createGame('WRD2', {
        hostSocketId: 'word-host-2',
        hostUsername: 'WordHost2',
      });

      addUserToGame('WRD2', 'WordPlayer2', 'word-socket-2');

      addPlayerWord('WRD2', 'WordPlayer2', 'duplicate');
      addPlayerWord('WRD2', 'WordPlayer2', 'DUPLICATE'); // Same word, different case

      const game = getGame('WRD2');
      expect(game.playerWords['WordPlayer2'].length).toBe(1);
    });

    test('checks if player has word', () => {
      createGame('WRD3', {
        hostSocketId: 'word-host-3',
        hostUsername: 'WordHost3',
      });

      addUserToGame('WRD3', 'WordPlayer3', 'word-socket-3');

      addPlayerWord('WRD3', 'WordPlayer3', 'exists');

      expect(playerHasWord('WRD3', 'WordPlayer3', 'exists')).toBe(true);
      expect(playerHasWord('WRD3', 'WordPlayer3', 'EXISTS')).toBe(true); // Case insensitive
      expect(playerHasWord('WRD3', 'WordPlayer3', 'notfound')).toBe(false);
    });

    test('generates sorted leaderboard', () => {
      createGame('LDR1', {
        hostSocketId: 'leader-host',
        hostUsername: 'LeaderHost',
      });

      addUserToGame('LDR1', 'First', 'first-socket');
      addUserToGame('LDR1', 'Second', 'second-socket');
      addUserToGame('LDR1', 'Third', 'third-socket');

      updatePlayerScore('LDR1', 'Third', 30);
      updatePlayerScore('LDR1', 'First', 100);
      updatePlayerScore('LDR1', 'Second', 50);

      const leaderboard = getLeaderboard('LDR1');

      expect(leaderboard[0].username).toBe('First');
      expect(leaderboard[0].score).toBe(100);
      expect(leaderboard[1].username).toBe('Second');
      expect(leaderboard[2].username).toBe('Third');
    });

  });

  describe('Host Management', () => {

    test('identifies host by socket ID', () => {
      createGame('HST1', {
        hostSocketId: 'host-id-1',
        hostUsername: 'Host1',
      });

      // Need to add user with socket mapping for isHost to work
      addUserToGame('HST1', 'Host1', 'host-id-1', { isHost: true });

      expect(isHost('host-id-1')).toBe(true);
      expect(isHost('other-socket')).toBe(false);
    });

    test('updates host socket ID', () => {
      createGame('HST2', {
        hostSocketId: 'old-host-socket',
        hostUsername: 'Host2',
      });

      updateHostSocketId('HST2', 'new-host-socket');

      const game = getGame('HST2');
      expect(game.hostSocketId).toBe('new-host-socket');
    });

  });

  describe('Game Reset and Cleanup', () => {

    test('resets game for new round', () => {
      createGame('RST1', {
        hostSocketId: 'reset-host',
        hostUsername: 'ResetHost',
      });

      addUserToGame('RST1', 'Player1', 'player-1');
      addUserToGame('RST1', 'Player2', 'player-2');

      updatePlayerScore('RST1', 'Player1', 100);
      addPlayerWord('RST1', 'Player1', 'test');
      updateGame('RST1', { gameState: 'finished' });

      resetGameForNewRound('RST1');

      const game = getGame('RST1');
      expect(game.gameState).toBe('waiting');
      expect(game.playerScores['Player1']).toBe(0);
      expect(game.playerWords['Player1']).toEqual([]);
    });

    test('cleans up stale games', () => {
      createGame('STL1', {
        hostSocketId: 'stale-host',
        hostUsername: 'StaleHost',
      });

      // Manually set lastActivity to old time
      const game = getGame('STL1');
      game.lastActivity = Date.now() - (60 * 60 * 1000); // 1 hour ago

      const cleaned = cleanupStaleGames(30 * 60 * 1000); // 30 min threshold

      expect(cleaned).toBe(1);
      expect(gameExists('STL1')).toBe(false);
    });

    test('cleans up empty rooms', () => {
      createGame('EMP1', {
        hostSocketId: 'empty-host',
        hostUsername: 'EmptyHost',
      });

      // Remove all users
      const game = getGame('EMP1');
      Object.keys(game.users).forEach(u => removeUserFromGame('EMP1', u));

      const cleaned = cleanupEmptyRooms();

      expect(cleaned).toBe(1);
      expect(gameExists('EMP1')).toBe(false);
    });

  });

  describe('Room Listing', () => {

    test('getActiveRooms returns rooms with players', () => {
      createGame('ACT1', {
        hostSocketId: 'active-host-1',
        hostUsername: 'ActiveHost1',
        roomName: 'Active Room 1',
      });
      addUserToGame('ACT1', 'ActiveHost1', 'active-host-1');

      createGame('ACT2', {
        hostSocketId: 'active-host-2',
        hostUsername: 'ActiveHost2',
        roomName: 'Active Room 2',
      });
      // ACT2 has no players added

      const rooms = getActiveRooms();
      expect(rooms.find(r => r.gameCode === 'ACT1')).toBeDefined();
      expect(rooms.find(r => r.gameCode === 'ACT2')).toBeUndefined(); // Empty
    });

    test('getAllGames returns all games', () => {
      createGame('ALL1', {
        hostSocketId: 'all-host-1',
        hostUsername: 'AllHost1',
      });

      createGame('ALL2', {
        hostSocketId: 'all-host-2',
        hostUsername: 'AllHost2',
      });

      const games = getAllGames();
      expect(games.length).toBeGreaterThanOrEqual(2);
      expect(games.find(g => g.gameCode === 'ALL1')).toBeDefined();
      expect(games.find(g => g.gameCode === 'ALL2')).toBeDefined();
    });

  });

  describe('Presence Tracking', () => {

    test('updates user presence status', () => {
      createGame('PRS1', {
        hostSocketId: 'presence-host',
        hostUsername: 'PresenceHost',
      });

      addUserToGame('PRS1', 'PresenceUser', 'presence-socket');

      const status = updateUserPresence('PRS1', 'PresenceUser', {
        isWindowFocused: false,
      });

      expect(status).toBe('idle');
    });

    test('updates user heartbeat', () => {
      createGame('HBT1', {
        hostSocketId: 'heartbeat-host',
        hostUsername: 'HeartbeatHost',
      });

      addUserToGame('HBT1', 'HeartbeatUser', 'heartbeat-socket');

      const result = updateUserHeartbeat('HBT1', 'HeartbeatUser');

      // First heartbeat shouldn't indicate recovery
      expect(result).toBeNull();
    });

    test('marks user activity', () => {
      createGame('ACT3', {
        hostSocketId: 'activity-host',
        hostUsername: 'ActivityHost',
      });

      addUserToGame('ACT3', 'ActivityUser', 'activity-socket');

      // Mark as idle first
      updateUserPresence('ACT3', 'ActivityUser', { isWindowFocused: false });

      // Then mark activity
      markUserActivity('ACT3', 'ActivityUser');

      const game = getGame('ACT3');
      expect(game.users['ActivityUser'].lastActivityAt).toBeDefined();
    });

    test('getPresenceConfig returns config object', () => {
      const config = getPresenceConfig();

      expect(config.IDLE_THRESHOLD).toBeDefined();
      expect(config.AFK_THRESHOLD).toBeDefined();
      expect(config.HEARTBEAT_TIMEOUT).toBeDefined();
    });

  });

});
