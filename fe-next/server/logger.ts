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

/**
 * Slim pino-http serializers.
 *
 * pino-http's defaults dump the entire `headers` object (cookies, auth,
 * user-agent, sentry baggage) on EVERY request — measured at ~3.7 KB per line
 * in production. That is allocation + stdout churn per request, and it puts
 * session cookies in the log stream. Keep tracing fields only.
 */
export const httpLogSerializers = {
  req: (req: { id?: unknown; method?: string; url?: string }) => ({
    id: req.id,
    method: req.method,
    url: req.url,
  }),
  res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
};

// Child loggers for different modules
export const socketLogger = logger.child({ module: 'socket' });
export const lifecycleLogger = logger.child({ module: 'lifecycle' });
export const httpLogger = logger.child({ module: 'http' });
export const redisLogger = logger.child({ module: 'redis' });
export const cronLogger = logger.child({ module: 'cron' });
