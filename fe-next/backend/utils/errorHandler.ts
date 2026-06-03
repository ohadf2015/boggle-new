/**
 * Centralized Error Handling System
 * Provides consistent error management across all socket and API handlers
 *
 * Features:
 * - Standardized error codes and messages
 * - Error severity levels for monitoring
 * - Correlation ID support for distributed tracing
 * - Safe error wrapper for async handlers
 * - Client-safe error transformation
 */

import type { Request, Response, NextFunction } from 'express';
import type { Socket, Server } from 'socket.io';
import * as Sentry from '@sentry/nextjs';
import logger from './logger';

// ==========================================
// Type Definitions
// ==========================================

type ErrorSeverityLevel = 'low' | 'medium' | 'high' | 'critical';

interface ErrorRegistryEntry {
  message: string;
  severity: ErrorSeverityLevel;
  httpStatus: number;
}

interface ClientError {
  code: string;
  message: string;
  details?: unknown;
  correlationId?: string;
}

interface LogObject {
  code: string;
  message: string;
  severity: ErrorSeverityLevel;
  details: unknown;
  correlationId: string | null;
  timestamp: number;
  stack?: string;
}

interface AppErrorOptions {
  message?: string;
  severity?: ErrorSeverityLevel;
  httpStatus?: number;
  details?: unknown;
  correlationId?: string;
}

type SocketHandler = (io: Server, socket: Socket, data: unknown, correlationId: string) => Promise<void>;
type RouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

// ==========================================
// Error Codes Registry
// ==========================================

/**
 * Error codes grouped by domain
 * Format: DOMAIN_ERROR_TYPE
 */
