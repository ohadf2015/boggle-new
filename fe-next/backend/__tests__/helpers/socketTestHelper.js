/**
 * Socket.IO Integration Test Helper
 *
 * Provides utilities for testing Socket.IO event handlers in isolation.
 * Uses the real handler code but mocks the Socket.IO server/socket objects.
 *
 * Usage:
 *   const { createTestEnvironment, createMockSocket } = require('./helpers/socketTestHelper');
 *
 *   describe('Game Handlers', () => {
 *     let env;
 *
 *     beforeEach(() => {
 *       env = createTestEnvironment();
 *     });
 *
 *     afterEach(() => {
 *       env.cleanup();
 *     });
 *
 *     test('creates a game', async () => {
 *       const socket = env.createSocket();
 *       await socket.emit('createGame', { gameCode: 'TEST', ... });
 *       expect(socket.getEmittedEvents()).toContainEvent('joined');
 *     });
 *   });
 */

const EventEmitter = require('events');

// ==========================================
// Mock Socket Implementation
// ==========================================

class MockSocket extends EventEmitter {
  constructor(io, id = null) {
    super();
    this.id = id || `socket_${Math.random().toString(36).substring(7)}`;
    this.io = io;
    this.connected = true;
    this.rooms = new Set([this.id]); // Socket is always in its own room
    this.data = {};

    // Track emitted events for assertions
    this._emittedEvents = [];
    this._joinedRooms = [];
    this._leftRooms = [];
  }

  /**
   * Join a room
   * @param {string} room - Room name
   */
  join(room) {
    this.rooms.add(room);
    this._joinedRooms.push(room);
    this.io._addSocketToRoom(room, this);
  }

  /**
   * Leave a room
   * @param {string} room - Room name
   */
  leave(room) {
    this.rooms.delete(room);
    this._leftRooms.push(room);
    this.io._removeSocketFromRoom(room, this);
  }

  /**
   * Override emit to track emitted events
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    this._emittedEvents.push({ event, data, timestamp: Date.now() });
    // Also emit locally for test listeners
    super.emit(`_emitted:${event}`, data);
    return true;
  }

  /**
   * Simulate receiving an event from client
   * Triggers the registered handlers
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @returns {Promise<void>}
   */
  async receiveEvent(event, data) {
    // Get listeners for this event
    const listeners = this.listeners(event);
    for (const listener of listeners) {
      await listener(data);
    }
  }

  /**
   * Disconnect the socket
   * @param {boolean} close - Whether to close the connection
   */
  disconnect(close = false) {
    this.connected = false;
    this.emit('disconnect', close ? 'transport close' : 'client namespace disconnect');
  }

  // ==========================================
  // Test Assertion Helpers
  // ==========================================

  /**
   * Get all emitted events
   * @returns {Array<{event: string, data: any, timestamp: number}>}
   */
  getEmittedEvents() {
    return this._emittedEvents;
  }

  /**
   * Get emitted events by name
   * @param {string} eventName - Event name to filter by
   * @returns {Array<{event: string, data: any, timestamp: number}>}
   */
  getEmittedEventsByName(eventName) {
    return this._emittedEvents.filter(e => e.event === eventName);
  }

  /**
   * Get the most recent emitted event
   * @returns {{event: string, data: any, timestamp: number} | null}
   */
  getLastEmittedEvent() {
    return this._emittedEvents[this._emittedEvents.length - 1] || null;
  }

  /**
   * Check if a specific event was emitted
   * @param {string} eventName - Event name
   * @returns {boolean}
   */
  wasEventEmitted(eventName) {
    return this._emittedEvents.some(e => e.event === eventName);
  }

  /**
   * Get rooms this socket has joined
   * @returns {string[]}
   */
  getJoinedRooms() {
    return this._joinedRooms;
  }

  /**
   * Clear tracked events (for test isolation)
   */
  clearTracking() {
    this._emittedEvents = [];
    this._joinedRooms = [];
    this._leftRooms = [];
  }

  /**
   * Wait for a specific event to be emitted
   * @param {string} eventName - Event name to wait for
   * @param {number} timeout - Timeout in ms
   * @returns {Promise<{event: string, data: any}>}
   */
  waitForEvent(eventName, timeout = 1000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }, timeout);

      this.once(`_emitted:${eventName}`, (data) => {
        clearTimeout(timeoutId);
        resolve({ event: eventName, data });
      });
    });
  }
}

// ==========================================
// Mock IO Server Implementation
// ==========================================

class MockIO extends EventEmitter {
  constructor() {
    super();
    this.sockets = new Map(); // socketId -> socket
    this.rooms = new Map(); // roomName -> Set<socket>
    this._broadcastEvents = [];
  }

