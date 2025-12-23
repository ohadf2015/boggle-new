/**
 * Socket Middleware Module
 * Provides composable middleware for socket event handlers
 *
 * Consolidates repeated patterns across all handlers:
 * - Rate limiting (checkRateLimit)
 * - Payload validation (validatePayload)
 * - Socket migration check (isSocketMigrating)
 * - Game context extraction (gameCode, username)
 * - Error handling (wrapSocketHandler)
 *
 * Usage:
 * ```js
 * const handler = createSocketHandler('submitWord', {
 *   schema: submitWordSchema,
 *   rateWeight: 1,
 *   requireGame: true,
 * }, async (context) => {
 *   const { io, socket, data, gameCode, username, game } = context;
 *   // Handler logic here
 * });
 *
 * socket.on('submitWord', handler);
 * ```
 */

const { checkRateLimit } = require('./rateLimiter');
const { validatePayload } = require('./socketValidation');
const { emitError, ErrorCodes, wrapSocketHandler, createError, emitAppError } = require('./errorHandler');
const { isSocketMigrating } = require('../handlers/shared');
const { getGame, getGameBySocketId, getUsernameBySocketId } = require('../modules/gameStateManager');
const logger = require('./logger');

/**
 * @typedef {Object} HandlerContext
 * @property {Server} io - Socket.IO server instance
 * @property {Socket} socket - Socket.IO socket instance
 * @property {Object} data - Validated payload data
 * @property {string} correlationId - Unique ID for tracing
 * @property {string} [gameCode] - Game code (if requireGame is true)
 * @property {string} [username] - Username (if requireGame is true)
 * @property {Object} [game] - Game object (if requireGame is true)
 */

/**
 * @typedef {Object} HandlerOptions
 * @property {Object} [schema] - Validation schema (from socketValidation)
 * @property {number} [rateWeight=1] - Rate limit weight
 * @property {boolean} [requireGame=false] - Whether handler requires active game context
 * @property {boolean} [requireHost=false] - Whether handler requires host privileges
 * @property {boolean} [checkMigration=true] - Whether to check for socket migration
 * @property {string} [gameNotFoundError] - Custom error message for game not found
 */

/**
 * Create a composable socket event handler with middleware
 *
 * @param {string} eventName - Event name for logging
 * @param {HandlerOptions} options - Handler options
 * @param {Function} handler - Async handler function (context) => Promise<void>
 * @returns {Function} - Socket event handler bound to io
 */
