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
 * ```ts
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

import type { Server, Socket } from 'socket.io';
import type { ZodSchema } from 'zod';
import type { Game } from '@/shared/types';
import { checkRateLimit } from './rateLimiter';
import { validatePayload } from './socketValidation';
import { emitError, ErrorCodes } from './errorHandler';
import { isSocketMigrating } from '../handlers/shared';
import { getGame, getGameBySocketId, getUsernameBySocketId } from '../modules/gameStateManager';
import logger from './logger';

// ==========================================
// Type Definitions
// ==========================================

interface HandlerContext<T = unknown> {
  io: Server;
  socket: Socket;
  data: T;
  correlationId: string;
  gameCode?: string;
  username?: string;
  game?: Game;
}

interface HandlerOptions {
  schema?: ZodSchema | null;
  rateWeight?: number;
  requireGame?: boolean;
  requireHost?: boolean;
  checkMigration?: boolean;
  gameNotFoundError?: string;
}

type ContextHandler<T = unknown> = (context: HandlerContext<T>) => Promise<void>;
type SimpleHandler = (io: Server, socket: Socket, data: unknown) => void;

interface MiddlewareContext<T = unknown> {
  io: Server;
  socket: Socket;
  rawData: unknown;
  data: T;
  correlationId: string;
  gameCode?: string;
  username?: string;
  game?: Game;
}

type Middleware<T = unknown> = (context: MiddlewareContext<T>) => void | Promise<void>;

// ==========================================
// Handler Factory Functions
// ==========================================

/**
 * Create a composable socket event handler with middleware
 */
export function createSocketHandler<T = unknown>(
  eventName: string,
  options: HandlerOptions,
  handler: ContextHandler<T>
): (io: Server, socket: Socket) => (data: unknown) => Promise<void> {
  const {
    schema = null,
    rateWeight = 1,
    requireGame = false,
    requireHost = false,
    checkMigration = true,
    gameNotFoundError = 'Game not found or you are not in a game',
  } = options;

  return (io: Server, socket: Socket) => async (data: unknown): Promise<void> => {
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
      let validatedData = data as T;
      if (schema) {
        const validation = validatePayload(schema, data);
        if (!validation.success) {
          emitError(socket, ErrorCodes.VALIDATION_INVALID_PAYLOAD, {
            message: `Invalid request: ${validation.error}`,
            correlationId,
          });
          return;
        }
        validatedData = validation.data as T;
      }

      // 4. Build context
      const context: HandlerContext<T> = {
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
        context.game = game as unknown as Game;

        // 6. Check host privileges if required
        if (requireHost && game.hostUsername !== username) {
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
        error: (error as Error).message,
        stack: (error as Error).stack,
      });

      emitError(socket, ErrorCodes.INTERNAL_ERROR, { correlationId });
    }
  };
}

/**
 * Create a simple handler for events that only need rate limiting
 */
export function createSimpleHandler(
  eventName: string,
  rateWeight: number,
  handler: SimpleHandler
): (io: Server, socket: Socket) => (data: unknown) => void {
  return (io: Server, socket: Socket) => (data: unknown): void => {
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
        error: (error as Error).message,
      });
      emitError(socket, ErrorCodes.INTERNAL_ERROR);
    }
  };
}

/**
 * Register a handler with the socket using the createSocketHandler pattern
 */
export function registerHandler<T = unknown>(
  socket: Socket,
  io: Server,
  eventName: string,
  options: HandlerOptions,
  handler: ContextHandler<T>
): void {
  const wrappedHandler = createSocketHandler(eventName, options, handler);
  socket.on(eventName, wrappedHandler(io, socket));
}

// ==========================================
// Response Helpers
// ==========================================

/**
 * Helper to emit success response with consistent format
 */
export function emitSuccess(socket: Socket, event: string, data: Record<string, unknown> = {}): void {
  socket.emit(event, {
    success: true,
    ...data,
  });
}

/**
 * Helper to execute handler and emit result
 * Useful for request-response style events
 */
export async function executeWithResult<T>(
  socket: Socket,
  successEvent: string,
  errorEvent: string | null,
  handler: () => Promise<T>
): Promise<void> {
  try {
    const result = await handler();
    socket.emit(successEvent, { success: true, ...(result as Record<string, unknown>) });
  } catch (error) {
    if (errorEvent) {
      socket.emit(errorEvent, {
        success: false,
        error: (error as Error).message || 'An error occurred',
      });
    }
    throw error; // Re-throw for outer error handling
  }
}

// ==========================================
// Middleware Composition
// ==========================================

/**
 * Middleware composition utility
 * Allows chaining multiple middleware functions
 */
export function compose<T = unknown>(...middlewares: Middleware<T>[]): (context: MiddlewareContext<T>) => Promise<void> {
  return (context: MiddlewareContext<T>): Promise<void> => {
    return middlewares.reduce((promise, middleware) => {
      return promise.then(() => middleware(context));
    }, Promise.resolve());
  };
}

/**
 * Rate limiting middleware factory
 */
export function withRateLimit(weight: number): Middleware {
  return (context: MiddlewareContext): void => {
    if (!checkRateLimit(context.socket.id, weight)) {
      context.socket.emit('rateLimited');
      throw new Error('RATE_LIMITED'); // Stop middleware chain
    }
  };
}

/**
 * Game context middleware factory
 * Adds gameCode, username, and game to context
 */
export function withGameContext<T = unknown>(): Middleware<T> {
  return (context: MiddlewareContext<T>): void => {
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
    context.game = game as unknown as Game;
  };
}

/**
 * Host check middleware factory
 * Requires game context to be set first
 */
export function withHostCheck<T = unknown>(): Middleware<T> {
  return (context: MiddlewareContext<T>): void => {
    if (!context.game || context.game.hostUsername !== context.username) {
      emitError(context.socket, ErrorCodes.PLAYER_NOT_HOST);
      throw new Error('NOT_HOST');
    }
  };
}

/**
 * Validation middleware factory
 */
export function withValidation<T>(schema: ZodSchema<T>): Middleware<T> {
  return (context: MiddlewareContext<T>): void => {
    const validation = validatePayload(schema, context.rawData);
    if (!validation.success) {
      emitError(context.socket, ErrorCodes.VALIDATION_INVALID_PAYLOAD, {
        message: `Invalid request: ${validation.error}`,
      });
      throw new Error('VALIDATION_FAILED');
    }
    context.data = validation.data as T;
  };
}

export type { HandlerContext, HandlerOptions, MiddlewareContext, Middleware };
