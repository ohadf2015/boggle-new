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

import crypto from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
import * as Sentry from '@sentry/nextjs';
import type { Request, Response, NextFunction } from 'express';
import type { Socket } from 'socket.io';

// ==========================================
// Type Definitions
// ==========================================

interface LogContext {
  correlationId?: string;
  gameCode?: string;
  socketId?: string;
  method?: string;
  path?: string;
  ip?: string;
  eventName?: string;
}

interface LogEntry {
  timestamp: string;
  level: string;
  service: string;
  instance: string;
  category: string;
  message: string;
  correlationId?: string;
  gameCode?: string;
  socketId?: string;
  data?: unknown;
}

interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  code?: string | number;
}

interface TimerResult {
  end: (data?: Record<string, unknown>) => void;
}

// ==========================================
// Constants
// ==========================================

const LOG_LEVELS: Record<string, number> = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const LEVEL_NAMES: string[] = ['ERROR', 'WARN', 'INFO', 'DEBUG'];

// Async context storage for correlation IDs
const asyncContext = new AsyncLocalStorage<LogContext>();

// ==========================================
// Logger Class
// ==========================================

class Logger {
  level: number;
  enableTimestamp: boolean;
  enableColors: boolean;
  jsonMode: boolean;
  serviceName: string;
  instanceId: string;
  correlationId?: string;
  gameCode?: string;
  socketId?: string;