  /**
   * Add a socket to a room
   * @param {string} room - Room name
   * @param {MockSocket} socket - Socket to add
   */
  _addSocketToRoom(room, socket) {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room).add(socket);
  }

  /**
   * Remove a socket from a room
   * @param {string} room - Room name
   * @param {MockSocket} socket - Socket to remove
   */
  _removeSocketFromRoom(room, socket) {
    if (this.rooms.has(room)) {
      this.rooms.get(room).delete(socket);
      if (this.rooms.get(room).size === 0) {
        this.rooms.delete(room);
      }
    }
  }

  /**
   * Get sockets in a room
   * @param {string} room - Room name
   * @returns {Set<MockSocket>}
   */
  _getSocketsInRoom(room) {
    return this.rooms.get(room) || new Set();
  }

  /**
   * Emit to all connected sockets
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    this._broadcastEvents.push({ event, data, target: 'all' });
    for (const socket of this.sockets.values()) {
      socket.emit(event, data);
    }
  }

  /**
   * Get adapter for room operations
   * @returns {Object}
   */
  get adapter() {
    return {
      rooms: this.rooms,
    };
  }

  /**
   * Target a specific room
   * @param {string} room - Room name
   * @returns {Object}
   */
  to(room) {
    return {
      emit: (event, data) => {
        this._broadcastEvents.push({ event, data, target: room });
        const sockets = this._getSocketsInRoom(room);
        for (const socket of sockets) {
          socket.emit(event, data);
        }
      },
    };
  }

  /**
   * Target a specific room (alias for to)
   * @param {string} room - Room name
   * @returns {Object}
   */
  in(room) {
    return this.to(room);
  }

  /**
   * Get all broadcast events
   * @returns {Array}
   */
  getBroadcastEvents() {
    return this._broadcastEvents;
  }

  /**
   * Clear broadcast tracking
   */
  clearTracking() {
    this._broadcastEvents = [];
  }
}

// ==========================================
// Test Environment Factory
// ==========================================

/**
 * Create a complete test environment
 * @returns {Object} Test environment with utilities
 */
function createTestEnvironment() {
  const io = new MockIO();
  const sockets = [];

  // Clean up game state between tests
  const cleanupGameState = () => {
    try {
      const { games } = require('../../modules/gameStateManager');
      Object.keys(games).forEach(code => {
        try {
          const { deleteGame } = require('../../modules/gameStateManager');
          deleteGame(code);
        } catch (e) {
          // Ignore cleanup errors
        }
      });
    } catch (e) {
      // Module not loaded yet, nothing to clean
    }
  };

  return {
    io,

    /**
     * Create a new mock socket and register handlers
     * @param {string} socketId - Optional socket ID
     * @returns {MockSocket}
     */
    createSocket(socketId = null) {
      const socket = new MockSocket(io, socketId);
      io.sockets.set(socket.id, socket);
      sockets.push(socket);

      // Register all handlers
      try {
        const { registerAllHandlers } = require('../../handlers');
        registerAllHandlers(io, socket);
      } catch (e) {
        console.warn('Could not register handlers:', e.message);
      }

      return socket;
    },

    /**
     * Get a socket by ID
     * @param {string} socketId - Socket ID
     * @returns {MockSocket | undefined}
     */
    getSocket(socketId) {
      return io.sockets.get(socketId);
    },

    /**
     * Get all active sockets
     * @returns {MockSocket[]}
     */
    getAllSockets() {
      return Array.from(io.sockets.values());
    },

    /**
     * Clean up all resources
     */
    cleanup() {
      for (const socket of sockets) {
        socket.removeAllListeners();
        socket.connected = false;
      }
      io.sockets.clear();
      io.rooms.clear();
      io.removeAllListeners();
      cleanupGameState();
    },

    /**
     * Helper to generate test game data
     * @param {Object} overrides - Override default values
     * @returns {Object}
     */
    createGameData(overrides = {}) {
      const code = `TEST${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      return {
        gameCode: code,
        roomName: `Test Room ${code}`,
        language: 'en',
        hostUsername: 'TestHost',
        playerId: `player_${Date.now()}`,
        avatar: { emoji: '🎮', color: '#FF6B6B' },
        ...overrides,
      };
    },

    /**
     * Helper to generate test join data
     * @param {string} gameCode - Game code to join
     * @param {Object} overrides - Override default values
     * @returns {Object}
     */
    createJoinData(gameCode, overrides = {}) {
      return {
        gameCode,
        username: `Player${Math.floor(Math.random() * 1000)}`,
        playerId: `player_${Date.now()}`,
        avatar: { emoji: '🎯', color: '#4ECDC4' },
        ...overrides,
      };
    },
  };
}

// ==========================================
// Custom Jest Matchers
// ==========================================

/**
 * Custom matcher to check if an event was emitted
 * Usage: expect(socket.getEmittedEvents()).toContainEvent('joined')
 */
const customMatchers = {
  toContainEvent(received, eventName) {
    const pass = received.some(e => e.event === eventName);
    return {
      pass,
      message: () =>
        pass
          ? `Expected events not to contain "${eventName}"`
          : `Expected events to contain "${eventName}", but got: ${received.map(e => e.event).join(', ')}`,
    };
  },

  toContainEventWithData(received, eventName, expectedData) {
    const matchingEvents = received.filter(e => e.event === eventName);
    const pass = matchingEvents.some(e => {
      try {
        expect(e.data).toMatchObject(expectedData);
        return true;
      } catch {
        return false;
      }
    });

    return {
      pass,
      message: () =>
        pass
          ? `Expected events not to contain "${eventName}" with specified data`
          : `Expected events to contain "${eventName}" with data matching ${JSON.stringify(expectedData)}`,
    };
  },
};

// ==========================================
// Exports
// ==========================================

module.exports = {
  MockSocket,
  MockIO,
  createTestEnvironment,
  customMatchers,
};
