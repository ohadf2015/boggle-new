/**
 * Structured Logging with Pino
 * Provides child loggers for different server modules
 */

import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  ...(isProduction ? {} : { transport: { target: 'pino-pretty', options: { colorize: true } } }),
});

// Child loggers for different modules
export const socketLogger = logger.child({ module: 'socket' });
export const lifecycleLogger = logger.child({ module: 'lifecycle' });
export const httpLogger = logger.child({ module: 'http' });
export const redisLogger = logger.child({ module: 'redis' });
export const cronLogger = logger.child({ module: 'cron' });
