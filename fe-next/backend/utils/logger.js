/**
 * Structured Logger for Backend
 * Provides consistent logging with correlation IDs, structured output,
 * and configurable log levels.
 *
 * Features:
 * - Log levels (ERROR, WARN, INFO, DEBUG)
 * - Correlation IDs for request tracing
 * - Async context propagation via AsyncLocalStorage
 * - Structured JSON output (for log aggregators)
 * - Colored console output (development)
 * - Error serialization with stack traces
 * - Request/Response logging middleware
 * - Sampling support for high-volume debug logs
 */

const crypto = require('crypto');
const { AsyncLocalStorage } = require('async_hooks');

// Async context storage for correlation IDs
const asyncContext = new AsyncLocalStorage();

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const LEVEL_NAMES = ['ERROR', 'WARN', 'INFO', 'DEBUG'];

class Logger {
  constructor() {
    this.level = process.env.LOG_LEVEL
      ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()]
      : LOG_LEVELS.INFO;
    this.enableTimestamp = process.env.LOG_TIMESTAMP !== 'false';
    this.enableColors = process.env.LOG_COLORS !== 'false' && process.stdout.isTTY;
    this.jsonMode = process.env.LOG_FORMAT === 'json';
    this.serviceName = process.env.SERVICE_NAME || 'boggle-server';
    this.instanceId = process.env.RAILWAY_REPLICA_ID || process.env.HOSTNAME || 'local';
  }

  /**
   * Generate a correlation ID for request tracing
   */
  static generateCorrelationId() {
    return `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Create a child logger with a specific correlation ID
   */
  withCorrelationId(correlationId) {
    const childLogger = Object.create(this);
    childLogger.correlationId = correlationId;
    return childLogger;
  }

  /**
   * Create a child logger for a specific game
   */
  forGame(gameCode) {
    const childLogger = Object.create(this);
    childLogger.gameCode = gameCode;
    return childLogger;
  }

  /**
   * Create a child logger for a specific socket
   */
  forSocket(socketId) {
    const childLogger = Object.create(this);
    childLogger.socketId = socketId;
    return childLogger;
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Serialize data for logging
   */
  serializeData(data) {
    if (data === undefined || data === null) return undefined;

    // Handle Error objects specially
    if (data instanceof Error) {
      return {
        name: data.name,
        message: data.message,
        stack: data.stack?.split('\n').slice(0, 5).join('\n'),
        code: data.code,
      };
    }

    // Handle objects that might contain Error instances
    if (typeof data === 'object') {
      try {
        // Create a sanitized copy
        return JSON.parse(JSON.stringify(data, (key, value) => {
          if (value instanceof Error) {
            return { name: value.name, message: value.message };
          }
          // Truncate very long strings
          if (typeof value === 'string' && value.length > 1000) {
            return value.substring(0, 1000) + '...[truncated]';
          }
          return value;
        }));
      } catch (e) {
        return { error: 'Serialization failed', reason: e.message };
      }
    }

    return data;
  }

  /**
   * Get merged context from instance properties and async storage
   */
  getMergedContext() {
    const asyncStore = asyncContext.getStore() || {};
    return {
      correlationId: this.correlationId || asyncStore.correlationId,
      gameCode: this.gameCode || asyncStore.gameCode,
      socketId: this.socketId || asyncStore.socketId,
      method: asyncStore.method,
      path: asyncStore.path,
    };
  }

  /**
   * Format message for JSON output (structured logging)
   */
  formatJson(level, category, message, data) {
    const context = this.getMergedContext();

    const logEntry = {
      timestamp: this.getTimestamp(),
      level: LEVEL_NAMES[level],
      service: this.serviceName,
      instance: this.instanceId,
      category,
      message,
    };

    // Add context if available (from instance or async storage)
    if (context.correlationId) logEntry.correlationId = context.correlationId;
    if (context.gameCode) logEntry.gameCode = context.gameCode;
    if (context.socketId) logEntry.socketId = context.socketId;

    // Add additional data
    if (data !== undefined) {
      logEntry.data = this.serializeData(data);
    }

    return JSON.stringify(logEntry);
  }

  /**
   * Format message for console output (human-readable)
   */
  formatConsole(level, category, message, data) {
    const timestamp = this.enableTimestamp ? `[${this.getTimestamp()}] ` : '';
    const categoryStr = category ? `[${category}] ` : '';
    const context = this.getMergedContext();

    // Build context string
    const contextParts = [];
    if (context.gameCode) contextParts.push(`game=${context.gameCode}`);
    if (context.socketId) contextParts.push(`socket=${context.socketId.substring(0, 8)}`);
    if (context.correlationId) contextParts.push(`cid=${context.correlationId.substring(0, 12)}`);
    const contextStr = contextParts.length > 0 ? `(${contextParts.join(' ')}) ` : '';

    // Serialize data
    let dataStr = '';
    if (data !== undefined) {
      const serialized = this.serializeData(data);
      if (serialized !== undefined) {
        dataStr = ` ${JSON.stringify(serialized)}`;
      }
    }

    const fullMessage = `${timestamp}${categoryStr}${contextStr}${message}${dataStr}`;

    if (this.enableColors) {
      const colors = {
        0: '\x1b[31m',   // ERROR: Red
        1: '\x1b[33m',   // WARN: Yellow
        2: '\x1b[36m',   // INFO: Cyan
        3: '\x1b[90m',   // DEBUG: Gray
      };
      const reset = '\x1b[0m';
      const color = colors[level] || reset;
      return `${color}${fullMessage}${reset}`;
    }

    return fullMessage;
  }

  /**
   * Core logging method
   */
  log(level, category, message, data) {
    if (this.level < level) return;

    const formatted = this.jsonMode
      ? this.formatJson(level, category, message, data)
      : this.formatConsole(level, category, message, data);

    switch (level) {
      case LOG_LEVELS.ERROR:
        console.error(formatted);
        break;
      case LOG_LEVELS.WARN:
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  // Convenience methods
  error(category, message, data) {
    this.log(LOG_LEVELS.ERROR, category, message, data);
  }

  warn(category, message, data) {
    this.log(LOG_LEVELS.WARN, category, message, data);
  }

  info(category, message, data) {
    this.log(LOG_LEVELS.INFO, category, message, data);
  }

  debug(category, message, data) {
    this.log(LOG_LEVELS.DEBUG, category, message, data);
  }

  /**
   * Log a socket event (convenience method)
   */
  socketEvent(eventName, socketId, data) {
    this.info('SOCKET', `Event: ${eventName}`, { socketId: socketId?.substring(0, 8), ...data });
  }

  /**
   * Log game action (convenience method)
   */
  gameAction(gameCode, action, data) {
    this.info('GAME', `${action} in game ${gameCode}`, data);
  }

  /**
   * Log performance timing
   */
  timing(category, operation, durationMs, data) {
    this.info(category, `${operation} completed`, { durationMs, ...data });
  }

  /**
   * Create a timer for measuring operation duration
   */
  startTimer(category, operation) {
    const start = process.hrtime.bigint();
    return {
      end: (data) => {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1000000;
        this.timing(category, operation, Math.round(durationMs * 100) / 100, data);
      }
    };
  }
}

// ==========================================
// Async Context Functions
// ==========================================

/**
 * Run a function with a specific context (correlation ID, etc.)
 * All log calls within this context will automatically include the context
 * @param {Object} context - Context to set
 * @param {Function} fn - Function to run
 * @returns {*} - Result of the function
 */
function runWithContext(context, fn) {
  return asyncContext.run(context, fn);
}

/**
 * Get the current async context
 * @returns {Object|undefined}
 */
function getContext() {
  return asyncContext.getStore();
}

/**
 * Set a value in the current context (if exists)
 * @param {string} key - Context key
 * @param {*} value - Value to set
 */
function setContextValue(key, value) {
  const store = asyncContext.getStore();
  if (store) {
    store[key] = value;
  }
}

// ==========================================
// Express Middleware
// ==========================================

/**
 * Express middleware to set up logging context
 * Adds correlation ID and request info to all logs within the request
 */
function requestLoggerMiddleware() {
  return (req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] || Logger.generateCorrelationId();
    const context = {
      correlationId,
      method: req.method,
      path: req.path,
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown'
    };

    // Add correlation ID to response headers
    res.setHeader('X-Correlation-ID', correlationId);

    // Store on request object for other middleware
    req.correlationId = correlationId;

    // Run the rest of the request handling within the async context
    runWithContext(context, () => {
      // Log request start
      logger.info('HTTP', `${req.method} ${req.path}`, {
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
        userAgent: req.headers['user-agent']?.substring(0, 100)
      });

      // Track response time
      const startTime = process.hrtime.bigint();

      // Log response when finished
      res.on('finish', () => {
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1000000;

        const logLevel = res.statusCode >= 500 ? 'error' :
                        res.statusCode >= 400 ? 'warn' : 'info';

        logger[logLevel]('HTTP', `${req.method} ${req.path} ${res.statusCode}`, {
          status: res.statusCode,
          durationMs: Math.round(durationMs * 100) / 100
        });
      });

      next();
    });
  };
}

/**
 * Socket.IO middleware to set up logging context for socket events
 * @param {Socket} socket - Socket.IO socket
 * @param {string} eventName - Event name
 * @param {Function} handler - Event handler
 * @returns {Function} - Wrapped handler
 */
function wrapSocketEventHandler(socket, eventName, handler) {
  return async (...args) => {
    const correlationId = Logger.generateCorrelationId();
    const context = {
      correlationId,
      socketId: socket.id,
      eventName,
      ip: socket.handshake?.headers?.['x-forwarded-for'] || socket.handshake?.address
    };

    return runWithContext(context, async () => {
      logger.debug('SOCKET', `Event received: ${eventName}`, { socketId: socket.id.substring(0, 8) });
      const startTime = process.hrtime.bigint();

      try {
        const result = await handler(...args);
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1000000;

        logger.debug('SOCKET', `Event handled: ${eventName}`, {
          durationMs: Math.round(durationMs * 100) / 100
        });

        return result;
      } catch (error) {
        logger.error('SOCKET', `Error in ${eventName} handler`, {
          error: error.message,
          stack: error.stack?.split('\n').slice(0, 3).join('\n')
        });
        throw error;
      }
    });
  };
}

// Create singleton logger instance
const logger = new Logger();

// Export class for creating child loggers
logger.Logger = Logger;
logger.generateCorrelationId = Logger.generateCorrelationId;
logger.LOG_LEVELS = LOG_LEVELS;

// Export async context functions
logger.runWithContext = runWithContext;
logger.getContext = getContext;
logger.setContextValue = setContextValue;

// Export middleware
logger.requestLoggerMiddleware = requestLoggerMiddleware;
logger.wrapSocketEventHandler = wrapSocketEventHandler;

// Export async context for advanced use
logger.asyncContext = asyncContext;

module.exports = logger;