export const ErrorCodes = {
  // Game errors (1xxx)
  GAME_NOT_FOUND: 'GAME_NOT_FOUND',
  GAME_ALREADY_EXISTS: 'GAME_ALREADY_EXISTS',
  GAME_NOT_IN_PROGRESS: 'GAME_NOT_IN_PROGRESS',
  GAME_ALREADY_STARTED: 'GAME_ALREADY_STARTED',
  GAME_FULL: 'GAME_FULL',
  GAME_INVALID_CODE: 'GAME_INVALID_CODE',
  GAME_CLOSED: 'GAME_CLOSED',

  // Player errors (2xxx)
  PLAYER_NOT_IN_GAME: 'PLAYER_NOT_IN_GAME',
  PLAYER_NOT_HOST: 'PLAYER_NOT_HOST',
  PLAYER_ALREADY_IN_GAME: 'PLAYER_ALREADY_IN_GAME',
  PLAYER_KICKED: 'PLAYER_KICKED',
  PLAYER_USERNAME_TAKEN: 'PLAYER_USERNAME_TAKEN',
  PLAYER_INVALID_USERNAME: 'PLAYER_INVALID_USERNAME',

  // Word submission errors (3xxx)
  WORD_INVALID: 'WORD_INVALID',
  WORD_TOO_SHORT: 'WORD_TOO_SHORT',
  WORD_NOT_ON_BOARD: 'WORD_NOT_ON_BOARD',
  WORD_ALREADY_FOUND: 'WORD_ALREADY_FOUND',
  WORD_SUBMISSION_FAILED: 'WORD_SUBMISSION_FAILED',

  // Validation errors (4xxx)
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_INVALID_PAYLOAD: 'VALIDATION_INVALID_PAYLOAD',
  VALIDATION_MISSING_FIELD: 'VALIDATION_MISSING_FIELD',

  // Rate limiting errors (5xxx)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  RATE_LIMIT_IP_BLOCKED: 'RATE_LIMIT_IP_BLOCKED',

  // Authentication errors (6xxx)
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
  // Families Policy: social surface blocked for child/unknown-age user
  SOCIAL_RESTRICTED: 'SOCIAL_RESTRICTED',

  // Tournament errors (7xxx)
  TOURNAMENT_NOT_FOUND: 'TOURNAMENT_NOT_FOUND',
  TOURNAMENT_ALREADY_STARTED: 'TOURNAMENT_ALREADY_STARTED',
  TOURNAMENT_INVALID_STATE: 'TOURNAMENT_INVALID_STATE',

  // System errors (9xxx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  REDIS_ERROR: 'REDIS_ERROR',
  WORD_PROCESSING_ERROR: 'WORD_PROCESSING_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Error severity levels for monitoring and alerting
 */
export const ErrorSeverity = {
  LOW: 'low' as const,
  MEDIUM: 'medium' as const,
  HIGH: 'high' as const,
  CRITICAL: 'critical' as const,
};

/**
 * Error code to message mapping with severity
 */
export const ErrorRegistry: Record<string, ErrorRegistryEntry> = {
  [ErrorCodes.GAME_NOT_FOUND]: {
    message: 'Game not found',
    severity: ErrorSeverity.LOW,
    httpStatus: 404
  },
  [ErrorCodes.GAME_ALREADY_EXISTS]: {
    message: 'Game code already in use',
    severity: ErrorSeverity.LOW,
    httpStatus: 409
  },
  [ErrorCodes.GAME_NOT_IN_PROGRESS]: {
    message: 'Game is not in progress',
    severity: ErrorSeverity.LOW,
    httpStatus: 400
  },
  [ErrorCodes.GAME_ALREADY_STARTED]: {
    message: 'Game has already started',
    severity: ErrorSeverity.LOW,
    httpStatus: 400
  },
  [ErrorCodes.GAME_FULL]: {
    message: 'Room is full',
    severity: ErrorSeverity.LOW,
    httpStatus: 400
  },
  [ErrorCodes.GAME_INVALID_CODE]: {
    message: 'Invalid game code format',
    severity: ErrorSeverity.LOW,
    httpStatus: 400
  },
  [ErrorCodes.GAME_CLOSED]: {
    message: 'Game room has been closed',
    severity: ErrorSeverity.LOW,
    httpStatus: 410
  },

  [ErrorCodes.PLAYER_NOT_IN_GAME]: {
    message: 'You are not in a game',
    severity: ErrorSeverity.LOW,
    httpStatus: 400
  },
  [ErrorCodes.PLAYER_NOT_HOST]: {
    message: 'Only the host can perform this action',
    severity: ErrorSeverity.LOW,
    httpStatus: 403
  },
  [ErrorCodes.PLAYER_ALREADY_IN_GAME]: {
    message: 'You are already in a game',
    severity: ErrorSeverity.LOW,
    httpStatus: 400
  },
  [ErrorCodes.PLAYER_KICKED]: {
    message: 'You have been removed from the game',
    severity: ErrorSeverity.LOW,
    httpStatus: 403
  },
  [ErrorCodes.PLAYER_USERNAME_TAKEN]: {
    message: 'Username is already taken in this game',
    severity: ErrorSeverity.LOW,
    httpStatus: 409
  },
  [ErrorCodes.PLAYER_INVALID_USERNAME]: {
    message: 'Invalid username format',
    severity: ErrorSeverity.LOW,
    httpStatus: 400
  },

  [ErrorCodes.WORD_INVALID]: {
    message: 'Invalid word',
    severity: ErrorSeverity.LOW,
    httpStatus: 400
  },
  [ErrorCodes.WORD_TOO_SHORT]: {
    message: 'Word is too short',
    severity: ErrorSeverity.LOW,
    httpStatus: 400
  },
  [ErrorCodes.WORD_NOT_ON_BOARD]: {
    message: 'Word cannot be formed on the board',
    severity: ErrorSeverity.LOW,
    httpStatus: 400
  },
  [ErrorCodes.WORD_ALREADY_FOUND]: {
    message: 'You have already found this word',
    severity: ErrorSeverity.LOW,
    httpStatus: 400
  },
  [ErrorCodes.WORD_SUBMISSION_FAILED]: {
    message: 'Word submission failed',
    severity: ErrorSeverity.MEDIUM,
    httpStatus: 500
  },

  [ErrorCodes.VALIDATION_FAILED]: {
    message: 'Validation failed',
    severity: ErrorSeverity.LOW,
    httpStatus: 400
  },
  [ErrorCodes.VALIDATION_INVALID_PAYLOAD]: {
    message: 'Invalid request payload',
    severity: ErrorSeverity.LOW,
    httpStatus: 400
  },
  [ErrorCodes.VALIDATION_MISSING_FIELD]: {
    message: 'Required field missing',
    severity: ErrorSeverity.LOW,
    httpStatus: 400
  },

  [ErrorCodes.RATE_LIMIT_EXCEEDED]: {
    message: 'Too many requests. Please slow down.',
    severity: ErrorSeverity.MEDIUM,
    httpStatus: 429
  },
  [ErrorCodes.RATE_LIMIT_IP_BLOCKED]: {
    message: 'Too many requests from your IP. Please try again later.',
    severity: ErrorSeverity.MEDIUM,
    httpStatus: 429
  },

  [ErrorCodes.AUTH_REQUIRED]: {
    message: 'Authentication required',
    severity: ErrorSeverity.LOW,
    httpStatus: 401
  },
  [ErrorCodes.AUTH_INVALID_TOKEN]: {
    message: 'Invalid authentication token',
    severity: ErrorSeverity.LOW,
    httpStatus: 401
  },
  [ErrorCodes.AUTH_EXPIRED]: {
    message: 'Authentication has expired',
    severity: ErrorSeverity.LOW,
    httpStatus: 401
  },
  [ErrorCodes.AUTH_FORBIDDEN]: {
    message: 'You do not have permission to perform this action',
    severity: ErrorSeverity.LOW,
    httpStatus: 403
  },
  [ErrorCodes.SOCIAL_RESTRICTED]: {
    message: 'This social feature is not available for your account',
    severity: ErrorSeverity.LOW,
    httpStatus: 403
  },

  [ErrorCodes.TOURNAMENT_NOT_FOUND]: {
    message: 'Tournament not found',
    severity: ErrorSeverity.LOW,
    httpStatus: 404
  },
  [ErrorCodes.TOURNAMENT_ALREADY_STARTED]: {
    message: 'Tournament has already started',
    severity: ErrorSeverity.LOW,
    httpStatus: 400
  },
  [ErrorCodes.TOURNAMENT_INVALID_STATE]: {
    message: 'Invalid tournament state for this operation',
    severity: ErrorSeverity.LOW,
    httpStatus: 400
  },

  [ErrorCodes.INTERNAL_ERROR]: {
    message: 'An unexpected error occurred',
    severity: ErrorSeverity.HIGH,
    httpStatus: 500
  },
  [ErrorCodes.SERVICE_UNAVAILABLE]: {
    message: 'Service temporarily unavailable',
    severity: ErrorSeverity.HIGH,
    httpStatus: 503
  },
  [ErrorCodes.DATABASE_ERROR]: {
    message: 'Database operation failed',
    severity: ErrorSeverity.HIGH,
    httpStatus: 500
  },
  [ErrorCodes.REDIS_ERROR]: {
    message: 'Cache operation failed',
    severity: ErrorSeverity.HIGH,
    httpStatus: 500
  },
  [ErrorCodes.WORD_PROCESSING_ERROR]: {
    message: 'An error occurred while processing your word',
    severity: ErrorSeverity.MEDIUM,
    httpStatus: 500
  },
};

// ==========================================
// Application Error Class
// ==========================================

/**
 * Custom application error with code and metadata
 */
export class AppError extends Error {
  code: string;
  severity: ErrorSeverityLevel;
  httpStatus: number;
  details: unknown;
  correlationId: string | null;
  timestamp: number;

  constructor(code: string, options: AppErrorOptions = {}) {
    const registry = ErrorRegistry[code] || ErrorRegistry[ErrorCodes.INTERNAL_ERROR];

    super(options.message || registry.message);

    this.name = 'AppError';
    this.code = code;
    this.severity = options.severity || registry.severity;
    this.httpStatus = options.httpStatus || registry.httpStatus;
    this.details = options.details || null;
    this.correlationId = options.correlationId || null;
    this.timestamp = Date.now();

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert to client-safe object (removes sensitive data)
   */
  toClientError(): ClientError {
    const result: ClientError = {
      code: this.code,
      message: this.message,
    };
    if (this.details) {
      result.details = this.details;
    }
    if (this.correlationId) {
      result.correlationId = this.correlationId;
    }
    return result;
  }

  /**
   * Convert to loggable object (includes all data)
   */
  toLogObject(): LogObject {
    return {
      code: this.code,
      message: this.message,
      severity: this.severity,
      details: this.details,
      correlationId: this.correlationId,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

// ==========================================
// Error Emission Functions
// ==========================================

interface EmitErrorOptions {
  message?: string;
  details?: unknown;
  correlationId?: string;
  code?: string;
}

/**
 * Emit a standardized error to a socket
 */
export function emitError(socket: Socket, codeOrMessage: string, options: EmitErrorOptions = {}): void {
  let errorPayload: ClientError;

  // Check if it's a known error code
  if (ErrorRegistry[codeOrMessage]) {
    const registry = ErrorRegistry[codeOrMessage];
    errorPayload = {
      code: codeOrMessage,
      message: options.message || registry.message,
    };
    if (options.details) {
      errorPayload.details = options.details;
    }
    if (options.correlationId) {
      errorPayload.correlationId = options.correlationId;
    }

    // Log based on severity
    if (registry.severity === ErrorSeverity.HIGH || registry.severity === ErrorSeverity.CRITICAL) {
      logger.error('SOCKET_ERROR', `[${codeOrMessage}] ${errorPayload.message}`, {
        socketId: socket.id,
        details: options.details,
        correlationId: options.correlationId
      });
    } else {
      logger.debug('SOCKET_ERROR', `[${codeOrMessage}] ${errorPayload.message}`, { socketId: socket.id });
    }
  } else {
    // Legacy: treat as custom message string
    errorPayload = {
      code: options.code || ErrorCodes.INTERNAL_ERROR,
      message: codeOrMessage
    };
    // Warn (not debug) so prod logs surface remaining untyped emit sites — guides migration to typed ErrorCodes.
    logger.warn('SOCKET_ERROR', `[LEGACY] ${codeOrMessage}`, { socketId: socket.id });
  }

  socket.emit('error', errorPayload);
}

/**
 * Emit an AppError to a socket
 */
export function emitAppError(socket: Socket, error: Error | AppError): void {
  if (error instanceof AppError) {
    socket.emit('error', error.toClientError());
    const logMethod = error.severity === ErrorSeverity.HIGH ? 'error' : 'warn';
    logger[logMethod](
      'SOCKET_ERROR',
      error.message,
      error.toLogObject()
    );

    // Capture high/critical severity errors to Sentry in production
    if (
      process.env.NODE_ENV === 'production' &&
      (error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL)
    ) {
      Sentry.withScope((scope) => {
        scope.setTag('error.type', 'socket_app_error');
        scope.setTag('app.error_code', error.code);
        scope.setTag('app.error_severity', error.severity);
        scope.setContext('app_error', {
          code: error.code,
          severity: error.severity,
          httpStatus: error.httpStatus,
          details: error.details,
          correlationId: error.correlationId,
        });
        scope.setContext('socket', {
          socketId: socket.id,
        });
        Sentry.captureException(error);
      });
    }
  } else {
    // Wrap unknown errors
    const appError = new AppError(ErrorCodes.INTERNAL_ERROR, {
      details: { originalMessage: error.message }
    });
    socket.emit('error', appError.toClientError());
    logger.error('SOCKET_ERROR', 'Unhandled error', { error: error.message, stack: error.stack });

    // Capture unknown errors to Sentry in production
    if (process.env.NODE_ENV === 'production') {
      Sentry.withScope((scope) => {
        scope.setTag('error.type', 'socket_unhandled_error');
        scope.setContext('socket', {
          socketId: socket.id,
        });
        Sentry.captureException(error);
      });
    }
  }
}

// ==========================================
// Safe Handler Wrappers
// ==========================================

/**
 * Generate a correlation ID for request tracing
 */
export function generateCorrelationId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Wrap an async socket event handler with error handling
 */
export function wrapSocketHandler(handler: SocketHandler, eventName: string): (io: Server, socket: Socket, data: unknown) => Promise<void> {
  return async function wrappedHandler(io: Server, socket: Socket, data: unknown): Promise<void> {
    const correlationId = generateCorrelationId();

    try {
      await handler(io, socket, data, correlationId);
    } catch (error) {
      logger.error('HANDLER_ERROR', `Error in ${eventName} handler`, {
        correlationId,
        socketId: socket.id,
        error: (error as Error).message,
        stack: (error as Error).stack
      });

      // Capture error to Sentry in production
      if (process.env.NODE_ENV === 'production') {
        Sentry.withScope((scope) => {
          scope.setTag('error.type', 'socket_handler_error');
          scope.setTag('socket.event', eventName);
          scope.setContext('socket_handler', {
            event: eventName,
            socketId: socket.id,
            correlationId,
          });
          Sentry.captureException(error as Error);
        });
      }

      if (error instanceof AppError) {
        error.correlationId = correlationId;
        emitAppError(socket, error);
      } else {
        emitError(socket, ErrorCodes.INTERNAL_ERROR, { correlationId });
      }
    }
  };
}

interface RequestWithCorrelation extends Request {
  correlationId?: string;
}

/**
 * Wrap an Express route handler with error handling
 */
export function wrapRouteHandler(handler: RouteHandler): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async function wrappedHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    const correlationId = (req.headers['x-correlation-id'] as string) || generateCorrelationId();
    (req as RequestWithCorrelation).correlationId = correlationId;

    try {
      await handler(req, res, next);
    } catch (error) {
      logger.error('ROUTE_ERROR', `Error in ${req.method} ${req.path}`, {
        correlationId,
        error: (error as Error).message,
        stack: (error as Error).stack
      });

      // Capture error to Sentry in production
      if (process.env.NODE_ENV === 'production') {
        Sentry.withScope((scope) => {
          scope.setTag('error.type', 'route_error');
          scope.setTag('http.method', req.method);
          scope.setTag('http.path', req.path);
          scope.setContext('http_request', {
            method: req.method,
            path: req.path,
            correlationId,
            url: req.url,
          });
          Sentry.captureException(error as Error);
        });
      }

      if (error instanceof AppError) {
        error.correlationId = correlationId;
        res.status(error.httpStatus).json(error.toClientError());
      } else {
        res.status(500).json({
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'An unexpected error occurred',
          correlationId
        });
      }
    }
  };
}

// ==========================================
// Utility Functions
// ==========================================

/**
 * Create an AppError from a known error code
 */
export function createError(code: string, options: AppErrorOptions = {}): AppError {
  return new AppError(code, options);
}

/**
 * Check if an error is a known AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

