/**
 * Express Error Middleware
 * Global error handler that captures all Express errors to Sentry
 */

import type { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/nextjs';
import { AppError } from '../backend/utils/errorHandler';
import { httpLogger } from './logger';

/**
 * Express error handler middleware
 * Captures errors to Sentry and sends appropriate response to client
 */
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  httpLogger.error({ err: error, url: req.url, method: req.method }, 'Express error');

  // Capture to Sentry (only in production)
  if (process.env.NODE_ENV === 'production') {
    Sentry.withScope((scope) => {
      // Add request context
      scope.setContext('request', {
        url: req.url,
        method: req.method,
        headers: req.headers,
        query: req.query,
        body: req.body,
      });

      // Add error type tag
      scope.setTag('error.type', 'express_error');
      scope.setTag('http.method', req.method);
      scope.setTag('http.url', req.url);

      // If it's an AppError, add custom context
      if (error instanceof AppError) {
        scope.setTag('app.error_code', error.code);
        scope.setTag('app.error_severity', error.severity);
        scope.setContext('app_error', {
          code: error.code,
          severity: error.severity,
          httpStatus: error.httpStatus,
          details: error.details,
          correlationId: error.correlationId,
        });
      }

      Sentry.captureException(error);
    });
  }

  // If response already sent, delegate to Express default handler (closes connection)
  if (res.headersSent) {
    return _next(error);
  }

  // Send response to client
  if (error instanceof AppError) {
    // AppError has structured error info
    res.status(error.httpStatus).json(error.toClientError());
  } else {
    // Generic error
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
  }
}

/**
 * Not Found (404) handler
 * Must be added after all other routes
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Don't log 404s to Sentry (too noisy)
  // Just return 404 response
  res.status(404).json({
    code: 'NOT_FOUND',
    message: 'Route not found',
    path: req.url,
  });
}
