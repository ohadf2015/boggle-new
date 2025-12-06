/**
 * Express Middleware Configuration
 * Security headers, CORS, and common middleware setup
 */

const cors = require('cors');
const express = require('express');
const { geolocationMiddleware } = require('../backend/utils/geolocation');

/**
 * Configure CORS options based on environment
 * @param {string} corsOrigin - CORS_ORIGIN environment variable
 * @param {boolean} isDev - Whether running in development mode
 * @returns {Object} CORS configuration
 */
function createCorsOptions(corsOrigin, isDev) {
  return {
    origin: (() => {
      if (corsOrigin === '*') {
        if (!isDev) {
          console.error('FATAL: CORS_ORIGIN=* is not allowed in production. Set explicit origins.');
          return false;
        }
        return true;
      }
      return corsOrigin.split(',');
    })(),
    credentials: true
  };
}

/**
 * Security headers middleware
 * @param {boolean} isDev - Whether running in development mode
 * @returns {Function} Express middleware
 */
function securityHeaders(isDev) {
  const cspDev = "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' ws: wss:; " +
    "frame-ancestors 'none';";

  const cspProd = "default-src 'self'; " +
    "script-src 'self'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' ws: wss:; " +
    "frame-ancestors 'none';";

  return (req, res, next) => {
    res.setHeader('Content-Security-Policy', isDev ? cspDev : cspProd);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    if (!isDev) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
  };
}

/**
 * Configure all middleware on Express app
 * @param {Express} app - Express application instance
 * @param {Object} options - Configuration options
 * @param {string} options.corsOrigin - CORS origin setting
 * @param {boolean} options.isDev - Development mode flag
 */
function configureMiddleware(app, { corsOrigin, isDev }) {
  // Disable x-powered-by header
  app.disable('x-powered-by');

  // CORS
  app.use(cors(createCorsOptions(corsOrigin, isDev)));

  // JSON body parsing
  app.use(express.json());

  // Security headers
  app.use(securityHeaders(isDev));

  // IP Geolocation
  app.use(geolocationMiddleware({
    skipPaths: ['/health', '/metrics', '/_next', '/favicon.ico'],
    pathFilter: ['/', '/api/geolocation']
  }));
}

module.exports = {
  configureMiddleware,
  createCorsOptions,
  securityHeaders,
};
