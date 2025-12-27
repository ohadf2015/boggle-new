/**
 * Correlation ID Utility
 *
 * Provides request correlation for distributed tracing and debugging.
 * Each request gets a unique ID that follows it through the system.
 *
 * Usage:
 *   // In socket handler
 *   socket.on('submitWord', withCorrelation(socket, async (data, correlationId) => {
 *     logger.info('WORD', `[${correlationId}] Processing word`);
 *   }));
 *
 *   // Or manually
 *   const correlationId = generateCorrelationId();
 *   socket.data.correlationId = correlationId;
 */

import crypto from 'crypto';
import type { Socket } from 'socket.io';
import logger from './logger';

// ==========================================
// Type Definitions
// ==========================================

interface SocketWithData extends Socket {
  data: {
    correlationId?: string;
    [key: string]: unknown;
  };
}

interface CorrelatedLogger {
  info: (category: string, message: string, ...args: unknown[]) => void;
  warn: (category: string, message: string, ...args: unknown[]) => void;
  error: (category: string, message: string, ...args: unknown[]) => void;
  debug: (category: string, message: string, ...args: unknown[]) => void;
}

type HandlerWithCorrelation<T> = (data: T, correlationId: string) => Promise<void>;
type SyncHandlerWithCorrelation<T, R> = (data: T, correlationId: string) => R;

// ==========================================
// Correlation ID Generation
// ==========================================

/**
 * Generate a unique correlation ID
 * Format: req_{timestamp}_{randomHex}
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `req_${timestamp}_${random}`;
}

/**
 * Generate a short correlation ID (for logging)
 * Format: {randomHex}
 */
export function generateShortId(): string {
  return crypto.randomBytes(4).toString('hex');
}

// ==========================================
// Socket Handler Wrappers
// ==========================================

/**
 * Wrap a socket handler with correlation ID tracking and error handling
 */
export function withCorrelation<T>(socket: Socket, handler: HandlerWithCorrelation<T>): (data: T) => Promise<void> {
  return async (data: T): Promise<void> => {
    const correlationId = generateCorrelationId();
    const socketWithData = socket as SocketWithData;
    socketWithData.data = socketWithData.data || {};
    socketWithData.data.correlationId = correlationId;

    const startTime = Date.now();

    try {
      await handler(data, correlationId);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('SOCKET', `[${correlationId}] Handler error after ${duration}ms`, error);

      // Emit error to client with correlation ID for support reference
      socket.emit('error', {
        message: 'An error occurred processing your request',
        correlationId,
        // Only include details in development
        ...(process.env.NODE_ENV !== 'production' && { details: (error as Error).message }),
      });
    }
  };
}

/**
 * Wrap a socket handler with correlation ID but without try-catch
 * Use when you want to handle errors yourself
 */
export function withCorrelationId<T, R>(socket: Socket, handler: SyncHandlerWithCorrelation<T, R>): (data: T) => R {
  return (data: T): R => {
    const correlationId = generateCorrelationId();
    const socketWithData = socket as SocketWithData;
    socketWithData.data = socketWithData.data || {};
    socketWithData.data.correlationId = correlationId;
    return handler(data, correlationId);
  };
}

// ==========================================
// Correlation Context
// ==========================================

/**
 * Get correlation ID from socket
 */
export function getCorrelationId(socket: Socket | null | undefined): string | null {
  const socketWithData = socket as SocketWithData | null | undefined;
  return socketWithData?.data?.correlationId || null;
}

/**
 * Set correlation ID on socket
 */
export function setCorrelationId(socket: Socket, correlationId: string): void {
  const socketWithData = socket as SocketWithData;
  socketWithData.data = socketWithData.data || {};
  socketWithData.data.correlationId = correlationId;
}

/**
 * Create a child correlation ID (for sub-operations)
 */
export function createChildCorrelationId(parentId: string): string {
  const childSuffix = crypto.randomBytes(2).toString('hex');
  return `${parentId}:${childSuffix}`;
}

// ==========================================
// Logging Helpers
// ==========================================

/**
 * Create a logger wrapper that includes correlation ID
 */
export function createCorrelatedLogger(correlationId: string): CorrelatedLogger {
  const prefix = `[${correlationId}]`;
  return {
    info: (category: string, message: string, ...args: unknown[]) => logger.info(category, `${prefix} ${message}`, ...args),
    warn: (category: string, message: string, ...args: unknown[]) => logger.warn(category, `${prefix} ${message}`, ...args),
    error: (category: string, message: string, ...args: unknown[]) => logger.error(category, `${prefix} ${message}`, ...args),
    debug: (category: string, message: string, ...args: unknown[]) => logger.debug(category, `${prefix} ${message}`, ...args),
  };
}

export type { CorrelatedLogger, HandlerWithCorrelation, SyncHandlerWithCorrelation };
