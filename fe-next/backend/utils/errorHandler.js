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

const logger = require('./logger');

// ==========================================
// Error Codes Registry
// ==========================================

/**
 * Error codes grouped by domain
 * Format: DOMAIN_ERROR_TYPE
 */
const ErrorCodes = {
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

  // Tournament errors (7xxx)
  TOURNAMENT_NOT_FOUND: 'TOURNAMENT_NOT_FOUND',
  TOURNAMENT_ALREADY_STARTED: 'TOURNAMENT_ALREADY_STARTED',
  TOURNAMENT_INVALID_STATE: 'TOURNAMENT_INVALID_STATE',

  // System errors (9xxx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  REDIS_ERROR: 'REDIS_ERROR',
};

/**
 * Error severity levels for monitoring and alerting
 */
const ErrorSeverity = {
  LOW: 'low',         // User errors, validation failures
  MEDIUM: 'medium',   // Operational issues, rate limiting
  HIGH: 'high',       // System errors, database failures
  CRITICAL: 'critical' // Security issues, data corruption
};

/**
 * Error code to message mapping with severity
 */
const ErrorRegistry = {
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
};

// ==========================================
// Application Error Class
// ==========================================

/**
 * Custom application error with code and metadata
 */
class AppError extends Error {
  constructor(code, options = {}) {
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
  toClientError() {
    return {
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
      ...(this.correlationId && { correlationId: this.correlationId })
    };
  }

  /**
   * Convert to loggable object (includes all data)
   */
  toLogObject() {
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

/**
 * Emit a standardized error to a socket
 * @param {Socket} socket - The socket to emit the error to
 * @param {string} codeOrMessage - Error code from ErrorCodes or a custom message
 * @param {Object} options - Additional options
 * @param {string} options.message - Override message
 * @param {Object} options.details - Additional details
 * @param {string} options.correlationId - Correlation ID for tracing
 */
function emitError(socket, codeOrMessage, options = {}) {
  let errorPayload;

  // Check if it's a known error code
  if (ErrorRegistry[codeOrMessage]) {
    const registry = ErrorRegistry[codeOrMessage];
    errorPayload = {
      code: codeOrMessage,
      message: options.message || registry.message,
      ...(options.details && { details: options.details }),
      ...(options.correlationId && { correlationId: options.correlationId })
    };

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
    logger.debug('SOCKET_ERROR', `[LEGACY] ${codeOrMessage}`, { socketId: socket.id });
  }

  socket.emit('error', errorPayload);
}

/**
 * Emit an AppError to a socket
 * @param {Socket} socket - The socket to emit to
 * @param {AppError} error - The application error
 */
function emitAppError(socket, error) {
  if (error instanceof AppError) {
    socket.emit('error', error.toClientError());
    logger.log(
      error.severity === ErrorSeverity.HIGH ? 'error' : 'warn',
      'SOCKET_ERROR',
      error.message,
      error.toLogObject()
    );
  } else {
    // Wrap unknown errors
    const appError = new AppError(ErrorCodes.INTERNAL_ERROR, {
      details: { originalMessage: error.message }
    });
    socket.emit('error', appError.toClientError());
    logger.error('SOCKET_ERROR', 'Unhandled error', { error: error.message, stack: error.stack });
  }
}

// ==========================================
// Safe Handler Wrappers
// ==========================================

/**
 * Wrap an async socket event handler with error handling
 * @param {Function} handler - Async handler function
 * @param {string} eventName - Event name for logging
 * @returns {Function} - Wrapped handler
 */
function wrapSocketHandler(handler, eventName) {
  return async function wrappedHandler(io, socket, data) {
    const correlationId = generateCorrelationId();

    try {
      await handler(io, socket, data, correlationId);
    } catch (error) {
      logger.error('HANDLER_ERROR', `Error in ${eventName} handler`, {
        correlationId,
        socketId: socket.id,
        error: error.message,
        stack: error.stack
      });

      if (error instanceof AppError) {
        error.correlationId = correlationId;
        emitAppError(socket, error);
      } else {
        emitError(socket, ErrorCodes.INTERNAL_ERROR, { correlationId });
      }
    }
  };
}

/**
 * Wrap an Express route handler with error handling
 * @param {Function} handler - Async handler function
 * @returns {Function} - Wrapped handler
 */
function wrapRouteHandler(handler) {
  return async function wrappedHandler(req, res, next) {
    const correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
    req.correlationId = correlationId;

    try {
      await handler(req, res, next);
    } catch (error) {
      logger.error('ROUTE_ERROR', `Error in ${req.method} ${req.path}`, {
        correlationId,
        error: error.message,
        stack: error.stack
      });

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
 * Generate a correlation ID for request tracing
 * @returns {string} - Correlation ID
 */
function generateCorrelationId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create an AppError from a known error code
 * @param {string} code - Error code
 * @param {Object} options - Additional options
 * @returns {AppError}
 */
function createError(code, options = {}) {
  return new AppError(code, options);
}

/**
 * Check if an error is a known AppError
 * @param {Error} error - Error to check
 * @returns {boolean}
 */
function isAppError(error) {
  return error instanceof AppError;
}

// ==========================================
// Legacy Support (ErrorMessages)
// ==========================================

/**
 * Legacy error messages for backwards compatibility
 * @deprecated Use ErrorCodes instead
 */
const ErrorMessages = {
  INVALID_GAME_CODE: ErrorRegistry[ErrorCodes.GAME_INVALID_CODE].message,
  GAME_NOT_FOUND: ErrorRegistry[ErrorCodes.GAME_NOT_FOUND].message,
  NOT_IN_GAME: ErrorRegistry[ErrorCodes.PLAYER_NOT_IN_GAME].message,
  USERNAME_REQUIRED: 'Game code and username are required',
  ROOM_FULL: (max) => `Room is full (maximum ${max} players)`,
  ONLY_HOST_CAN_START: ErrorRegistry[ErrorCodes.PLAYER_NOT_HOST].message,
  ONLY_HOST_CAN_END: ErrorRegistry[ErrorCodes.PLAYER_NOT_HOST].message,
  RATE_LIMIT_EXCEEDED: ErrorRegistry[ErrorCodes.RATE_LIMIT_EXCEEDED].message,
  INVALID_WORD_SUBMISSION: 'Invalid word submission - missing required fields',
  INVALID_MESSAGE: 'Invalid message',
  GAME_NOT_IN_PROGRESS: ErrorRegistry[ErrorCodes.GAME_NOT_IN_PROGRESS].message
};

// ==========================================
// Exports
// ==========================================

module.exports = {
  // Error class
  AppError,

  // Error codes and registry
  ErrorCodes,
  ErrorSeverity,
  ErrorRegistry,

  // Emission functions
  emitError,
  emitAppError,

  // Handler wrappers
  wrapSocketHandler,
  wrapRouteHandler,

  // Utilities
  generateCorrelationId,
  createError,
  isAppError,

  // Legacy support
  ErrorMessages
};