  constructor() {
    this.level = process.env.LOG_LEVEL
      ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] ?? LOG_LEVELS.INFO
      : LOG_LEVELS.INFO;
    this.enableTimestamp = process.env.LOG_TIMESTAMP !== 'false';
    this.enableColors = process.env.LOG_COLORS !== 'false' && (process.stdout.isTTY ?? false);
    this.jsonMode = process.env.LOG_FORMAT === 'json';
    this.serviceName = process.env.SERVICE_NAME || 'boggle-server';
    this.instanceId = process.env.RAILWAY_REPLICA_ID || process.env.HOSTNAME || 'local';
  }

  /**
   * Generate a correlation ID for request tracing
   */
  static generateCorrelationId(): string {
    return `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Create a child logger with a specific correlation ID
   */
  withCorrelationId(correlationId: string): Logger {
    const childLogger = Object.create(this) as Logger;
    childLogger.correlationId = correlationId;
    return childLogger;
  }

  /**
   * Create a child logger for a specific game
   */
  forGame(gameCode: string): Logger {
    const childLogger = Object.create(this) as Logger;
    childLogger.gameCode = gameCode;
    return childLogger;
  }

  /**
   * Create a child logger for a specific socket
   */
  forSocket(socketId: string): Logger {
    const childLogger = Object.create(this) as Logger;
    childLogger.socketId = socketId;
    return childLogger;
  }

  getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Serialize data for logging
   */
  serializeData(data: unknown): unknown {
    if (data === undefined || data === null) return undefined;

    // Handle Error objects specially
    if (data instanceof Error) {
      return {
        name: data.name,
        message: data.message,
        stack: data.stack?.split('\n').slice(0, 5).join('\n'),
        code: (data as NodeJS.ErrnoException).code,
      } as SerializedError;
    }

    // Handle objects that might contain Error instances
    if (typeof data === 'object') {
      try {
        // Create a sanitized copy
        return JSON.parse(JSON.stringify(data, (_key: string, value: unknown) => {
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
        return { error: 'Serialization failed', reason: (e as Error).message };
      }
    }

    return data;
  }

  /**
   * Get merged context from instance properties and async storage
   */
  getMergedContext(): LogContext {
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
  formatJson(level: number, category: string, message: string, data?: unknown): string {
    const context = this.getMergedContext();

    const logEntry: LogEntry = {
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
  formatConsole(level: number, category: string, message: string, data?: unknown): string {
    const timestamp = this.enableTimestamp ? `[${this.getTimestamp()}] ` : '';
    const categoryStr = category ? `[${category}] ` : '';
    const context = this.getMergedContext();

    // Build context string
    const contextParts: string[] = [];
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
      const colors: Record<number, string> = {
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
  log(level: number, category: string, message: string, data?: unknown): void {
    if (this.level < level) return;

    const formatted = this.jsonMode
      ? this.formatJson(level, category, message, data)
      : this.formatConsole(level, category, message, data);

    switch (level) {
      case LOG_LEVELS.ERROR:
        console.error(formatted);
        // Capture errors to Sentry in production
        if (process.env.NODE_ENV === 'production') {
          this.captureToSentry('error', category, message, data);
        }
        break;
      case LOG_LEVELS.WARN:
        console.warn(formatted);
        // Capture warnings to Sentry in production
        if (process.env.NODE_ENV === 'production') {
          this.captureToSentry('warning', category, message, data);
        }
        break;
      default:
        console.log(formatted);
    }
  }

  /**
   * Capture log entry to Sentry (production only)
   */
  private captureToSentry(
    level: 'error' | 'warning',
    category: string,
    message: string,
    data?: unknown
  ): void {
    const context = this.getMergedContext();

    Sentry.withScope((scope) => {
      // Set log metadata
      scope.setLevel(level);
      scope.setTag('log.category', category);

      // Add context tags
      if (context.correlationId) {
        scope.setTag('log.correlation_id', context.correlationId);
      }
      if (context.gameCode) {
        scope.setTag('log.game_code', context.gameCode);
      }
      if (context.socketId) {
        scope.setTag('log.socket_id', context.socketId);
      }

      // Add structured context
      scope.setContext('logger', {
        category,
        correlationId: context.correlationId,
        gameCode: context.gameCode,
        socketId: context.socketId,
        method: context.method,
        path: context.path,
      });

      // Add additional data
      if (data !== undefined) {
        const serialized = this.serializeData(data);
        scope.setContext('log_data', { data: serialized });

        // If data contains an error object, capture it as an exception
        if (data instanceof Error) {
          Sentry.captureException(data);
          return;
        }
      }

      // Capture as message
      const fullMessage = `[${category}] ${message}`;
      Sentry.captureMessage(fullMessage, level);
    });
  }

  // Convenience methods
  error(category: string, message: string, data?: unknown): void {
    this.log(LOG_LEVELS.ERROR, category, message, data);
  }

  warn(category: string, message: string, data?: unknown): void {
    this.log(LOG_LEVELS.WARN, category, message, data);
  }

  info(category: string, message: string, data?: unknown): void {
    this.log(LOG_LEVELS.INFO, category, message, data);
  }

  debug(category: string, message: string, data?: unknown): void {
    this.log(LOG_LEVELS.DEBUG, category, message, data);
  }

  /**
   * Log a socket event (convenience method)
   */
  socketEvent(eventName: string, socketId: string, data?: Record<string, unknown>): void {
    this.info('SOCKET', `Event: ${eventName}`, { socketId: socketId?.substring(0, 8), ...data });
  }

  /**
   * Log game action (convenience method)
   */
  gameAction(gameCode: string, action: string, data?: Record<string, unknown>): void {
    this.info('GAME', `${action} in game ${gameCode}`, data);
  }

  /**
   * Log performance timing
   */
  timing(category: string, operation: string, durationMs: number, data?: Record<string, unknown>): void {
    this.info(category, `${operation} completed`, { durationMs, ...data });
  }

  /**
   * Create a timer for measuring operation duration
   */
  startTimer(category: string, operation: string): TimerResult {
    const start = process.hrtime.bigint();
    return {
      end: (data?: Record<string, unknown>) => {
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
 */
function runWithContext<T>(context: LogContext, fn: () => T): T {
  return asyncContext.run(context, fn);
}

/**
 * Get the current async context
 */
function getContext(): LogContext | undefined {
  return asyncContext.getStore();
}

/**
 * Set a value in the current context (if exists)
 */
function setContextValue<K extends keyof LogContext>(key: K, value: LogContext[K]): void {
  const store = asyncContext.getStore();
  if (store) {
    store[key] = value;
  }
}

// ==========================================
// Express Middleware
// ==========================================

interface RequestWithCorrelation extends Request {
  correlationId?: string;
}

/**
 * Express middleware to set up logging context
 * Adds correlation ID and request info to all logs within the request
 */
function requestLoggerMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    const correlationId = (req.headers['x-correlation-id'] as string) || Logger.generateCorrelationId();
    const context: LogContext = {
      correlationId,
      method: req.method,
      path: req.path,
      ip: req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown'
    };

    // Add correlation ID to response headers
    res.setHeader('X-Correlation-ID', correlationId);

    // Store on request object for other middleware
    (req as RequestWithCorrelation).correlationId = correlationId;

    // Run the rest of the request handling within the async context
    runWithContext(context, () => {
      // Log request start
      logger.info('HTTP', `${req.method} ${req.path}`, {
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
        userAgent: (req.headers['user-agent'] as string)?.substring(0, 100)
      });

      // Track response time
      const startTime = process.hrtime.bigint();

      // Log response when finished
      res.on('finish', () => {
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1000000;

        const logLevel: 'error' | 'warn' | 'info' = res.statusCode >= 500 ? 'error' :
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
 */
function wrapSocketEventHandler<T extends unknown[], R>(
  socket: Socket,
  eventName: string,
  handler: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const correlationId = Logger.generateCorrelationId();
    const context: LogContext = {
      correlationId,
      socketId: socket.id,
      eventName,
      ip: socket.handshake?.headers?.['x-forwarded-for'] as string || socket.handshake?.address
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
          error: (error as Error).message,
          stack: (error as Error).stack?.split('\n').slice(0, 3).join('\n')
        });
        throw error;
      }
    });
  };
}

// Create singleton logger instance
const logger = new Logger();

// Export everything
export default logger;
export {
  Logger,
  LOG_LEVELS,
  runWithContext,
  getContext,
  setContextValue,
  requestLoggerMiddleware,
  wrapSocketEventHandler,
  asyncContext,
};
export type { LogContext, LogEntry, TimerResult };

// CommonJS compatibility for mixed codebase
module.exports = logger;
module.exports.default = logger;
module.exports.Logger = Logger;
module.exports.LOG_LEVELS = LOG_LEVELS;
module.exports.runWithContext = runWithContext;
module.exports.getContext = getContext;
module.exports.setContextValue = setContextValue;
module.exports.requestLoggerMiddleware = requestLoggerMiddleware;
module.exports.wrapSocketEventHandler = wrapSocketEventHandler;
module.exports.asyncContext = asyncContext;
