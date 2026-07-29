/**
 * Structured Logger for Backend
 * Thin wrapper around Pino that preserves the existing call-site API:
 *   logger.info('CATEGORY', 'message', optionalData)
 *   logger.forGame('ABC').info(...)
 *   logger.forSocket('xyz').info(...)
 *
 * Replaces the 550-line hand-rolled logger with ~80 lines of Pino.
 */

import pino from 'pino';
import * as Sentry from '@sentry/nextjs';

const isProduction = process.env.NODE_ENV === 'production';

const pinoInstance = pino({
  level: process.env.LOG_LEVEL?.toLowerCase() || (isProduction ? 'info' : 'debug'),
  ...(isProduction
    ? {}
    : { transport: { target: 'pino-pretty', options: { colorize: true } } }),
});

// ==========================================
// Logger class — preserves existing API
// ==========================================

class Logger {
  private pino: pino.Logger;

  constructor(p?: pino.Logger) {
    this.pino = p || pinoInstance;
  }

  /** Create child logger bound to a game code */
  forGame(gameCode: string): Logger {
    return new Logger(this.pino.child({ gameCode }));
  }

  /** Create child logger bound to a socket ID */
  forSocket(socketId: string): Logger {
    return new Logger(this.pino.child({ socketId: socketId?.substring(0, 8) }));
  }

  /** Create child logger with a correlation ID */
  withCorrelationId(correlationId: string): Logger {
    return new Logger(this.pino.child({ correlationId }));
  }

  // Core logging methods — (category, message, data?)
  error(category: string, message: string, data?: unknown): void {
    this.pino.error({ category, ...(data != null ? { data } : {}) }, message);
    if (isProduction) this.captureToSentry('error', category, message, data);
  }

  warn(category: string, message: string, data?: unknown): void {
    this.pino.warn({ category, ...(data != null ? { data } : {}) }, message);
    if (isProduction) this.captureToSentry('warning', category, message, data);
  }

  info(category: string, message: string, data?: unknown): void {
    this.pino.info({ category, ...(data != null ? { data } : {}) }, message);
  }

  debug(category: string, message: string, data?: unknown): void {
    this.pino.debug({ category, ...(data != null ? { data } : {}) }, message);
  }

  /** Log a socket event */
  socketEvent(eventName: string, socketId: string, data?: Record<string, unknown>): void {
    this.pino.info({ category: 'SOCKET', eventName, socketId: socketId?.substring(0, 8), ...data }, `Event: ${eventName}`);
  }

  /** Log a game action */
  gameAction(gameCode: string, action: string, data?: Record<string, unknown>): void {
    this.pino.info({ category: 'GAME', gameCode, ...data }, `${action} in game ${gameCode}`);
  }

  /** Log performance timing */
  timing(category: string, operation: string, durationMs: number, data?: Record<string, unknown>): void {
    this.pino.info({ category, durationMs, ...data }, `${operation} completed`);
  }

  /** Start a timer that logs duration on .end() */
  startTimer(category: string, operation: string): { end: (data?: Record<string, unknown>) => void } {
    const start = process.hrtime.bigint();
    return {
      end: (data?: Record<string, unknown>) => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
        this.timing(category, operation, Math.round(durationMs * 100) / 100, data);
      },
    };
  }

  private captureToSentry(level: 'error' | 'warning', category: string, message: string, data?: unknown): void {
    Sentry.withScope((scope) => {
      scope.setLevel(level);
      scope.setTag('log.category', category);
      // Attach structured context so Sentry links to the right code
      scope.setContext('logger', {
        category,
        message,
        ...(data != null && !(data instanceof Error) ? { data: typeof data === 'object' ? JSON.stringify(data).slice(0, 2048) : String(data) } : {}),
      });
      if (data instanceof Error) {
        // Preserve the category/message as fingerprint context so errors
        // with the same category+message group together in Sentry
        scope.setFingerprint([category, data.message || message]);
        scope.setTransactionName(`${category}: ${message}`);
        Sentry.captureException(data);
      } else {
        Sentry.captureMessage(`[${category}] ${message}`, level);
      }
    });
  }
}

// Singleton
const logger = new Logger();

export default logger;
export { Logger };

// CommonJS compatibility for mixed codebase
try {
  module.exports = logger;
  module.exports.default = logger;
  module.exports.Logger = Logger;
} catch {
  // ESM environment (e.g., Vitest) — skip CJS exports
}
