/**
 * Express Error Middleware
 * Global error handler that captures all Express errors to Sentry
 */

import type { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/nextjs';
import { AppError } from '../backend/utils/errorHandler';
import { httpLogger } from './logger';

/**
 * http-errors style client errors (body-parser malformed JSON → 400
 * entity.parse.failed, payload too large → 413, unsupported charset → 415)
 * carry a numeric 4xx `status` with `expose: true`. They are the caller's
 * fault, so answer with that status instead of a 500 and keep them out of
 * Sentry. Returns the status, or null when the error is not a client error.
 */
export function clientErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object' || error instanceof AppError) return null;
  const e = error as { status?: unknown; statusCode?: unknown; expose?: unknown };
  const status = typeof e.status === 'number' ? e.status : typeof e.statusCode === 'number' ? e.statusCode : null;
  if (status === null || status < 400 || status > 499 || e.expose === false) return null;
  return status;
}

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
  const clientStatus = clientErrorStatus(error);
  if (clientStatus !== null) {
    httpLogger.warn(
      { url: req.url, method: req.method, status: clientStatus, type: (error as { type?: unknown }).type },
      `Express client error ${clientStatus} ${req.method} ${req.url}`
    );
    if (res.headersSent) {
      return _next(error);
    }
    const isParse = (error as { type?: unknown }).type === 'entity.parse.failed';
    res.status(clientStatus).json({
      code: isParse ? 'INVALID_JSON' : 'BAD_REQUEST',
      message: isParse ? 'Invalid JSON body' : 'Bad request',
    });
    return;
  }

  // Route goes in the message string, not just the structured payload:
  // Railway's deploymentLogs filter matches on the message field only, so an
  // unattributed 'Express error' line cannot be traced to a surface from the
  // deploy console (78 such lines in the 2026-09-07→14 window, t_dc4e8fe6).
  httpLogger.error(
    { err: error, url: req.url, method: req.method },
    `Express error ${req.method} ${req.url}`
  );

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