function createSocketHandler(eventName, options, handler) {
  const {
    schema = null,
    rateWeight = 1,
    requireGame = false,
    requireHost = false,
    checkMigration = true,
    gameNotFoundError = 'Game not found or you are not in a game',
  } = options;

  return (io, socket) => async (data) => {
    // Generate correlation ID for tracing
    const correlationId = `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // 1. Check for socket migration
      if (checkMigration && isSocketMigrating(socket)) {
        logger.debug('MIDDLEWARE', `[${eventName}] Skipped - socket migrating`, { socketId: socket.id });
        return;
      }

      // 2. Check rate limit
      if (rateWeight > 0 && !checkRateLimit(socket.id, rateWeight)) {
        socket.emit('rateLimited');
        logger.debug('MIDDLEWARE', `[${eventName}] Rate limited`, { socketId: socket.id });
        return;
      }

      // 3. Validate payload
      let validatedData = data;
      if (schema) {
        const validation = validatePayload(schema, data);
        if (!validation.success) {
          emitError(socket, ErrorCodes.VALIDATION_INVALID_PAYLOAD, {
            message: `Invalid request: ${validation.error}`,
            correlationId,
          });
          return;
        }
        validatedData = validation.data;
      }

      // 4. Build context
      const context = {
        io,
        socket,
        data: validatedData,
        correlationId,
      };

      // 5. Extract game context if required
      if (requireGame || requireHost) {
        const gameCode = getGameBySocketId(socket.id);
        const username = getUsernameBySocketId(socket.id);

        if (!gameCode || !username) {
          emitError(socket, ErrorCodes.PLAYER_NOT_IN_GAME, {
            message: gameNotFoundError,
            correlationId,
          });
          return;
        }

        const game = getGame(gameCode);
        if (!game) {
          emitError(socket, ErrorCodes.GAME_NOT_FOUND, { correlationId });
          return;
        }

        context.gameCode = gameCode;
        context.username = username;
        context.game = game;

        // 6. Check host privileges if required
        if (requireHost && game.host !== username) {
          emitError(socket, ErrorCodes.PLAYER_NOT_HOST, { correlationId });
          return;
        }
      }

      // 7. Execute handler
      await handler(context);

    } catch (error) {
      logger.error('HANDLER_ERROR', `Error in ${eventName}`, {
        correlationId,
        socketId: socket.id,
        error: error.message,
        stack: error.stack,
      });

      emitError(socket, ErrorCodes.INTERNAL_ERROR, { correlationId });
    }
  };
}

/**
 * Create a simple handler for events that only need rate limiting
 *
 * @param {string} eventName - Event name
 * @param {number} rateWeight - Rate limit weight
 * @param {Function} handler - Handler function (io, socket, data) => void
 * @returns {Function}
 */
function createSimpleHandler(eventName, rateWeight, handler) {
  return (io, socket) => (data) => {
    if (isSocketMigrating(socket)) return;

    if (rateWeight > 0 && !checkRateLimit(socket.id, rateWeight)) {
      socket.emit('rateLimited');
      return;
    }

    try {
      handler(io, socket, data);
    } catch (error) {
      logger.error('HANDLER_ERROR', `Error in ${eventName}`, {
        socketId: socket.id,
        error: error.message,
      });
      emitError(socket, ErrorCodes.INTERNAL_ERROR);
    }
  };
}

/**
 * Register a handler with the socket using the createSocketHandler pattern
 *
 * @param {Socket} socket - Socket.IO socket instance
 * @param {Server} io - Socket.IO server instance
 * @param {string} eventName - Event name
 * @param {HandlerOptions} options - Handler options
 * @param {Function} handler - Handler function
 */
function registerHandler(socket, io, eventName, options, handler) {
  const wrappedHandler = createSocketHandler(eventName, options, handler);
  socket.on(eventName, wrappedHandler(io, socket));
}

/**
 * Helper to emit success response with consistent format
 *
 * @param {Socket} socket - Socket.IO socket instance
 * @param {string} event - Event name to emit
 * @param {Object} data - Success data
 */
function emitSuccess(socket, event, data = {}) {
  socket.emit(event, {
    success: true,
    ...data,
  });
}

/**
 * Helper to execute handler and emit result
 * Useful for request-response style events
 *
 * @param {Socket} socket - Socket.IO socket instance
 * @param {string} successEvent - Event to emit on success
 * @param {string} errorEvent - Event to emit on error (optional)
 * @param {Function} handler - Async handler returning result data
 */
async function executeWithResult(socket, successEvent, errorEvent, handler) {
  try {
    const result = await handler();
    socket.emit(successEvent, { success: true, ...result });
  } catch (error) {
    if (errorEvent) {
      socket.emit(errorEvent, {
        success: false,
        error: error.message || 'An error occurred',
      });
    }
    throw error; // Re-throw for outer error handling
  }
}

/**
 * Middleware composition utility
 * Allows chaining multiple middleware functions
 *
 * @param {...Function} middlewares - Middleware functions
 * @returns {Function} - Composed middleware
 */
function compose(...middlewares) {
  return (context) => {
    return middlewares.reduce((promise, middleware) => {
      return promise.then(() => middleware(context));
    }, Promise.resolve());
  };
}

/**
 * Rate limiting middleware factory
 *
 * @param {number} weight - Rate limit weight
 * @returns {Function} - Middleware function
 */
function withRateLimit(weight) {
  return (context) => {
    if (!checkRateLimit(context.socket.id, weight)) {
      context.socket.emit('rateLimited');
      throw new Error('RATE_LIMITED'); // Stop middleware chain
    }
  };
}

/**
 * Game context middleware factory
 * Adds gameCode, username, and game to context
 *
 * @returns {Function} - Middleware function
 */
function withGameContext() {
  return (context) => {
    const gameCode = getGameBySocketId(context.socket.id);
    const username = getUsernameBySocketId(context.socket.id);

    if (!gameCode || !username) {
      emitError(context.socket, ErrorCodes.PLAYER_NOT_IN_GAME);
      throw new Error('NOT_IN_GAME');
    }

    const game = getGame(gameCode);
    if (!game) {
      emitError(context.socket, ErrorCodes.GAME_NOT_FOUND);
      throw new Error('GAME_NOT_FOUND');
    }

    context.gameCode = gameCode;
    context.username = username;
    context.game = game;
  };
}

/**
 * Host check middleware factory
 * Requires game context to be set first
 *
 * @returns {Function} - Middleware function
 */
function withHostCheck() {
  return (context) => {
    if (!context.game || context.game.host !== context.username) {
      emitError(context.socket, ErrorCodes.PLAYER_NOT_HOST);
      throw new Error('NOT_HOST');
    }
  };
}

/**
 * Validation middleware factory
 *
 * @param {Object} schema - Validation schema
 * @returns {Function} - Middleware function
 */
function withValidation(schema) {
  return (context) => {
    const validation = validatePayload(schema, context.rawData);
    if (!validation.success) {
      emitError(context.socket, ErrorCodes.VALIDATION_INVALID_PAYLOAD, {
        message: `Invalid request: ${validation.error}`,
      });
      throw new Error('VALIDATION_FAILED');
    }
    context.data = validation.data;
  };
}

module.exports = {
  // Main handler creator
  createSocketHandler,
  createSimpleHandler,
  registerHandler,

  // Response helpers
  emitSuccess,
  executeWithResult,

  // Middleware composition
  compose,
  withRateLimit,
  withGameContext,
  withHostCheck,
  withValidation,
};
