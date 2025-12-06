/**
 * Structured Logger for Backend
 * Provides consistent logging with correlation IDs, structured output,
 * and configurable log levels.
 *
 * Features:
 * - Log levels (ERROR, WARN, INFO, DEBUG)
 * - Correlation IDs for request tracing
 * - Structured JSON output (for log aggregators)
 * - Colored console output (development)
 * - Error serialization with stack traces
 */

const crypto = require('crypto');

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
   * Format message for JSON output (structured logging)
   */
  formatJson(level, category, message, data) {
    const logEntry = {
      timestamp: this.getTimestamp(),
      level: LEVEL_NAMES[level],
      service: this.serviceName,
      instance: this.instanceId,
      category,
      message,
    };

    // Add context if available
    if (this.correlationId) logEntry.correlationId = this.correlationId;
    if (this.gameCode) logEntry.gameCode = this.gameCode;
    if (this.socketId) logEntry.socketId = this.socketId;

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

    // Build context string
    const contextParts = [];
    if (this.gameCode) contextParts.push(`game=${this.gameCode}`);
    if (this.socketId) contextParts.push(`socket=${this.socketId.substring(0, 8)}`);
    if (this.correlationId) contextParts.push(`cid=${this.correlationId}`);
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

// Create singleton logger instance
const logger = new Logger();

// Export class for creating child loggers
logger.Logger = Logger;
logger.generateCorrelationId = Logger.generateCorrelationId;
logger.LOG_LEVELS = LOG_LEVELS;

module.exports = logger;
